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
  Camera,
  FileSearch,
  Sparkles,
  Info,
  PlusCircle,
  ExternalLink,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  InspectionData,
  InspectionStatus,
  PACKAGE_CONTEXT_DEFINITIONS,
  fetchInspectionById,
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
    if (!inspection) return;

    setIsAddingSample(true);
    setSampleError(null);

    try {
      const result = await createSample(inspection._id);
      setSamples((prev) => [...prev, result.sample]);
      setProgress(result.progress);
    } catch (err: unknown) {
      setSampleError(err instanceof Error ? err.message : 'Failed to add sample.');
    } finally {
      setIsAddingSample(false);
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
                  ? 'Adding Sample...'
                  : progress?.isComplete
                  ? 'All Samples Added'
                  : `Add Sample #${samples.length + 1}`}
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
                Begin physical inspection by registering the first of {inspection.samplesCount} planned package specimens.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSample}
                disabled={isAddingSample}
                icon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                Add Sample #1
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
                      <tr key={sample._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">
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
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/inspector/inspections/${inspection._id}/samples/${sample._id}`
                              )
                            }
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                            className="text-xs"
                          >
                            Open Unit
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
                Phase 8 Active: Multi-Sample Lifecycle Foundation
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                1:N Parent-Child Verified
              </span>
            </div>
            <p className="text-xs text-blue-800/90 leading-relaxed">
              Parent inspection <strong className="font-mono">{inspection.inspectionNumber}</strong> currently contains <strong className="font-semibold">{samples.length}</strong> of <strong className="font-semibold">{inspection.samplesCount}</strong> child sample units. In Phase 9, camera capture will attach photos to each individual sample record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
