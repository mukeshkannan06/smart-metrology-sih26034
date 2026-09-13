import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Camera,
  FileSearch,
  Sparkles,
  Info,
  PlusCircle,
  ExternalLink,
  Clock,
  CheckCircle,
  ShieldCheck,
  Eye,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { InspectionStepper } from '../../components/inspection/InspectionStepper';
import {
  InspectionData,
  InspectionStatus,
  PACKAGE_CONTEXT_DEFINITIONS,
  fetchInspectionById,
  finalizeInspection,
} from '../../services/inspectionService';
import {
  SampleData,
  SampleProgressSummary,
  SAMPLE_STATUS_META,
  fetchSamplesForInspection,
  createSample,
} from '../../services/sampleService';

export const InspectionWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [progress, setProgress] = useState<SampleProgressSummary | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [isAddingSample, setIsAddingSample] = useState<boolean>(false);

  // Option B: Case Finalization state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalizeRemarks, setFinalizeRemarks] = useState<string>('');
  const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [attestationConfirmed, setAttestationConfirmed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setError('Missing inspection ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSampleError(null);

        const [inspData, samplesResp] = await Promise.all([
          fetchInspectionById(id),
          fetchSamplesForInspection(id).catch(() => ({
            inspection: null,
            samples: [],
            progress: {
              totalExpected: 5,
              totalCreated: 0,
              completed: 0,
              inProgress: 0,
              pending: 0,
              remaining: 5,
              isComplete: false,
              percentComplete: 0,
            },
          })),
        ]);

        if (isMounted) {
          setInspection(inspData);
          setSamples(samplesResp.samples);
          setProgress(samplesResp.progress);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load inspection workspace.');
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
  }, [id]);

  const handleAddSample = async () => {
    if (!inspection || inspection.status === InspectionStatus.COMPLETED) return;

    setIsAddingSample(true);
    setSampleError(null);

    try {
      const result = await createSample(inspection._id);
      setSamples((prev) => [...prev, result.sample]);
      setProgress(result.progress);
      // Seamless Flow: Directly navigate into the new specimen's workspace to examine it!
      navigate(`/inspector/inspections/${inspection._id}/samples/${result.sample._id}`);
    } catch (err: unknown) {
      setSampleError(err instanceof Error ? err.message : 'Failed to add sample.');
    } finally {
      setIsAddingSample(false);
    }
  };

  const handleFinalize = async () => {
    if (!inspection) return;
    if (!attestationConfirmed) {
      setFinalizeError('Please check the attestation verification box before sealing.');
      return;
    }

    try {
      setIsFinalizing(true);
      setFinalizeError(null);
      const res = await finalizeInspection(inspection._id, finalizeRemarks);
      setInspection(res.inspection);
      setIsFinalizeModalOpen(false);
      setFinalizeSuccess(
        `Inspection ${res.inspection.inspectionNumber} officially finalized and sealed with status COMPLETED.`
      );
      setTimeout(() => setFinalizeSuccess(null), 8000);
    } catch (err: unknown) {
      setFinalizeError(err instanceof Error ? err.message : 'Failed to finalize inspection.');
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading inspection workspace...</span>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-bold text-red-950">Unable to Open Inspection Workspace</span>
            <p className="text-red-800">{error || 'Inspection record not found.'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inspector/my-inspections')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to My Inspections
        </Button>
      </div>
    );
  }

  const contextMeta = PACKAGE_CONTEXT_DEFINITIONS[inspection.packageContext];

  const getStatusBadge = (status: InspectionStatus) => {
    switch (status) {
      case InspectionStatus.READY_FOR_SAMPLING:
        return <Badge variant="info">Ready for Sampling</Badge>;
      case InspectionStatus.IN_PROGRESS:
        return <Badge variant="warning">In Progress</Badge>;
      case InspectionStatus.COMPLETED:
        return <Badge variant="success">Completed</Badge>;
      case InspectionStatus.ARCHIVED:
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Inspection Case: ${inspection.inspectionNumber}`}
        subtitle={`${inspection.commodity} — Recorded under ${contextMeta?.label || inspection.packageContext}`}
        badge={getStatusBadge(inspection.status)}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'My Inspections', href: '/inspector/my-inspections' },
          { label: inspection.inspectionNumber },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inspector/my-inspections')}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              All Inspections
            </Button>
            {samples.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/inspector/inspections/${inspection._id}/samples/${samples[0]._id}`)
                }
                icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
              >
                Examine Specimen #1
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/inspector/findings?inspectionId=${inspection._id}`)}
              icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
            >
              Compliance Findings
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/inspector/new-inspection')}
            >
              New Inspection
            </Button>
          </div>
        }
      />

      {/* 4-Stage Guided Inspection Stepper */}
      <InspectionStepper
        currentStage={
          inspection.status === InspectionStatus.COMPLETED
            ? 4
            : progress?.isComplete
            ? 4
            : 2
        }
        totalExpected={inspection.samplesCount}
        totalCreated={progress?.totalCreated || samples.length}
        isCompleted={inspection.status === InspectionStatus.COMPLETED}
      />

      {/* Success Notification */}
      {finalizeSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{finalizeSuccess}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inspector/dashboard')}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
          >
            View Dashboard (Completed) ➔
          </Button>
        </div>
      )}

      {/* OPTION B: Finalization Prompt Card (When all samples added, pending officer sign-off) */}
      {progress?.isComplete && inspection.status !== InspectionStatus.COMPLETED && (
        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-600 text-white">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm font-bold text-emerald-950">
                  Sampling Target Complete ({progress.totalCreated} of {progress.totalExpected} Units Examined)
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 max-w-xl">
                All intended package specimens have been registered and examined. As the inspecting officer, you can now formally attest the findings, seal the case, and generate the official report for the Assistant Controller.
              </p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAttestationConfirmed(false);
                  setFinalizeError(null);
                  setIsFinalizeModalOpen(true);
                }}
                icon={<ShieldCheck className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-xs"
              >
                ✓ Finalize Inspection & Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CASE SEALED BANNER (When case is COMPLETED) */}
      {inspection.status === InspectionStatus.COMPLETED && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-950 flex items-center space-x-2">
                <span>Inspection Case Formally Finalized & Sealed</span>
                <Badge variant="success">COMPLETED</Badge>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Statutory attestation logged in audit trail. Case is permanently recorded and available to supervisory officials.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/inspector/generate-pdf/${inspection._id}`)}
              icon={<FileText className="w-3.5 h-3.5 text-emerald-700" />}
              className="border-emerald-300 text-emerald-900 hover:bg-emerald-100"
            >
              Generate Sealed PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/inspector/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Case Parameters & Statutory Context */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="Inspection Parameters & Metadata"
              subtitle="Registered legal attributes for this enforcement event"
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    <span>Commodity Name</span>
                  </div>
                  <div className="font-bold text-slate-800 text-sm">{inspection.commodity}</div>
                  {inspection.brand && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Brand: <span className="font-medium text-slate-700">{inspection.brand}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspection Location</span>
                  </div>
                  <div className="font-bold text-slate-800">{inspection.location}</div>
                  {inspection.market && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Market: <span className="font-medium text-slate-700">{inspection.market}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Sample Scope</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {inspection.samplesCount} {inspection.samplesCount === 1 ? 'Unit' : 'Units'} Planned
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Multi-sample evaluation scope
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Initiated Timestamp</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {new Date(inspection.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Officer Badge: {inspection.inspectorId}
                  </div>
                </div>

                {inspection.remarks && (
                  <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 text-[11px] font-semibold mb-1">
                      Inspection Notes / Remarks
                    </div>
                    <p className="text-slate-700 italic">{inspection.remarks}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Statutory Context Guidance */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="Statutory Packaging Rule Context"
              subtitle={contextMeta?.statutoryRef || 'Legal Metrology Rules 2011'}
            />
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="info">{contextMeta?.label || inspection.packageContext}</Badge>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {contextMeta?.statutoryRef}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {contextMeta?.description ||
                  'Statutory packaged commodity compliance scope according to Legal Metrology provisions.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PHASE 8: MULTI-SAMPLE MANAGEMENT SECTION */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader
          title="Multi-Sample Management"
          subtitle={`Child package specimen records for case ${inspection.inspectionNumber}`}
          action={
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspector/findings?inspectionId=${inspection._id}`)}
                icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
              >
                Compliance Findings
              </Button>
              {samples.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/inspector/inspections/${inspection._id}/samples/${samples[0]._id}`)
                  }
                  icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                >
                  Examine Sample #01
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={isAddingSample || (progress ? progress.isComplete : false)}
                onClick={handleAddSample}
                icon={
                  isAddingSample ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )
                }
              >
                {isAddingSample
                  ? 'Opening New Sample...'
                  : progress?.isComplete
                  ? 'All Units Added'
                  : `+ Add & Examine Sample #${samples.length + 1}`}
              </Button>
            </div>
          }
        />
        <CardContent className="space-y-6">
          {/* Progress Tracking Bar & KPI Counters */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-800 text-sm">
                  Sampling Progress: {progress?.totalCreated || samples.length} of{' '}
                  {progress?.totalExpected || inspection.samplesCount} Units Added
                </span>
                {progress?.isComplete && (
                  <Badge variant="success">All Units Registered</Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-xs font-semibold">
                <span className="text-blue-700">
                  Ready / Completed: {progress?.completed || 0}
                </span>
                <span className="text-amber-600">
                  In Progress: {progress?.inProgress || 0}
                </span>
                <span className="text-slate-500">
                  Remaining: {progress?.remaining ?? Math.max(0, inspection.samplesCount - samples.length)}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    progress
                      ? progress.percentComplete
                      : Math.min(100, Math.round((samples.length / inspection.samplesCount) * 100))
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Sample Error Alert */}
          {sampleError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Error:</span> {sampleError}
              </div>
            </div>
          )}

          {/* Milestone Banner when all planned samples are added */}
          {progress?.isComplete && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold">Sampling Target Reached:</span>
                <p className="text-emerald-900 text-[11px]">
                  All {inspection.samplesCount} intended sample units have been created for this inspection case. Open each unit to record examination notes and update technical status.
                </p>
              </div>
            </div>
          )}

          {/* Samples Roster Table */}
          {samples.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Samples Added Yet</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Begin physical inspection by registering the first of {inspection.samplesCount} planned package specimens. You will be taken immediately to its examination workspace.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSample}
                disabled={isAddingSample}
                icon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                + Create & Examine Sample #1
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Sample ID</th>
                    <th className="px-4 py-3">Unit Scope</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Physical Observations / Notes</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {samples.map((sample) => {
                    const statusMeta =
                      SAMPLE_STATUS_META[sample.status] || {
                        label: sample.status,
                        badgeVariant: 'neutral' as const,
                      };

                    return (
                      <tr
                        key={sample._id}
                        onClick={() =>
                          navigate(
                            `/inspector/inspections/${inspection._id}/samples/${sample._id}`
                          )
                        }
                        className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 group-hover:text-blue-800">
                          {sample.sampleCode}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          Sample {String(sample.sampleNumber).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {sample.notes || <em className="text-slate-400">No notes recorded</em>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                          {new Date(sample.updatedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/inspector/inspections/${inspection._id}/samples/${sample._id}`
                              );
                            }}
                            icon={<ArrowRight className="w-3.5 h-3.5" />}
                            className="text-xs font-semibold shadow-2xs"
                          >
                            Examine Specimen
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Lifecycle Roadmap Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-2xs">
        <div className="flex items-start space-x-3.5">
          <div className="p-2 bg-blue-600 text-white rounded-lg flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-blue-950">
                Phase 12 Active: Compliance Findings & Verification
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Officer Authority Active
              </span>
            </div>
            <p className="text-xs text-blue-800/90 leading-relaxed">
              Parent case <strong className="font-mono">{inspection.inspectionNumber}</strong> contains <strong className="font-semibold">{samples.length}</strong> child sample units. Deterministic Rule Engine evaluations are generated, and findings can be verified in the Compliance Findings Workbench.
            </p>
          </div>
        </div>
      </div>
      {/* OPTION B: Officer Attestation & Finalization Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Finalize & Seal Inspection Case
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Case {inspection.inspectionNumber} • Legal Metrology Attestation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {finalizeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{finalizeError}</span>
                </div>
              )}

              {/* Case Summary Matrix */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Commodity</span>
                  <div className="font-bold text-slate-800">{inspection.commodity}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Package Context</span>
                  <div className="font-bold text-slate-800">{contextMeta?.label || inspection.packageContext}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Sample Scope</span>
                  <div className="font-bold text-slate-800">{progress?.totalCreated || samples.length} / {inspection.samplesCount} Units Examined</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Location</span>
                  <div className="font-bold text-slate-800 truncate">{inspection.location}</div>
                </div>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">
                  Officer Closing Attestation / Field Notes (Optional)
                </label>
                <textarea
                  value={finalizeRemarks}
                  onChange={(e) => setFinalizeRemarks(e.target.value)}
                  placeholder="e.g., Physical packaging examined on premises; mandatory declarations verified per Legal Metrology Rules."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Mandatory Attestation Checkbox */}
              <label className="flex items-start space-x-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={attestationConfirmed}
                  onChange={(e) => {
                    setAttestationConfirmed(e.target.checked);
                    if (finalizeError) setFinalizeError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                  I hereby certify that all {inspection.samplesCount} package specimens have been physically inspected, AI multimodal observations reviewed, and compliance findings evaluated in compliance with <strong>The Legal Metrology (Packaged Commodities) Rules, 2011</strong>.
                </span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFinalizeModalOpen(false)}
                disabled={isFinalizing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalize}
                disabled={isFinalizing || !attestationConfirmed}
                icon={isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                {isFinalizing ? 'Sealing Case...' : 'Confirm & Seal Inspection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
