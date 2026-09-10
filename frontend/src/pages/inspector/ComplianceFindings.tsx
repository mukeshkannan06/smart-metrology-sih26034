import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ExternalLink,
  Edit3,
  Image as ImageIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  X,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchMyInspections, InspectionData } from '../../services/inspectionService';
import { fetchSamplesForInspection, SampleData, getSampleImageUrl } from '../../services/sampleService';
import {
  ComplianceFindingData,
  FindingsTelemetry,
  FindingCandidateStatus,
  InspectorVerificationDecision,
  FindingStatus,
  FINDING_STATUS_META,
  getInspectionFindings,
  verifyFinding,
  correctFinding,
} from '../../services/findingService';

export const ComplianceFindings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isController = user?.role === 'ASSISTANT_CONTROLLER';

  // URL state
  const inspectionIdFromUrl = searchParams.get('inspectionId');
  const sampleIdFromUrl = searchParams.get('sampleId');

  // Core data states
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(inspectionIdFromUrl || '');
  const [currentInspection, setCurrentInspection] = useState<InspectionData | null>(null);
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(sampleIdFromUrl || 'ALL');

  const [findings, setFindings] = useState<ComplianceFindingData[]>([]);
  const [telemetry, setTelemetry] = useState<FindingsTelemetry | null>(null);

  // UI / Filtering states
  const [loading, setLoading] = useState<boolean>(true);
  const [findingsLoading, setFindingsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Per-action states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    findingId?: string;
  } | null>(null);

  // Correction Modal State
  const [correctingFinding, setCorrectingFinding] = useState<ComplianceFindingData | null>(null);
  const [correctedValueInput, setCorrectedValueInput] = useState<string>('');
  const [correctionNotesInput, setCorrectionNotesInput] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);

  // Verification Modal State
  const [verifyingFinding, setVerifyingFinding] = useState<ComplianceFindingData | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<InspectorVerificationDecision>(
    InspectorVerificationDecision.VERIFIED_COMPLIANT
  );
  const [verificationValueInput, setVerificationValueInput] = useState<string>('');
  const [verificationNotesInput, setVerificationNotesInput] = useState<string>('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState<boolean>(false);

  // Evidence Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // 1. Initial Load: Fetch inspections available to this user
  useEffect(() => {
    let isMounted = true;

    async function loadInspections() {
      try {
        setLoading(true);
        setError(null);
        const list = await fetchMyInspections();
        if (!isMounted) return;

        setInspections(list);

        // Determine default inspection
        if (inspectionIdFromUrl && list.some((i: InspectionData) => i._id === inspectionIdFromUrl)) {
          setSelectedInspectionId(inspectionIdFromUrl);
        } else if (list.length > 0) {
          const firstId = list[0]._id;
          setSelectedInspectionId(firstId);
          setSearchParams({ inspectionId: firstId, sampleId: sampleIdFromUrl || 'ALL' }, { replace: true });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load inspections list.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInspections();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. When selected inspection changes, load child samples and findings
  useEffect(() => {
    if (!selectedInspectionId) return;

    let isMounted = true;

    async function loadInspectionData() {
      try {
        setFindingsLoading(true);
        setError(null);

        // Load child samples
        const samplesResp = await fetchSamplesForInspection(selectedInspectionId);
        if (!isMounted) return;

        setSamples(samplesResp.samples || []);
        setCurrentInspection(samplesResp.inspection || null);

        // Load findings
        const findingsResp = await getInspectionFindings(selectedInspectionId, {
          sampleId: selectedSampleId !== 'ALL' ? selectedSampleId : undefined,
        });

        if (!isMounted) return;
        setFindings(findingsResp.findings || []);
        setTelemetry(findingsResp.telemetry || null);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load compliance findings.');
        }
      } finally {
        if (isMounted) setFindingsLoading(false);
      }
    }

    loadInspectionData();
    return () => {
      isMounted = false;
    };
  }, [selectedInspectionId, selectedSampleId]);

  // Handle Switching Inspection
  const handleInspectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInspId = e.target.value;
    setSelectedInspectionId(newInspId);
    setSelectedSampleId('ALL');
    setSearchParams({ inspectionId: newInspId, sampleId: 'ALL' });
  };

  // Handle Switching Sample Tab
  const handleSampleSelect = (sId: string) => {
    setSelectedSampleId(sId);
    setSearchParams({ inspectionId: selectedInspectionId, sampleId: sId });
  };

  // Open Verification Modal for finding
  const handleOpenVerification = (
    finding: ComplianceFindingData,
    initialDecision: InspectorVerificationDecision
  ) => {
    setVerifyingFinding(finding);
    setVerificationDecision(initialDecision);
    setVerificationValueInput(
      finding.inspectorVerification.verifiedValue || finding.aiObservation.extractedValue || ''
    );
    setVerificationNotesInput(finding.inspectorVerification.notes || '');
  };

  // Submit Verification
  const handleSubmitVerification = async () => {
    if (!verifyingFinding) return;

    try {
      setIsSubmittingVerification(true);
      const result = await verifyFinding(verifyingFinding._id, {
        decision: verificationDecision,
        verifiedValue: verificationValueInput.trim() || undefined,
        notes: verificationNotesInput.trim() || undefined,
      });

      // Update local findings state
      setFindings((prev) =>
        prev.map((f) => (f._id === result.finding._id ? result.finding : f))
      );
      setTelemetry(result.telemetry);

      setFeedbackMessage({
        type: 'success',
        text: `Rule ${result.finding.ruleReference} successfully verified as ${FINDING_STATUS_META[result.finding.status]?.label}.`,
        findingId: result.finding._id,
      });

      setVerifyingFinding(null);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit verification.',
        findingId: verifyingFinding._id,
      });
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  // Open Correction Modal
  const handleOpenCorrection = (finding: ComplianceFindingData) => {
    setCorrectingFinding(finding);
    setCorrectedValueInput(
      finding.inspectorVerification.verifiedValue || finding.aiObservation.extractedValue || ''
    );
    setCorrectionNotesInput(finding.inspectorVerification.notes || '');
  };

  // Submit Value Correction
  const handleSubmitCorrection = async () => {
    if (!correctingFinding) return;

    if (!correctedValueInput.trim()) {
      alert('Please enter a corrected declaration value.');
      return;
    }

    try {
      setIsSubmittingCorrection(true);
      const updated = await correctFinding(correctingFinding._id, {
        correctedValue: correctedValueInput.trim(),
        notes: correctionNotesInput.trim() || undefined,
      });

      setFindings((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));

      setFeedbackMessage({
        type: 'success',
        text: `Declaration for ${updated.ruleReference} updated. Original AI extraction remains safely preserved.`,
        findingId: updated._id,
      });

      setCorrectingFinding(null);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to correct observation.',
        findingId: correctingFinding._id,
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Filtered Findings computed list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // 1. Tab filter
      if (filterTab === 'POTENTIAL_NON_COMPLIANCE') {
        if (f.candidateStatus !== FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE && f.status !== FindingStatus.VERIFIED_NON_COMPLIANT) {
          return false;
        }
      } else if (filterTab === 'REQUIRES_INSPECTOR_REVIEW') {
        if (f.candidateStatus !== FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW && f.status !== FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW) {
          return false;
        }
      } else if (filterTab === 'COMPLIANT_CANDIDATE') {
        if (f.candidateStatus !== FindingCandidateStatus.COMPLIANT_CANDIDATE && f.status !== FindingStatus.VERIFIED_COMPLIANT) {
          return false;
        }
      } else if (filterTab === 'VERIFIED') {
        if (!f.isVerified) return false;
      } else if (filterTab === 'NOT_APPLICABLE') {
        if (f.candidateStatus !== FindingCandidateStatus.NOT_APPLICABLE && f.status !== FindingStatus.VERIFIED_NOT_APPLICABLE) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = f.ruleId.toLowerCase().includes(q);
        const matchRef = f.ruleReference.toLowerCase().includes(q);
        const matchDecl = f.declarationType.toLowerCase().includes(q);
        const matchReq = f.requirementDescription.toLowerCase().includes(q);
        const matchObs = (f.aiObservation.extractedValue || '').toLowerCase().includes(q);
        if (!matchId && !matchRef && !matchDecl && !matchReq && !matchObs) {
          return false;
        }
      }

      return true;
    });
  }, [findings, filterTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Compliance Findings & Inspector Verification"
        subtitle="Review deterministic Rule Engine candidate evaluations, correct visual observations, and record legally binding inspector verifications"
        breadcrumbs={[
          { label: 'Dashboard', href: isController ? '/controller/dashboard' : '/inspector/dashboard' },
          { label: 'Compliance Findings' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            {/* Inspection Selector Dropdown */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                aria-label="Select inspection case"
                value={selectedInspectionId}
                onChange={handleInspectionChange}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
              >
                {inspections.map((insp) => (
                  <option key={insp._id} value={insp._id}>
                    {insp.inspectionNumber} — {insp.commodity}
                  </option>
                ))}
              </select>
            </div>

            {selectedInspectionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspector/inspections/${selectedInspectionId}`)}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Inspection Case
              </Button>
            )}
          </div>
        }
      />

      {/* Role Notice Banner for Assistant Controller */}
      {isController && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              <strong>Supervisory Audit View:</strong> Assistant Controllers have read-only jurisdiction over compliance findings. Verifications and corrections are restricted to assigned field inspectors.
            </span>
          </div>
          <Badge variant="purple" size="sm">Supervisory Mode</Badge>
        </div>
      )}

      {/* Case Context Strip */}
      {currentInspection && (
        <Card className="border-slate-200 shadow-xs bg-slate-900 text-white overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-base font-bold text-blue-400">
                  {currentInspection.inspectionNumber}
                </span>
                <span className="text-slate-500">•</span>
                <h2 className="text-sm font-bold text-slate-100">
                  {currentInspection.commodity}
                </h2>
                {currentInspection.brand && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {currentInspection.brand}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-3">
                <span>Location: {currentInspection.location}</span>
                <span>•</span>
                <span>Context: <strong className="text-slate-200">{currentInspection.packageContext}</strong></span>
                <span>•</span>
                <span>Specimen Units: <strong className="text-slate-200">{currentInspection.samplesCount}</strong></span>
              </p>
            </div>

            {/* Quick Summary Badge */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Assigned Inspector</div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  {currentInspection.inspectorId}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Legal Rule DB</div>
                <div className="text-xs font-semibold text-emerald-400">
                  LMPC v1.0 (33 Rules)
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Multi-Sample Pill Selector */}
      {samples.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => handleSampleSelect('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 cursor-pointer ${
              selectedSampleId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Samples ({samples.length})</span>
          </button>

          {samples.map((sample) => {
            const isSelected = selectedSampleId === sample._id;
            const isVerified = sample.status === 'VERIFIED';

            return (
              <button
                key={sample._id}
                onClick={() => handleSampleSelect(sample._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Sample #{sample.sampleNumber} ({sample.sampleCode})</span>
                {isVerified ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="All findings verified" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending verification" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Telemetry KPI Strip */}
      {telemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Findings */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Checks
            </span>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {telemetry.totalFindings}
            </div>
            <p className="text-[10px] text-slate-400">Statutory parameters</p>
          </div>

          {/* Verification Progress */}
          <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Verified
              </span>
              <span className="text-xs font-mono font-bold text-blue-800">
                {telemetry.percentVerified}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-blue-900 font-mono">
              {telemetry.verifiedCount} / {telemetry.totalFindings}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${telemetry.percentVerified}%` }}
              />
            </div>
          </div>

          {/* Compliant Candidates */}
          <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Compliant
            </span>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              {telemetry.candidateBreakdown.compliantCandidates}
            </div>
            <p className="text-[10px] text-emerald-600">Deterministic Pass</p>
          </div>

          {/* Potential Non-Compliances */}
          <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Non-Compliance
            </span>
            <div className="text-xl font-extrabold text-rose-700 font-mono">
              {telemetry.candidateBreakdown.potentialNonCompliances}
            </div>
            <p className="text-[10px] text-rose-600">Potential violations</p>
          </div>

          {/* Requires Review */}
          <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Requires Review
            </span>
            <div className="text-xl font-extrabold text-amber-700 font-mono">
              {telemetry.candidateBreakdown.requiresReview}
            </div>
            <p className="text-[10px] text-amber-600">Manual inspection</p>
          </div>

          {/* Not Applicable */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Not Applicable
            </span>
            <div className="text-xl font-extrabold text-slate-600 font-mono">
              {telemetry.candidateBreakdown.notApplicable}
            </div>
            <p className="text-[10px] text-slate-400">Context excluded</p>
          </div>
        </div>
      )}

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Checks ({findings.length})
          </button>
          <button
            onClick={() => setFilterTab('POTENTIAL_NON_COMPLIANCE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'POTENTIAL_NON_COMPLIANCE'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Potential Violations ({telemetry?.candidateBreakdown.potentialNonCompliances || 0})
          </button>
          <button
            onClick={() => setFilterTab('REQUIRES_INSPECTOR_REVIEW')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'REQUIRES_INSPECTOR_REVIEW'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Requires Review ({telemetry?.candidateBreakdown.requiresReview || 0})
          </button>
          <button
            onClick={() => setFilterTab('COMPLIANT_CANDIDATE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'COMPLIANT_CANDIDATE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Compliant Candidates ({telemetry?.candidateBreakdown.compliantCandidates || 0})
          </button>
          <button
            onClick={() => setFilterTab('VERIFIED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'VERIFIED'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Verified by Inspector ({telemetry?.verifiedCount || 0})
          </button>
          <button
            onClick={() => setFilterTab('NOT_APPLICABLE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'NOT_APPLICABLE'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Exempt / N/A ({telemetry?.candidateBreakdown.notApplicable || 0})
          </button>
        </div>

        {/* Text Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by rule, section, declaration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Findings Content List */}
      {findingsLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-medium">
            Loading statutory compliance findings...
          </p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <Card className="border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Compliance Findings Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No rule findings match the selected filter tab or search query for this sample scope.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const candidateMeta = FINDING_STATUS_META[finding.candidateStatus] || {
              label: finding.candidateStatus,
              badgeVariant: 'neutral' as BadgeVariant,
            };

            const verifiedMeta = finding.isVerified
              ? FINDING_STATUS_META[finding.status] || {
                  label: finding.status,
                  badgeVariant: 'neutral' as BadgeVariant,
                }
              : null;

            return (
              <Card
                key={finding._id}
                className={`border transition-all duration-150 ${
                  finding.isVerified
                    ? 'border-slate-200 bg-white shadow-2xs'
                    : finding.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE
                    ? 'border-rose-200 bg-rose-50/10 shadow-xs'
                    : finding.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW
                    ? 'border-amber-200 bg-amber-50/10 shadow-xs'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {finding.ruleId}
                        </span>
                        <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {finding.ruleReference}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Unit: {finding.sampleCode}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {finding.ruleFamily.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 pt-0.5">
                        {finding.declarationType}
                      </h3>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Candidate Status Badge */}
                      <Badge variant={candidateMeta.badgeVariant} size="sm">
                        Candidate: {candidateMeta.label}
                      </Badge>

                      {/* Verified Status Badge */}
                      {finding.isVerified && verifiedMeta && (
                        <Badge
                          variant={verifiedMeta.badgeVariant}
                          size="sm"
                          icon={<ShieldCheck className="w-3 h-3" />}
                        >
                          {verifiedMeta.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 3-Layer Observation vs Requirement Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Left Column: Visual AI Observation Layer */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Visual AI Observation
                          </span>
                        </div>
                        {finding.aiObservation.confidence && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              finding.aiObservation.confidence === 'HIGH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : finding.aiObservation.confidence === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Confidence: {finding.aiObservation.confidence}
                          </span>
                        )}
                      </div>

                      {/* Observed Value Box */}
                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-500">Observed Value on Package:</div>
                        <div className="p-2 rounded bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-800 break-words">
                          {finding.aiObservation.extractedValue ? (
                            <span>{finding.aiObservation.extractedValue}</span>
                          ) : (
                            <span className="text-slate-400 italic">No declaration detected</span>
                          )}
                        </div>
                      </div>

                      {/* If Corrected: Show Preserved Original AI Extraction */}
                      {finding.isCorrected && finding.inspectorVerification.originalAiValuePreserved && (
                        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] space-y-1">
                          <div className="flex items-center space-x-1.5 text-amber-800 font-bold">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Original AI Extraction Preserved:</span>
                          </div>
                          <div className="font-mono text-amber-900 bg-white/70 px-2 py-1 rounded border border-amber-200/50">
                            {finding.inspectorVerification.originalAiValuePreserved}
                          </div>
                          <p className="text-[10px] text-amber-700">
                            Verified value corrected to: <strong className="font-mono">{finding.inspectorVerification.verifiedValue}</strong>
                          </p>
                        </div>
                      )}

                      {/* Evidence Photo Thumbnails */}
                      {finding.aiObservation.evidenceImageIds && finding.aiObservation.evidenceImageIds.length > 0 && currentInspection && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">
                            Attached Photo Evidence:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {finding.aiObservation.evidenceImageIds.map((imgId, idx) => {
                              const imgUrl = getSampleImageUrl(currentInspection._id, finding.sampleId, imgId);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: imgUrl,
                                      title: `Evidence for ${finding.ruleReference}`,
                                      subtitle: `Declaration: ${finding.declarationType} • Unit: ${finding.sampleCode}`,
                                    })
                                  }
                                  className="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
                                >
                                  <img
                                    src={imgUrl}
                                    alt="Evidence thumbnail"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Statutory Requirement & Deterministic Evaluation */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Statutory Legal Requirement
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                            DB v{finding.ruleEngineResult.ruleDatabaseVersion}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {finding.requirementDescription}
                        </p>

                        <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Deterministic Evaluation Reason:
                          </div>
                          <p className="text-xs text-slate-800 font-mono">
                            {finding.ruleEngineResult.reason || 'Evaluated against statutory package criteria.'}
                          </p>
                        </div>
                      </div>

                      {finding.ruleEngineResult.applicabilityExplanation && (
                        <div className="text-[11px] text-slate-500 italic">
                          Scope: {finding.ruleEngineResult.applicabilityExplanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Banner / Record (If already verified) */}
                  {finding.isVerified && (
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-100">
                            Officer Determination Recorded
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {finding.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Verified by: <strong className="text-slate-200">{finding.inspectorVerification.verifiedByName || finding.inspectorVerification.verifiedBy}</strong> on{' '}
                          {finding.inspectorVerification.verifiedAt
                            ? new Date(finding.inspectorVerification.verifiedAt).toLocaleString('en-IN')
                            : 'Unknown date'}
                        </p>
                        {finding.inspectorVerification.notes && (
                          <p className="text-xs text-slate-300 italic pt-0.5">
                            Note: "{finding.inspectorVerification.notes}"
                          </p>
                        )}
                      </div>

                      {/* Re-verify Button for Inspector */}
                      {!isController && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
                            onClick={() =>
                              handleOpenVerification(
                                finding,
                                finding.inspectorVerification.decision || InspectorVerificationDecision.VERIFIED_COMPLIANT
                              )
                            }
                          >
                            Update Determination
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inspector Action Toolbar (If not verified or editing) */}
                  {!finding.isVerified && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      {/* Left: Quick Decision Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isController ? (
                          <div className="text-xs text-slate-400 italic">
                            Verification action restricted to assigned field inspector.
                          </div>
                        ) : (
                          <>
                            {/* Verify Compliant */}
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              icon={<Check className="w-3.5 h-3.5" />}
                              onClick={() =>
                                handleOpenVerification(finding, InspectorVerificationDecision.VERIFIED_COMPLIANT)
                              }
                            >
                              Verify Compliant
                            </Button>

                            {/* Flag Non-Compliant */}
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-xs"
                              icon={<XCircle className="w-3.5 h-3.5" />}
                              onClick={() =>
                                handleOpenVerification(
                                  finding,
                                  InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                                )
                              }
                            >
                              Flag Non-Compliance
                            </Button>

                            {/* Flag for Review */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs"
                              icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                              onClick={() =>
                                handleOpenVerification(
                                  finding,
                                  InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
                                )
                              }
                            >
                              Action Required
                            </Button>

                            {/* Mark Not Applicable */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600 text-xs"
                              onClick={() =>
                                handleOpenVerification(
                                  finding,
                                  InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE
                                )
                              }
                            >
                              Mark N/A
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Right: Value Correction Button */}
                      {!isController && (
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => handleOpenCorrection(finding)}
                            className="text-xs"
                          >
                            Correct Declaration Value
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verification Dialog Modal */}
      {verifyingFinding && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setVerifyingFinding(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Record Inspector Finding Determination
                </h3>
              </div>
              <button
                onClick={() => setVerifyingFinding(null)}
                aria-label="Close dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <div className="text-xs text-slate-500">Statutory Check:</div>
                <div className="text-sm font-bold text-slate-900">
                  {verifyingFinding.ruleReference} — {verifyingFinding.declarationType}
                </div>
                <div className="text-xs font-mono text-blue-700 pt-0.5">
                  Rule ID: {verifyingFinding.ruleId} • Unit: {verifyingFinding.sampleCode}
                </div>
              </div>

              {/* Decision Radio Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Verification Decision:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-semibold ${
                      verificationDecision === InspectorVerificationDecision.VERIFIED_COMPLIANT
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={InspectorVerificationDecision.VERIFIED_COMPLIANT}
                      checked={verificationDecision === InspectorVerificationDecision.VERIFIED_COMPLIANT}
                      onChange={() =>
                        setVerificationDecision(InspectorVerificationDecision.VERIFIED_COMPLIANT)
                      }
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Verified Compliant</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-semibold ${
                      verificationDecision === InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                        ? 'border-rose-500 bg-rose-50/60 text-rose-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={InspectorVerificationDecision.VERIFIED_NON_COMPLIANT}
                      checked={verificationDecision === InspectorVerificationDecision.VERIFIED_NON_COMPLIANT}
                      onChange={() =>
                        setVerificationDecision(InspectorVerificationDecision.VERIFIED_NON_COMPLIANT)
                      }
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Flag Non-Compliance</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-semibold ${
                      verificationDecision ===
                      InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW}
                      checked={
                        verificationDecision ===
                        InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
                      }
                      onChange={() =>
                        setVerificationDecision(
                          InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
                        )
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Action Required</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-semibold ${
                      verificationDecision === InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE
                        ? 'border-slate-500 bg-slate-100 text-slate-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE}
                      checked={verificationDecision === InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE}
                      onChange={() =>
                        setVerificationDecision(InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE)
                      }
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>Not Applicable / Exempt</span>
                  </label>
                </div>
              </div>

              {/* Verified Value Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Verified Declaration Text:
                </label>
                <input
                  type="text"
                  value={verificationValueInput}
                  onChange={(e) => setVerificationValueInput(e.target.value)}
                  placeholder="Enter or confirm verified text..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Original AI extraction ({verifyingFinding.aiObservation.extractedValue || 'None'}) remains preserved in the audit trail.
                </p>
              </div>

              {/* Inspector Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Inspector Notes / Justification:
                </label>
                <textarea
                  rows={3}
                  value={verificationNotesInput}
                  onChange={(e) => setVerificationNotesInput(e.target.value)}
                  placeholder="e.g., Physical examination confirmed correct generic name in principal display panel..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerifyingFinding(null)}
                disabled={isSubmittingVerification}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitVerification}
                disabled={isSubmittingVerification}
                icon={
                  isSubmittingVerification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )
                }
              >
                {isSubmittingVerification ? 'Saving Verification...' : 'Confirm Determination'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Value Correction Modal */}
      {correctingFinding && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCorrectingFinding(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Correct Observed Declaration Value
                </h3>
              </div>
              <button
                onClick={() => setCorrectingFinding(null)}
                aria-label="Close dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                <div className="font-bold">Legal Safety Guarantee:</div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Corrections do NOT overwrite or delete the original AI observation. The AI text remains immutable and permanently recorded for audit transparency.
                </p>
              </div>

              {/* Original AI Value (Read-Only) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">
                  Original AI Extraction (Immutable):
                </label>
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700">
                  {correctingFinding.aiObservation.extractedValue || 'No extraction detected'}
                </div>
              </div>

              {/* Corrected Value Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">
                  Corrected Declaration Value:
                </label>
                <input
                  type="text"
                  value={correctedValueInput}
                  onChange={(e) => setCorrectedValueInput(e.target.value)}
                  placeholder="Enter accurate observed declaration text..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Reason for Correction (Optional):
                </label>
                <textarea
                  rows={2}
                  value={correctionNotesInput}
                  onChange={(e) => setCorrectionNotesInput(e.target.value)}
                  placeholder="e.g. Corrected OCR misspelling of manufacturer name..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCorrectingFinding(null)}
                disabled={isSubmittingCorrection}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitCorrection}
                disabled={isSubmittingCorrection}
                icon={
                  isSubmittingCorrection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )
                }
              >
                {isSubmittingCorrection ? 'Saving Correction...' : 'Save Correction'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Size Evidence Lightbox */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 text-white">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-100">{lightboxImage.title}</h3>
                {lightboxImage.subtitle && (
                  <p className="text-[10px] text-slate-400">{lightboxImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                aria-label="Close evidence viewer"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="p-4 flex items-center justify-center bg-slate-950 overflow-auto flex-1">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Viewer Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 flex items-center justify-between">
              <span>High-resolution specimen evidence</span>
              <Button variant="outline" size="sm" onClick={() => setLightboxImage(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
