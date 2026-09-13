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
  Scale,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  PlusCircle,
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
  createSample,
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
import {
  RuleEvaluationData,
  RuleEvaluationItem,
  evaluateSampleRules,
  fetchSampleEvaluations,
} from '../../services/ruleService';
import { CameraCaptureModal } from '../../components/camera/CameraCaptureModal';
import { RuleEvaluationPanel } from '../../components/rules/RuleEvaluationPanel';
import { InspectionStepper } from '../../components/inspection/InspectionStepper';

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
  const [isCreatingNext, setIsCreatingNext] = useState<boolean>(false);

  // Editable form fields
  const [status, setStatus] = useState<SampleStatus>(SampleStatus.PENDING);
  const [notes, setNotes] = useState<string>('');

  // Phase 9 Camera & Image state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [selectedImageForView, setSelectedImageForView] = useState<SampleImage | null>(null);
  const [isModalImageLoading, setIsModalImageLoading] = useState<boolean>(true);
  const [modalImageError, setModalImageError] = useState<boolean>(false);
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

  // Phase 11 Deterministic Rule Engine state
  const [ruleEvaluation, setRuleEvaluation] = useState<RuleEvaluationData | null>(null);
  const [isEvaluatingRules, setIsEvaluatingRules] = useState<boolean>(false);
  const [ruleEvaluationError, setRuleEvaluationError] = useState<string | null>(null);
  const [ruleEvaluationSuccess, setRuleEvaluationSuccess] = useState<string | null>(null);
  const [ruleFilterTab, setRuleFilterTab] = useState<'applicable' | 'violations' | 'review' | 'exempt' | 'all'>('applicable');

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

          // Load Rule Engine evaluation for this sample
          try {
            const evalResp = await fetchSampleEvaluations(found._id);
            if (isMounted && evalResp.latestEvaluation) {
              setRuleEvaluation(evalResp.latestEvaluation);
            }
          } catch {
            // Non-critical background evaluation load
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

  const handleCreateNextSample = async () => {
    if (!inspection) return;
    setIsCreatingNext(true);
    setError(null);
    try {
      const res = await createSample(inspection._id);
      setAllSamples((prev) => [...prev, res.sample]);
      navigate(`/inspector/inspections/${inspection._id}/samples/${res.sample._id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create next sample unit.');
    } finally {
      setIsCreatingNext(false);
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

      // Trigger automatic deterministic rule evaluation with new extractions
      try {
        const evalData = await evaluateSampleRules(res.sample._id);
        setRuleEvaluation(evalData);
      } catch {
        // Non-fatal background evaluation
      }
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'AI declaration extraction failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEvaluateRules = async () => {
    if (!currentSample) return;
    try {
      setIsEvaluatingRules(true);
      setRuleEvaluationError(null);
      const evalData = await evaluateSampleRules(currentSample._id);
      setRuleEvaluation(evalData);
      setRuleEvaluationSuccess(
        `Deterministic evaluation completed: ${evalData.summary.applicable_count} applicable rules resolved, ${evalData.summary.review_required_count} review required.`
      );
      setTimeout(() => setRuleEvaluationSuccess(null), 5000);
    } catch (err: unknown) {
      setRuleEvaluationError(err instanceof Error ? err.message : 'Deterministic rule evaluation failed.');
    } finally {
      setIsEvaluatingRules(false);
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

      {/* 4-Stage Guided Inspection Stepper */}
      <InspectionStepper
        currentStage={2}
        totalExpected={inspection?.samplesCount || allSamples.length}
        totalCreated={allSamples.length}
        isCompleted={inspection?.status === 'COMPLETED'}
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

      {/* Multi-Specimen Quick-Switcher Ribbon */}
      {allSamples.length > 0 && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1 mr-1 flex-shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Specimens ({allSamples.length}/{inspection?.samplesCount || allSamples.length}):</span>
            </span>
            {allSamples.map((s) => {
              const isCurrent = s._id === currentSample?._id;
              const sMeta = SAMPLE_STATUS_META[s.status] || {
                label: s.status,
                badgeVariant: 'neutral' as const,
              };

              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => navigateToSample(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer flex-shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Sample {String(s.sampleNumber).padStart(2, '0')}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isCurrent
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {sMeta.label}
                  </span>
                </button>
              );
            })}

            {inspection && allSamples.length < inspection.samplesCount && (
              <button
                type="button"
                onClick={handleCreateNextSample}
                disabled={isCreatingNext}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors flex items-center space-x-1.5 cursor-pointer flex-shrink-0 disabled:opacity-50"
                title="Create next specimen unit and immediately open it"
              >
                {isCreatingNext ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span>+ Add Sample #{allSamples.length + 1}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  `/inspector/findings?inspectionId=${inspection?._id}&sampleId=${currentSample?._id}`
                )
              }
              icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
              className="text-xs"
            >
              Compliance Findings
            </Button>
          </div>
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

              {/* Automated Specimen Lifecycle Pipeline Stepper */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Automated Sampling Lifecycle
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Status advances automatically based on your examination actions
                  </span>
                </div>

                {/* Automated Stepper Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    {
                      key: 'REGISTERED',
                      label: '1. Registered',
                      desc: 'Specimen created',
                      active: true,
                    },
                    {
                      key: 'CAPTURED',
                      label: '2. Captured',
                      desc:
                        currentSample?.images && currentSample.images.length > 0
                          ? `${currentSample.images.length} photo(s)`
                          : 'Awaiting photos',
                      active:
                        Boolean(currentSample?.images && currentSample.images.length > 0) ||
                        ['CAPTURED', 'EXTRACTED', 'EVALUATED', 'VERIFIED'].includes(
                          currentSample?.status || ''
                        ),
                    },
                    {
                      key: 'EXTRACTED',
                      label: '3. AI Extracted',
                      desc: aiExtraction ? 'OCR complete' : 'Ready for AI',
                      active:
                        Boolean(aiExtraction) ||
                        ['EXTRACTED', 'EVALUATED', 'VERIFIED'].includes(
                          currentSample?.status || ''
                        ),
                    },
                    {
                      key: 'EVALUATED',
                      label: '4. Evaluated',
                      desc: ruleEvaluation ? 'Rules evaluated' : 'Pending rules',
                      active:
                        Boolean(ruleEvaluation) ||
                        ['EVALUATED', 'VERIFIED'].includes(currentSample?.status || ''),
                    },
                    {
                      key: 'VERIFIED',
                      label: '5. Verified',
                      desc:
                        currentSample?.status === 'VERIFIED'
                          ? 'Fully verified'
                          : 'Pending Phase 12',
                      active: currentSample?.status === 'VERIFIED',
                    },
                  ].map((step) => (
                    <div
                      key={step.key}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        step.active
                          ? 'border-blue-200 bg-white shadow-2xs'
                          : 'border-slate-200/60 bg-slate-100/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold ${
                            step.active ? 'text-blue-900' : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                        {step.active ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{step.desc}</p>
                    </div>
                  ))}
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
                  {isSaving ? 'Saving Observations...' : 'Save Physical Observations'}
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
                  {/* Mode Banner: Mock vs Live Gemini */}
                  {aiExtraction.provider.includes('mock') ? (
                    <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold text-amber-900">Demo Simulation Mode Active:</span>{' '}
                        No <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-bold">GEMINI_API_KEY</code> is configured in <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-bold">backend/.env</code>. The extracted declarations below are simulated sample data.
                        <div className="mt-1 font-medium text-amber-800">
                          💡 To extract the actual printed text from your uploaded package photo: Add your Google Gemini API key in <code className="bg-white/90 px-1 py-0.5 rounded border border-amber-200">backend/.env</code> as <code className="bg-white/90 px-1 py-0.5 rounded border border-amber-200">GEMINI_API_KEY=your_key</code> and click <em>Re-analyze Package</em>.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 flex items-center space-x-2 text-[11px]">
                      <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        <strong>Live Gemini Vision Active:</strong> Observable declarations extracted directly from your uploaded package photos using Google Gemini ({aiExtraction.aiModel || 'Multimodal AI'}).
                      </span>
                    </div>
                  )}

                  {/* Extraction Telemetry Summary Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">AI Engine</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {aiExtraction.provider.includes('mock') ? 'Demo Mock Provider' : 'Gemini 1.5 Flash'}
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
                        {aiExtraction.processingMetadata.imagesCount} Photo{aiExtraction.processingMetadata.imagesCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Declarations Found</span>
                      <span className="font-semibold text-slate-800">
                        {aiExtraction.declarations.filter((d) => d.state === 'DETECTED').length} of {aiExtraction.declarations.length} Detected
                      </span>
                    </div>
                  </div>

                  {/* Clean Declarations List */}
                  <div className="space-y-2">
                    {aiExtraction.declarations.map((decl) => {
                      const meta = CATEGORY_META[decl.category] || { label: decl.category, statutoryHint: '', ruleRefHint: '' };
                      const isDetected = decl.state === 'DETECTED';

                      return (
                        <div
                          key={decl.category}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            {/* Left: Category Title & Statutory Reference */}
                            <div className="sm:w-52 flex-shrink-0">
                              <span className="font-bold text-slate-800 text-xs block">{meta.label}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono inline-block mt-0.5">
                                {meta.ruleRefHint}
                              </span>
                            </div>

                            {/* Middle: Extracted Text Display */}
                            <div className="flex-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 min-w-0">
                              {decl.rawValue ? (
                                <div>
                                  <div className="font-mono text-xs text-slate-900 font-bold break-words">
                                    {decl.rawValue}
                                  </div>
                                  {decl.normalizedValue && decl.normalizedValue !== decl.rawValue && (
                                    <div className="text-[11px] text-slate-500 mt-1">
                                      <span className="font-semibold text-slate-600">Standardized:</span> {decl.normalizedValue}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Not detected on visible package surfaces
                                </span>
                              )}
                            </div>

                            {/* Right: Detection Status Badge & Visual Evidence Photo Link */}
                            <div className="sm:w-36 flex-shrink-0 flex sm:flex-col items-end sm:items-end justify-between gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDetected
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : decl.state === 'NOT_DETECTED'
                                  ? 'bg-slate-100 text-slate-500'
                                  : decl.state === 'LOW_CONFIDENCE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {decl.state.replace('_', ' ')}
                              </span>

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
                                  className="text-blue-600 hover:text-blue-800 font-semibold text-[10px] inline-flex items-center space-x-1 cursor-pointer pt-0.5"
                                  title="View photo where this declaration was observed"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Photo #{decl.evidenceImageSequence}</span>
                                </button>
                              )}

                              {decl.evidenceDescription && (
                                <span className="text-[10px] text-slate-400 text-right truncate max-w-[140px] block" title={decl.evidenceDescription}>
                                  {decl.evidenceDescription}
                                </span>
                              )}
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

          {/* Phase 11: Deterministic Rule Engine Evaluation Panel */}
          {currentSample && (
            <RuleEvaluationPanel
              sampleId={currentSample._id}
              sampleNumber={currentSample.sampleNumber}
              packageContext={inspection?.packageContext || 'RETAIL_PACKAGE'}
              commodity={inspection?.commodity || ''}
              evaluation={ruleEvaluation}
              isEvaluating={isEvaluatingRules}
              onEvaluate={handleEvaluateRules}
              error={ruleEvaluationError}
              success={ruleEvaluationSuccess}
            />
          )}
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
                          onClick={() => {
                            setSelectedImageForView(img);
                            setIsModalImageLoading(true);
                            setModalImageError(false);
                          }}
                          className="relative h-32 bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                        >
                          <img
                            src={getSampleImageUrl(inspection!._id, currentSample._id, img.imageId)}
                            alt={`Specimen #${currentSample.sampleNumber} Image #${img.sequence}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).parentElement?.querySelector('.img-thumbnail-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="img-thumbnail-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                            <Camera className="w-5 h-5 text-slate-500 mb-1" />
                            <span className="text-[10px] text-slate-400 font-medium">Specimen #{currentSample.sampleNumber}</span>
                          </div>
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
              {/* Phase 11 Deterministic Rule Engine Active */}
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Phase 11: Rule Engine</span>
                  </div>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                    Active v1.0
                  </span>
                </div>
                <p className="text-[11px] text-emerald-950 leading-relaxed">
                  {ruleEvaluation
                    ? `${ruleEvaluation.summary.applicable_count} statutory rules applicable; ${ruleEvaluation.summary.review_required_count} review required.`
                    : 'Deterministic Rule Engine v1.0 ready for evaluation.'}
                </p>
              </div>

              {/* Phase 12 Compliance Findings Active Card */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Phase 12: Compliance Verification</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-relaxed">
                  Review deterministic findings, correct visual OCR declarations, and record legally binding inspector determinations.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (inspection && currentSample) {
                      navigate(
                        `/inspector/findings?inspectionId=${inspection._id}&sampleId=${currentSample._id}`
                      );
                    }
                  }}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open Findings Workbench
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seamless Multi-Sample Examination Workflow & Navigation Footer */}
      {inspection && currentSample && (
        <Card className="border-blue-200 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/40 shadow-xs">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Examination Workflow Navigation
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Unit {currentSample.sampleNumber} of {inspection.samplesCount}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Specimen <strong className="font-mono text-slate-900">{currentSample.sampleCode}</strong> lifecycle status:{' '}
                <Badge variant={statusMeta?.badgeVariant || 'neutral'} size="sm">
                  {statusMeta?.label || currentSample.status}
                </Badge>
                {allSamples.length >= inspection.samplesCount
                  ? ' • All intended package specimens have been registered for this case.'
                  : ` • ${inspection.samplesCount - allSamples.length} specimen unit(s) remaining to reach target sample size.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspector/inspections/${inspection._id}`)}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Case Overview
              </Button>

              {prevSample && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToSample(prevSample)}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev: Sample {String(prevSample.sampleNumber).padStart(2, '0')}
                </Button>
              )}

              {nextSample ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigateToSample(nextSample)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="shadow-xs"
                >
                  Proceed to Next: Sample {String(nextSample.sampleNumber).padStart(2, '0')}
                </Button>
              ) : allSamples.length < inspection.samplesCount ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isCreatingNext}
                  onClick={handleCreateNextSample}
                  icon={
                    isCreatingNext ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )
                  }
                  className="shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreatingNext
                    ? 'Creating Sample...'
                    : `+ Add & Examine Sample #${allSamples.length + 1}`}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/inspector/findings?inspectionId=${inspection._id}&sampleId=${currentSample._id}`
                    )
                  }
                  icon={<ShieldCheck className="w-3.5 h-3.5" />}
                  className="shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Review Findings (Phase 12)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GUIDED PIPELINE FORWARD ACTION BAR */}
      {inspection && currentSample && (
        <Card className="border-blue-200 bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 shadow-2xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Specimen #{currentSample.sampleNumber} of {inspection.samplesCount} Examination
                </div>
                <div className="text-[11px] text-slate-500">
                  {nextSample
                    ? `Ready to proceed to Specimen #${nextSample.sampleNumber}.`
                    : allSamples.length < inspection.samplesCount
                    ? `Register the next specimen (${allSamples.length + 1} of ${inspection.samplesCount}).`
                    : 'All planned package specimens have been created for this case.'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspector/inspections/${inspection._id}`)}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Case Overview
              </Button>

              {nextSample ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigateToSample(nextSample)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-xs"
                >
                  Proceed to Specimen #{nextSample.sampleNumber} ➔
                </Button>
              ) : allSamples.length < inspection.samplesCount ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isCreatingNext}
                  onClick={async () => {
                    try {
                      setIsCreatingNext(true);
                      const res = await createSample(inspection._id);
                      setAllSamples((prev) => [...prev, res.sample]);
                      navigate(`/inspector/inspections/${inspection._id}/samples/${res.sample._id}`);
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Failed to create next sample.');
                    } finally {
                      setIsCreatingNext(false);
                    }
                  }}
                  icon={isCreatingNext ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-xs"
                >
                  {isCreatingNext ? 'Creating Next Unit...' : `+ Add & Examine Specimen #${allSamples.length + 1} ➔`}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/inspector/inspections/${inspection._id}`)}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-xs"
                >
                  All Samples Complete — Review & Finalize ➔
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="p-4 flex items-center justify-center bg-slate-950 overflow-auto flex-1 min-h-[360px] relative">
              {isModalImageLoading && !modalImageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2.5 bg-slate-950/90 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <span className="text-xs font-medium text-slate-300">Streaming specimen photo...</span>
                </div>
              )}

              {modalImageError ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 max-w-sm">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mb-2.5" />
                  <h4 className="text-sm font-semibold text-slate-200">Specimen photo not available</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    The temporary file on your local server may have been purged or the session token expired.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => {
                      setModalImageError(false);
                      setIsModalImageLoading(true);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              ) : (
                <img
                  src={getSampleImageUrl(inspection._id, currentSample._id, selectedImageForView.imageId)}
                  alt={`Full view ${selectedImageForView.fileName || 'specimen photo'}`}
                  className={`max-h-[70vh] w-auto object-contain rounded-lg shadow-lg transition-opacity duration-200 ${
                    isModalImageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={() => setIsModalImageLoading(false)}
                  onError={() => {
                    setIsModalImageLoading(false);
                    setModalImageError(true);
                  }}
                />
              )}
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
