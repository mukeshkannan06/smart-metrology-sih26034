import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  Calendar,
  Clock,
  Camera,
  FileSearch,
  Sparkles,
  Info,
  ShieldAlert,
  Trash2,
  Maximize2,
  Plus,
  Eye,
  X,
  Upload,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  SampleData,
  SampleImage,
  SampleStatus,
  SAMPLE_STATUS_META,
  fetchSamplesForInspection,
  updateSample,
  uploadSampleImage,
  deleteSampleImage,
  getSampleImageUrl,
} from '../../services/sampleService';
import {
  InspectionData,
  PACKAGE_CONTEXT_DEFINITIONS,
  fetchInspectionById,
} from '../../services/inspectionService';
import {
  AIExtractionData,
  DeclarationCategory,
  CATEGORY_META,
  analyzeSampleDeclarations,
  getSampleExtractions,
  reviewDeclaration,
  ReviewStatus,
} from '../../services/aiService';
import { CameraCaptureModal } from '../../components/camera/CameraCaptureModal';

export const SampleWorkspace: React.FC = () => {
  const { inspectionId, sampleId } = useParams<{ inspectionId: string; sampleId: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [allSamples, setAllSamples] = useState<SampleData[]>([]);
  const [currentSample, setCurrentSample] = useState<SampleData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Editable form fields
  const [status, setStatus] = useState<SampleStatus>(SampleStatus.PENDING);
  const [notes, setNotes] = useState<string>('');

  // Phase 9 Camera & Image state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [selectedImageForView, setSelectedImageForView] = useState<SampleImage | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [imageActionSuccess, setImageActionSuccess] = useState<string | null>(null);

  // Phase 10 AI Declaration Extraction state
  const [aiExtraction, setAiExtraction] = useState<AIExtractionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null);
  const [isExtractionStale, setIsExtractionStale] = useState<boolean>(false);
  const [reviewingCategory, setReviewingCategory] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!inspectionId || !sampleId) {
        setError('Missing inspection or sample ID.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch parent inspection and all sibling samples in parallel
        const [inspData, samplesResp] = await Promise.all([
          fetchInspectionById(inspectionId),
          fetchSamplesForInspection(inspectionId),
        ]);

        if (!isMounted) return;

        setInspection(inspData);
        setAllSamples(samplesResp.samples);

        // Find active sample by _id or sampleCode
        const found = samplesResp.samples.find(
          (s) =>
            s._id === sampleId ||
            s.sampleCode.toUpperCase() === sampleId.toUpperCase() ||
            s.sampleNumber.toString() === sampleId
        );

        if (!found) {
          setError(`Sample '${sampleId}' not found in inspection ${inspData.inspectionNumber}.`);
        } else {
          setCurrentSample(found);
          setStatus(found.status);
          setNotes(found.notes || '');

          // Load AI declaration extractions for this sample
          try {
            const extResp = await getSampleExtractions(inspData._id, found._id);
            if (isMounted && extResp) {
              setAiExtraction(extResp.latestExtraction);
              setIsExtractionStale(extResp.isStale);
            }
          } catch {
            // Non-critical background extraction load
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load sample details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [inspectionId, sampleId]);

  const handleSave = async () => {
    if (!inspection || !currentSample) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const updated = await updateSample(inspection._id, currentSample._id, {
        status,
        notes,
      });

      setCurrentSample(updated.sample);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sample changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageConfirmed = async (payload: {
    imageData: string;
    mimeType: string;
    fileName: string;
  }) => {
    if (!inspection || !currentSample) return;
    setImageActionError(null);
    try {
      const res = await uploadSampleImage(inspection._id, currentSample._id, payload);
      setCurrentSample(res.sample);
      setStatus(res.sample.status);
      setAllSamples((prev) => prev.map((s) => (s._id === res.sample._id ? res.sample : s)));
      if (aiExtraction) {
        setIsExtractionStale(true);
      }
      setImageActionSuccess('Package evidence photo attached successfully.');
      setTimeout(() => setImageActionSuccess(null), 4000);
    } catch (err: unknown) {
      setImageActionError(err instanceof Error ? err.message : 'Failed to attach image.');
      throw err;
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!inspection || !currentSample) return;
    const confirmDel = window.confirm('Are you sure you want to remove this package evidence photo?');
    if (!confirmDel) return;

    try {
      setIsDeletingImage(imageId);
      setImageActionError(null);
      const res = await deleteSampleImage(inspection._id, currentSample._id, imageId);
      setCurrentSample(res.sample);
      setStatus(res.sample.status);
      setAllSamples((prev) => prev.map((s) => (s._id === res.sample._id ? res.sample : s)));
      if (aiExtraction) {
        setIsExtractionStale(true);
      }
      if (selectedImageForView?.imageId === imageId) {
        setSelectedImageForView(null);
      }
      setImageActionSuccess('Package evidence photo removed.');
      setTimeout(() => setImageActionSuccess(null), 4000);
    } catch (err: unknown) {
      setImageActionError(err instanceof Error ? err.message : 'Failed to delete image.');
    } finally {
      setIsDeletingImage(null);
    }
  };

  const handleRunAnalysis = async (forceReanalyze = false) => {
    if (!inspection || !currentSample) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);

    try {
      const res = await analyzeSampleDeclarations(inspection._id, currentSample._id, {
        forceReanalyze,
      });

      setAiExtraction(res.extraction);
      setCurrentSample(res.sample);
      setStatus(res.sample.status);
      setAllSamples((prev) => prev.map((s) => (s._id === res.sample._id ? res.sample : s)));
      setIsExtractionStale(false);

      if (res.cached) {
        setAnalysisSuccess('Loaded existing package declaration extraction (unchanged images).');
      } else {
        setAnalysisSuccess('Package declarations extracted successfully via Gemini Multimodal AI.');
      }
      setTimeout(() => setAnalysisSuccess(null), 5000);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'AI declaration extraction failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReview = async (category: DeclarationCategory, newStatus: ReviewStatus) => {
    if (!inspection || !currentSample || !aiExtraction) return;
    setReviewingCategory(category);
    try {
      const updatedExtraction = await reviewDeclaration(
        inspection._id,
        currentSample._id,
        aiExtraction.extractionId,
        category,
        newStatus
      );
      setAiExtraction(updatedExtraction);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record declaration review.');
    } finally {
      setReviewingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading sample examination workspace...</span>
      </div>
    );
  }

  if (error && !currentSample) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Error Accessing Sample Workspace:</span>
            <p className="mt-1 text-red-800">{error}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            inspectionId
              ? navigate(`/inspector/inspections/${inspectionId}`)
              : navigate('/inspector/my-inspections')
          }
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to Inspection
        </Button>
      </div>
    );
  }

  // Prev / Next sample logic
  const currentIndex = allSamples.findIndex((s) => s._id === currentSample?._id);
  const prevSample = currentIndex > 0 ? allSamples[currentIndex - 1] : null;
  const nextSample =
    currentIndex >= 0 && currentIndex < allSamples.length - 1 ? allSamples[currentIndex + 1] : null;

  const navigateToSample = (target: SampleData) => {
    navigate(`/inspector/inspections/${inspectionId}/samples/${target._id}`);
  };

  const statusMeta = currentSample
    ? SAMPLE_STATUS_META[currentSample.status] || {
        label: currentSample.status,
        badgeVariant: 'neutral' as const,
        description: '',
      }
    : null;

  const contextMeta = inspection
    ? PACKAGE_CONTEXT_DEFINITIONS[inspection.packageContext]
    : null;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Sample Unit: ${currentSample?.sampleCode}`}
        subtitle={`${inspection?.commodity} — Unit ${currentSample?.sampleNumber} of ${inspection?.samplesCount}`}
        badge={
          statusMeta && (
            <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
          )
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'My Inspections', href: '/inspector/my-inspections' },
          {
            label: inspection?.inspectionNumber || 'Inspection',
            href: `/inspector/inspections/${inspectionId}`,
          },
          { label: currentSample?.sampleCode || 'Sample' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/inspector/inspections/${inspectionId}`)}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back to Case
            </Button>
            {prevSample && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToSample(prevSample)}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Sample {String(prevSample.sampleNumber).padStart(2, '0')}
              </Button>
            )}
            {nextSample && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToSample(nextSample)}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Sample {String(nextSample.sampleNumber).padStart(2, '0')}
              </Button>
            )}
          </div>
        }
      />

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Sample unit examination details saved successfully.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Parent Inspection Summary Strip */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Commodity</span>
            <span className="font-bold text-slate-800 text-sm">{inspection?.commodity}</span>
            {inspection?.brand && (
              <span className="text-slate-500 ml-1.5 font-normal">({inspection.brand})</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Case Context</span>
            <span className="font-semibold text-blue-700">{contextMeta?.label}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location</span>
            <span className="font-semibold text-slate-700">{inspection?.location}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Planned</span>
            <span className="font-semibold text-slate-800">{inspection?.samplesCount} Units</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sample Metadata & Active Notes Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title={`Sample #${currentSample?.sampleNumber} Examination Record`}
              subtitle="Record physical state and technical preparation for this package specimen"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold mb-1 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sample Identifier</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {currentSample?.sampleCode}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Parent: {inspection?.inspectionNumber}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Registered Timestamp</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {currentSample &&
                      new Date(currentSample.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Updated:{' '}
                      {currentSample &&
                        new Date(currentSample.updatedAt).toLocaleTimeString('en-IN', {
                          timeStyle: 'short',
                        })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Lifecycle Status Selector */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Technical Sampling Lifecycle Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      val: SampleStatus.PENDING,
                      label: 'Pending',
                      desc: 'Awaiting visual capture',
                    },
                    {
                      val: SampleStatus.CAPTURED,
                      label: 'Captured',
                      desc: 'Photos attached',
                    },
                    {
                      val: SampleStatus.IN_PROGRESS,
                      label: 'In Progress',
                      desc: 'Active examination',
                    },
                    {
                      val: SampleStatus.READY_FOR_ANALYSIS,
                      label: 'Ready for Analysis',
                      desc: 'Prepared for OCR extraction',
                    },
                  ].map((s) => (
                    <div
                      key={s.val}
                      onClick={() => setStatus(s.val)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        status === s.val
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">{s.label}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            status === s.val
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {status === s.val && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{s.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    Legal compliance statuses (<code className="text-slate-700 font-bold">COMPLIANT</code> /{' '}
                    <code className="text-slate-700 font-bold">NON_COMPLIANT</code>) are strictly prohibited
                    during Phase 8 sampling and belong to Phase 12 verification.
                  </span>
                </div>
              </div>

              {/* Officer Field Notes */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sample Notes / Physical Observations
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Package seal intact, no leakage, principal display panel clean and fully visible."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Observations recorded for this specific unit. Accessible to supervisory Assistant Controllers.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/inspector/inspections/${inspectionId}`)}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSave}
                  icon={
                    isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                >
                  {isSaving ? 'Saving Changes...' : 'Save Sample Record'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Phase 10: AI Package Declaration Extraction Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="AI Package Declaration Extraction"
              subtitle={`Multimodal visual reading of statutory declarations for Specimen #${currentSample?.sampleNumber}`}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    isAnalyzing ||
                    !currentSample?.images ||
                    currentSample.images.length === 0
                  }
                  onClick={() => handleRunAnalysis(Boolean(aiExtraction))}
                  icon={
                    isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : aiExtraction ? (
                      <RefreshCw className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isAnalyzing
                    ? 'Analyzing Package...'
                    : aiExtraction
                    ? 'Re-analyze Package'
                    : 'Extract Declarations (Gemini AI)'}
                </Button>
              }
            />
            <CardContent className="space-y-4 text-xs">
              {/* Statutory Non-Compliance Disclaimer Banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-blue-900">Statutory Metrology Notice:</span>{' '}
                  This AI module performs <em>visual observation & transcription only</em>. It strictly reports visible printed text.
                  Statutory compliance evaluations (Rule 6, Rule 9, Rule 24) are evaluated in <strong>Phase 11 (Deterministic Rule Engine)</strong> and verified by the official in <strong>Phase 12</strong>.
                </div>
              </div>

              {/* Stale Warning Banner */}
              {isExtractionStale && aiExtraction && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Image Set Changed:</strong> Package photos were added or modified since this analysis.
                      Re-analyzing is recommended to sync declarations with current evidence.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunAnalysis(true)}
                    disabled={isAnalyzing}
                    className="bg-white ml-2 flex-shrink-0"
                  >
                    Re-analyze
                  </Button>
                </div>
              )}

              {/* Analysis Feedback Alerts */}
              {analysisSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{analysisSuccess}</span>
                </div>
              )}

              {analysisError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* AI Warnings / Quality Notices */}
              {aiExtraction?.warnings && aiExtraction.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px] text-slate-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI Vision Quality Notices:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 pl-1 space-y-0.5">
                    {aiExtraction.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content: Either empty prompt or extraction results */}
              {!aiExtraction ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/60 text-blue-700 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">No AI Declarations Extracted Yet</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      {!currentSample?.images || currentSample.images.length === 0
                        ? 'Capture at least one package photo in the gallery on the right to unlock AI declaration extraction.'
                        : 'Package photos are ready. Click below to inspect all 10 statutory declarations using Gemini Multimodal AI.'}
                    </p>
                  </div>
                  {currentSample?.images && currentSample.images.length > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRunAnalysis(false)}
                      disabled={isAnalyzing}
                      icon={isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    >
                      {isAnalyzing ? 'Extracting Declarations...' : 'Extract Declarations (Gemini AI)'}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Extraction Telemetry Summary Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">AI Provider / Model</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {aiExtraction.provider} ({aiExtraction.aiModel})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Overall Confidence</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        aiExtraction.overallConfidence === 'HIGH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : aiExtraction.overallConfidence === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {aiExtraction.overallConfidence}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Photos Analyzed</span>
                      <span className="font-semibold text-slate-800">
                        {aiExtraction.processingMetadata.imagesCount} Photos
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Inspector Verified</span>
                      <span className="font-semibold text-slate-800">
                        {aiExtraction.declarations.filter((d) => d.inspectorReview?.status === 'CONFIRMED').length} / {aiExtraction.declarations.length}
                      </span>
                    </div>
                  </div>

                  {/* Declarations List / Table */}
                  <div className="space-y-2">
                    {aiExtraction.declarations.map((decl) => {
                      const meta = CATEGORY_META[decl.category] || { label: decl.category, statutoryHint: '', ruleRefHint: '' };
                      const isConfirmed = decl.inspectorReview?.status === 'CONFIRMED';
                      const isIncorrect = decl.inspectorReview?.status === 'INCORRECT';
                      const isUnclear = decl.inspectorReview?.status === 'UNCLEAR';
                      const isReviewing = reviewingCategory === decl.category;

                      return (
                        <div
                          key={decl.category}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            {/* Category Title & Legal Ref */}
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800 text-xs">{meta.label}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-medium">
                                {meta.ruleRefHint}
                              </span>
                            </div>

                            {/* Badges: State + Confidence */}
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                decl.state === 'DETECTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : decl.state === 'NOT_DETECTED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : decl.state === 'LOW_CONFIDENCE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {decl.state.replace('_', ' ')}
                              </span>

                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                decl.confidence === 'HIGH'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : decl.confidence === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}>
                                {decl.confidence} Conf.
                              </span>
                            </div>
                          </div>

                          {/* Values & Evidence Location */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                            {/* Extracted Raw & Normalized Text */}
                            <div className="md:col-span-7 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Extracted Text
                              </div>
                              {decl.rawValue ? (
                                <div>
                                  <div className="font-mono text-xs text-slate-900 font-semibold break-words">
                                    {decl.rawValue}
                                  </div>
                                  {decl.normalizedValue && decl.normalizedValue !== decl.rawValue && (
                                    <div className="text-[11px] text-slate-500 mt-1">
                                      <span className="font-semibold text-slate-600">Normalized:</span> {decl.normalizedValue}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No declaration text detected</span>
                              )}
                            </div>

                            {/* Evidence Citation & Link */}
                            <div className="md:col-span-5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Visual Evidence</span>
                                {decl.evidenceImageSequence && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const foundImg = currentSample?.images?.find(
                                        (i) => i.imageId === decl.evidenceImageId || i.sequence === decl.evidenceImageSequence
                                      ) || currentSample?.images?.[0];
                                      if (foundImg) {
                                        setSelectedImageForView(foundImg);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Photo #{decl.evidenceImageSequence}</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 italic leading-snug">
                                {decl.evidenceDescription || 'No specific location specified.'}
                              </p>
                            </div>
                          </div>

                          {/* Inspector Verification Bar */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 font-medium">Inspector Review:</span>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                isConfirmed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isIncorrect
                                  ? 'bg-rose-100 text-rose-800'
                                  : isUnclear
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {decl.inspectorReview?.status || 'PENDING'}
                              </span>
                              {decl.inspectorReview?.reviewedBy && (
                                <span className="text-[10px] text-slate-400">
                                  by {decl.inspectorReview.reviewedBy}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                disabled={isReviewing}
                                onClick={() => handleReview(decl.category, 'CONFIRMED')}
                                title="Confirm extraction is correct"
                                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                                  isConfirmed
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm</span>
                              </button>

                              <button
                                type="button"
                                disabled={isReviewing}
                                onClick={() => handleReview(decl.category, 'INCORRECT')}
                                title="Flag extraction as incorrect"
                                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                                  isIncorrect
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                <X className="w-3 h-3" />
                                <span>Flag Incorrect</span>
                              </button>

                              <button
                                type="button"
                                disabled={isReviewing}
                                onClick={() => handleReview(decl.category, 'UNCLEAR')}
                                title="Flag extraction as unclear or blurry"
                                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                                  isUnclear
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                <span>Flag Unclear</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Phase 9 Package Visual Evidence & Future Phase Placeholders */}
        <div className="space-y-6">
          {/* Phase 9 Package Visual Evidence Gallery */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="Package Visual Evidence"
              subtitle={`Physical photographs for specimen #${currentSample?.sampleNumber}`}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCameraModalOpen(true)}
                  disabled={Boolean(currentSample?.images && currentSample.images.length >= 5)}
                  icon={<Camera className="w-3.5 h-3.5" />}
                >
                  Capture Photo
                </Button>
              }
            />
            <CardContent className="space-y-4 text-xs">
              {imageActionSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{imageActionSuccess}</span>
                </div>
              )}

              {imageActionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{imageActionError}</span>
                </div>
              )}

              {currentSample?.images && currentSample.images.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-700">
                      Captured Photos ({currentSample.images.length} / 5)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Click thumbnail to inspect
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentSample.images.map((img) => (
                      <div
                        key={img.imageId}
                        className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-all"
                      >
                        {/* Image Preview Container */}
                        <div
                          onClick={() => setSelectedImageForView(img)}
                          className="relative h-32 bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                        >
                          <img
                            src={getSampleImageUrl(inspection!._id, currentSample._id, img.imageId)}
                            alt={`Specimen #${currentSample.sampleNumber} Image #${img.sequence}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="p-1.5 rounded-full bg-white/90 text-slate-900 shadow-sm">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </span>
                          </div>
                          <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            #{img.sequence}
                          </span>
                        </div>

                        {/* Image Meta & Controls */}
                        <div className="p-2.5 flex items-center justify-between bg-slate-50/70 border-t border-slate-100 text-[11px]">
                          <div className="overflow-hidden pr-2">
                            <span className="font-medium text-slate-800 block truncate max-w-[120px]">
                              {img.fileName || `Photo #${img.sequence}`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {(img.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {img.mimeType.replace('image/', '').toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              onClick={() => setSelectedImageForView(img)}
                              title="Preview full photo"
                              aria-label="Preview full photo"
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteImage(img.imageId)}
                              disabled={isDeletingImage === img.imageId}
                              title="Delete photo"
                              aria-label="Delete photo"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                            >
                              {isDeletingImage === img.imageId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {currentSample.images.length < 5 && (
                    <button
                      onClick={() => setIsCameraModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/40 text-slate-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Another Angle / Panel Photo</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">No Package Photos Attached</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Capture high-resolution images of the Principal Display Panel (PDP) and mandatory statutory declarations.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCameraModalOpen(true)}
                    icon={<Camera className="w-3.5 h-3.5" />}
                  >
                    Capture Package Photo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Pipeline Placeholders */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="Downstream Pipeline"
              subtitle="Statutory compliance & verification"
            />
            <CardContent className="space-y-3 text-xs">
              {/* Phase 11 Rule Engine Placeholder */}
              <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center space-x-2 text-slate-500 font-bold">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Phase 11: LMPC Rule Engine</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Deterministic evaluation against Legal Metrology Rules 2011 to generate candidate compliance findings.
                </p>
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Pending Phase 11
                </span>
              </div>

              {/* Phase 12 Compliance Findings Placeholder */}
              <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center space-x-2 text-slate-500 font-bold">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span>Phase 12: Compliance Verification</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Inspector verification, manual overrides, and final statutory compliance determination.
                </p>
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Pending Phase 12
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phase 9 Camera Capture Modal */}
      {currentSample && (
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onImageConfirmed={handleImageConfirmed}
          sampleCode={currentSample.sampleCode}
          sampleNumber={currentSample.sampleNumber}
          existingCount={currentSample.images ? currentSample.images.length : 0}
          maxAllowed={5}
        />
      )}

      {/* Full-Size Lightbox Image Viewer */}
      {selectedImageForView && inspection && currentSample && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedImageForView(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 text-white">
              <div className="flex items-center space-x-3">
                <span className="px-2 py-0.5 rounded bg-blue-600 font-mono text-xs font-bold">
                  #{selectedImageForView.sequence}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {selectedImageForView.fileName || `Specimen #${currentSample.sampleNumber} Photo`}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Sample: {currentSample.sampleCode} • {(selectedImageForView.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {selectedImageForView.mimeType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedImageForView(null)}
                aria-label="Close image viewer"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="p-4 flex items-center justify-center bg-slate-950 overflow-auto flex-1">
              <img
                src={getSampleImageUrl(inspection._id, currentSample._id, selectedImageForView.imageId)}
                alt={`Full view ${selectedImageForView.fileName || 'specimen photo'}`}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Viewer Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Captured: {new Date(selectedImageForView.capturedAt).toLocaleString('en-IN')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedImageForView(null)}
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
