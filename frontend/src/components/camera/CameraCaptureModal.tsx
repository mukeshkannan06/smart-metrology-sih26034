import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageConfirmed: (payload: {
    imageData: string;
    mimeType: string;
    fileName: string;
  }) => Promise<void>;
  sampleCode: string;
  sampleNumber: number;
  existingCount: number;
  maxAllowed?: number;
}

type TabMode = 'camera' | 'upload';

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onImageConfirmed,
  sampleCode,
  sampleNumber,
  existingCount,
  maxAllowed = 5,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('camera');

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Captured / preview state
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/jpeg');
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewSizeBytes, setPreviewSizeBytes] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // File drag & drop
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Stops all tracks on the active camera stream to release hardware.
   */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Requests media devices permission and initializes live video stream.
   */
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraLoading(true);
    setCameraError(null);

    // Verify browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera access is not supported by your browser or in an insecure context (HTTPS required on remote hosts). Please use file selection.'
      );
      setCameraLoading(false);
      return;
    }

    try {
      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Enumerate error is non-fatal
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was denied by your browser. Please permit camera permissions or switch to the file upload tab.'
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware was detected on this device. Please use file upload.');
      } else {
        setCameraError(`Unable to start camera stream: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode, stopCameraStream]);

  // Lifecycle when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(null);
      setSubmissionError(null);
      if (activeTab === 'camera') {
        startCameraStream();
      }
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, startCameraStream, stopCameraStream]);

  // Handle keyboard escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  /**
   * Captures the current video frame to canvas and generates preview data URL.
   */
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const mimeType = 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, 0.88);
    const approxBytes = Math.round((dataUrl.length * 3) / 4);

    setPreviewDataUrl(dataUrl);
    setPreviewMimeType(mimeType);
    setPreviewFileName(`capture_${sampleCode}_${Date.now()}.jpg`);
    setPreviewSizeBytes(approxBytes);
    stopCameraStream();
  };

  /**
   * Validates and reads selected image file.
   */
  const processImageFile = (file: File) => {
    setSubmissionError(null);

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.type.toLowerCase())) {
      setSubmissionError(
        `Invalid file type '${file.type || 'unknown'}'. Please select a JPEG, PNG, or WEBP image.`
      );
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSubmissionError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5.00 MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewDataUrl(dataUrl);
      setPreviewMimeType(file.type.toLowerCase() || 'image/jpeg');
      setPreviewFileName(file.name || `upload_${sampleCode}_${Date.now()}.jpg`);
      setPreviewSizeBytes(file.size);
      stopCameraStream();
    };
    reader.onerror = () => {
      setSubmissionError('Failed to read image file from your device.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRetake = () => {
    setPreviewDataUrl(null);
    setSubmissionError(null);
    if (activeTab === 'camera') {
      startCameraStream();
    }
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleConfirm = async () => {
    if (!previewDataUrl) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      await onImageConfirmed({
        imageData: previewDataUrl,
        mimeType: previewMimeType,
        fileName: previewFileName,
      });
      onClose();
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error ? err.message : 'Failed to attach image to sample.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAtLimit = existingCount >= maxAllowed;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 id="camera-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Capture Package Evidence
              </h2>
              <p className="text-xs text-slate-500">
                Sample Specimen #{sampleNumber} ({sampleCode}) • Image {existingCount + 1} of {maxAllowed}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector (only when not previewing) */}
        {!previewDataUrl && !isAtLimit && (
          <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-2">
            <button
              onClick={() => {
                setActiveTab('camera');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'camera'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Device Camera</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                stopCameraStream();
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Select / Upload File</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Max Limit Warning */}
          {isAtLimit && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Maximum Images Reached</span>
              </div>
              <p>
                This sample unit already contains {existingCount} of {maxAllowed} allowed package images.
                To capture a new photo, remove an existing image from the sample gallery first.
              </p>
            </div>
          )}

          {/* Submission Error Alert */}
          {submissionError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">Validation Error</span>
                <span>{submissionError}</span>
              </div>
            </div>
          )}

          {/* PREVIEW SCREEN (Captured or Uploaded Image) */}
          {previewDataUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-[360px]">
                <img
                  src={previewDataUrl}
                  alt="Captured Package Preview"
                  className="max-h-[360px] w-auto object-contain mx-auto"
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md font-mono border border-slate-700">
                  Preview Ready
                </div>
              </div>

              {/* Evidence Technical Summary */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Format</span>
                  <span className="font-semibold text-slate-800 uppercase">{previewMimeType.replace('image/', '')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Size</span>
                  <span className="font-semibold text-slate-800">
                    {(previewSizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Sample</span>
                  <span className="font-semibold font-mono text-blue-700">{sampleCode}</span>
                </div>
              </div>

              {/* Statutory Notice */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Evidence Collection Only:</strong> Attaching this photo establishes the physical evidence record for specimen #{sampleNumber}. AI OCR extraction and statutory verification occur in subsequent phases.
                </span>
              </div>
            </div>
          ) : !isAtLimit && activeTab === 'camera' ? (
            /* CAMERA STREAM VIEW */
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-6 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Camera Unavailable</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex justify-center space-x-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startCameraStream()}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Retry Camera
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab('upload')}
                      icon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Use File Chooser
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[320px] max-h-[400px]">
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white space-y-2 z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-xs text-slate-300">Requesting device camera...</span>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover max-h-[380px]"
                  />

                  {/* Framing Overlay Guide */}
                  <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="text-center">
                      <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full font-medium shadow-sm">
                        Position Principal Display Panel (PDP) inside frame
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-white/80 text-[10px] drop-shadow-md">
                        Hold steady • Ensure good lighting • Keep declarations flat
                      </span>
                    </div>
                  </div>

                  {/* Flip Camera Control */}
                  {hasMultipleCameras && (
                    <button
                      onClick={handleToggleCamera}
                      title="Switch Camera (Front / Back)"
                      aria-label="Switch camera between front and back"
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/20 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : !isAtLimit && activeTab === 'upload' ? (
            /* FILE UPLOAD DROPZONE */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">
                  Select or drag package photograph
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click to choose a photo from your computer or phone gallery. Supported formats: JPEG, PNG, WEBP (Max 5.00 MB).
                </p>
                <div className="mt-4">
                  <span className="inline-block px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700">
                    Browse Files
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>

          {previewDataUrl ? (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={handleRetake}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Retake Photo
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={handleConfirm}
                icon={
                  isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
              >
                {isSubmitting ? 'Saving Evidence...' : 'Confirm & Attach Photo'}
              </Button>
            </div>
          ) : !isAtLimit && activeTab === 'camera' && !cameraError ? (
            <Button
              variant="primary"
              size="sm"
              disabled={cameraLoading}
              onClick={captureFrame}
              icon={<Camera className="w-4 h-4" />}
            >
              Snap Photo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

