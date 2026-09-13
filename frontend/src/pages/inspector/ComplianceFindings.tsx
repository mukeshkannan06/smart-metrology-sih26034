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
  ChevronDown,
  ChevronUp,
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

export const PLAIN_ENGLISH_RULE_TITLES: Record<string, string> = {
  'LMPC-R06-1-A': 'Manufacturer / Packer Name & Address',
  'LMPC-R06-1-B': 'Generic Name of Commodity',
  'LMPC-R06-1-C': 'Net Quantity Statement & Metric Units',
  'LMPC-R06-1-D': 'Month & Year of Manufacture / Packing',
  'LMPC-R06-1-DA': 'Maximum Retail Price (MRP) & Tax Disclaimer',
  'LMPC-R06-1-E': 'Expiry / Best Before Date',
  'LMPC-R06-1-F': 'Country of Origin (Imported Goods)',
  'LMPC-R06-1-G': 'Consumer Care Details (Phone, Email, Address)',
  'LMPC-R06-1-H': 'Unit Sale Price (USP) per g/ml/piece',
  'LMPC-R06-1-AA': 'Dimensions of Commodity & Size Details',
  'LMPC-R06-2-PKG-STD': 'Standard Packaging Sizes Compliance',
  'LMPC-R09-NUMERAL-HT': 'Numeral & Letter Height Standards',
  'LMPC-R09-AREA-PRIN': 'Principal Display Panel (PDP) Dimensions',
  'LMPC-R27-VEG-NONVEG': 'Vegetarian / Non-Vegetarian Symbol & Quadrant',
  'LMPC-R06-3-COMBINED': 'Combined Package Declarations & Inner Pack Details',
  'LMPC-R06-4-DECEPTIVE': 'Protection Against Deceptive Packaging / Slack Fill',
  'LMPC-R06-5-WHOLESALE': 'Wholesale Package Mandatory Declarations',
  'LMPC-R06-6-EXPORT': 'Export Package Exemption & Markings',
  'LMPC-R06-7-E-COMMERCE': 'E-Commerce Marketplace Mandatory Digital Disclosures',
  'LMPC-R07-LANGUAGE': 'Statutory Language Requirements (Hindi / English)',
  'LMPC-R08-CONTRAST': 'Color Contrast & Background Prominence',
  'LMPC-R10-MULTI-UNIT': 'Multi-Piece Retail Package Declarations',
  'LMPC-R11-GROUP-PKG': 'Group Package Declarations',
  'LMPC-R12-FLEXIBLE': 'Flexible Pouch & Sachet Marking Rules',
  'LMPC-R13-AEROSOL': 'Aerosol Package Net Content by Mass & Volume',
  'LMPC-R14-SWEET-MEAT': 'Weight of Packaging Box Deduction (Sweets)',
  'LMPC-R15-DEFACEMENT': 'Tamper Evident Seal & Anti-Defacement Standard',
  'LMPC-R18-ALTERATION': 'No Overwriting / Stickers over MRP Declaration',
  'LMPC-R24-SAMPLE-COL': 'Sample Collection & Inspection Protocol Compliance',
  'LMPC-R26-EXEMPTIONS': 'Statutory Packaged Commodity Exemptions Criteria',
  'LMPC-R28-OFFENCES': 'Cognizance of Non-Compliance & Penalty Classification',
  'LMPC-R32-COMPOUND': 'Compounding Eligibility of Packaging Infractions',
  'LMPC-R33-SEIZURE': 'Seizure & Detention Statutory Criteria',
};

export function formatRuleTitle(finding: ComplianceFindingData): string {
  if (PLAIN_ENGLISH_RULE_TITLES[finding.ruleId]) {
    return PLAIN_ENGLISH_RULE_TITLES[finding.ruleId];
  }
  if (finding.declarationType && finding.declarationType !== 'UNKNOWN') {
    return finding.declarationType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return finding.ruleReference || finding.ruleId;
}

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

  // 1-Click Verification State
  const [verifyingFindingId, setVerifyingFindingId] = useState<string | null>(null);
  const [verifyingRuleId, setVerifyingRuleId] = useState<string | null>(null);
  const [applyCorrectionToGroup, setApplyCorrectionToGroup] = useState<boolean>(true);
  const [showPassedDetails, setShowPassedDetails] = useState<boolean>(false);
  const [correctionDecision, setCorrectionDecision] = useState<InspectorVerificationDecision | null>(null);
  const [isVerifyingAllPassed, setIsVerifyingAllPassed] = useState<boolean>(false);

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

  // Direct 1-Click Verification Handler
  const handleDirectVerify = async (
    finding: ComplianceFindingData,
    decision: InspectorVerificationDecision
  ) => {
    try {
      setVerifyingFindingId(finding._id);
      const result = await verifyFinding(finding._id, {
        decision,
        verifiedValue:
          finding.inspectorVerification.verifiedValue || finding.aiObservation.extractedValue || undefined,
        notes: finding.inspectorVerification.notes || undefined,
      });

      // Update local findings state
      setFindings((prev) =>
        prev.map((f) => (f._id === result.finding._id ? result.finding : f))
      );
      setTelemetry(result.telemetry);

      const decisionLabel =
        decision === InspectorVerificationDecision.VERIFIED_COMPLIANT
          ? 'Verified Compliant'
          : decision === InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
          ? 'Flagged Non-Compliance'
          : decision === InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
          ? 'Action Required'
          : 'Marked Not Applicable';

      setFeedbackMessage({
        type: 'success',
        text: `Rule ${result.finding.ruleReference} confirmed as ${decisionLabel}.`,
        findingId: result.finding._id,
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit verification.',
        findingId: finding._id,
      });
    } finally {
      setVerifyingFindingId(null);
    }
  };

  // Group Direct 1-Click Verification Handler (for All Samples view)
  const handleGroupDirectVerify = async (
    groupFindings: ComplianceFindingData[],
    decision: InspectorVerificationDecision
  ) => {
    if (groupFindings.length === 0) return;
    const ruleId = groupFindings[0].ruleId;
    const ruleRef = groupFindings[0].ruleReference;

    try {
      setVerifyingRuleId(ruleId);

      // Metrology Principle: Statutory compliance is commodity-wide.
      // Target ALL specimens of this rule across the inspection to ensure complete synchronization.
      const targetFindings = findings.filter(
        (f) =>
          (ruleId && f.ruleId === ruleId) ||
          (ruleRef && f.ruleReference === ruleRef)
      );
      const itemsToUpdate = targetFindings.length > 0 ? targetFindings : groupFindings;

      const updatePromises = itemsToUpdate.map((f) =>
        verifyFinding(f._id, {
          decision,
          verifiedValue:
            f.inspectorVerification.verifiedValue || f.aiObservation.extractedValue || undefined,
          notes:
            f.inspectorVerification.notes ||
            (decision === InspectorVerificationDecision.VERIFIED_COMPLIANT
              ? 'Statutory compliance confirmed across all sampled units'
              : 'Statutory non-compliance confirmed across sampled units'),
        })
      );

      const results = await Promise.all(updatePromises);
      const updatedMap = new Map(results.map((r) => [r.finding._id, r.finding]));

      setFindings((prev) =>
        prev.map((f) => (updatedMap.has(f._id) ? updatedMap.get(f._id)! : f))
      );

      if (results.length > 0) {
        setTelemetry(results[results.length - 1].telemetry);
      }

      const decisionLabel =
        decision === InspectorVerificationDecision.VERIFIED_COMPLIANT
          ? 'Verified Compliant'
          : decision === InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
          ? 'Flagged Non-Compliance'
          : 'Updated';

      setFeedbackMessage({
        type: 'success',
        text: `Rule ${ruleRef} confirmed as ${decisionLabel} across all ${itemsToUpdate.length} specimens.`,
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit group verification.',
      });
    } finally {
      setVerifyingRuleId(null);
    }
  };

  // Open Correction & Notes Modal
  const handleOpenCorrection = (finding: ComplianceFindingData) => {
    setCorrectingFinding(finding);
    setCorrectedValueInput(
      finding.inspectorVerification.verifiedValue || finding.aiObservation.extractedValue || ''
    );
    setCorrectionNotesInput(finding.inspectorVerification.notes || '');
    setCorrectionDecision(finding.inspectorVerification.decision || null);
    setApplyCorrectionToGroup(selectedSampleId === 'ALL');
  };

  // Submit Value Correction & Notes
  const handleSubmitCorrection = async () => {
    if (!correctingFinding) return;

    try {
      setIsSubmittingCorrection(true);

      const targetFindings =
        selectedSampleId === 'ALL' && applyCorrectionToGroup
          ? findings.filter((f) => f.ruleId === correctingFinding.ruleId)
          : [correctingFinding];

      const updatePromises = targetFindings.map(async (item) => {
        let updated = item;

        // 1. If value was edited
        if (correctedValueInput.trim()) {
          updated = await correctFinding(item._id, {
            correctedValue: correctedValueInput.trim(),
            notes: correctionNotesInput.trim() || undefined,
          });
        }

        // 2. If determination decision was also chosen
        if (correctionDecision) {
          const verifyRes = await verifyFinding(item._id, {
            decision: correctionDecision,
            verifiedValue: correctedValueInput.trim() || undefined,
            notes: correctionNotesInput.trim() || undefined,
          });
          updated = verifyRes.finding;
          setTelemetry(verifyRes.telemetry);
        }

        return updated;
      });

      const updatedList = await Promise.all(updatePromises);
      const updatedMap = new Map(updatedList.map((u) => [u._id, u]));

      setFindings((prev) => prev.map((f) => (updatedMap.has(f._id) ? updatedMap.get(f._id)! : f)));

      setFeedbackMessage({
        type: 'success',
        text: `Observation & notes for ${correctingFinding.ruleReference} updated successfully across ${updatedList.length} specimen(s).`,
        findingId: correctingFinding._id,
      });
      setTimeout(() => setFeedbackMessage(null), 3500);

      setCorrectingFinding(null);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to save correction.',
        findingId: correctingFinding._id,
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Batch Confirm Rules Handler
  const handleVerifyBatch = async (batchItems: ComplianceFindingData[]) => {
    const unverified = batchItems.filter((f) => !f.isVerified);
    if (unverified.length === 0) return;

    try {
      setIsVerifyingAllPassed(true);
      const updatePromises = unverified.map((f) =>
        verifyFinding(f._id, {
          decision: InspectorVerificationDecision.VERIFIED_COMPLIANT,
          verifiedValue: f.aiObservation.extractedValue || undefined,
          notes: 'Statutory compliance confirmed from deterministic evaluation',
        })
      );

      const results = await Promise.all(updatePromises);
      const updatedMap = new Map(results.map((r) => [r.finding._id, r.finding]));

      setFindings((prev) =>
        prev.map((f) => (updatedMap.has(f._id) ? updatedMap.get(f._id)! : f))
      );

      if (results.length > 0) {
        setTelemetry(results[results.length - 1].telemetry);
      }

      setFeedbackMessage({
        type: 'success',
        text: `Successfully recorded all ${unverified.length} passed rules as Verified Compliant.`,
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to verify passed rules.',
      });
    } finally {
      setIsVerifyingAllPassed(false);
    }
  };

  const handleVerifyAllPassed = () => handleVerifyBatch(passedFindings);

  // Compute enriched KPI metrics incorporating already-passed rules (excluding non-applicable rules)
  const kpiMetrics = useMemo(() => {
    const applicableFindings = findings.filter(
      (f) =>
        f.candidateStatus !== FindingCandidateStatus.NOT_APPLICABLE &&
        f.status !== FindingStatus.VERIFIED_NOT_APPLICABLE
    );

    const totalChecks = applicableFindings.length;
    if (totalChecks === 0) {
      return {
        totalChecks: 0,
        clearedCount: 0,
        clearedPercent: 0,
        passedCleanCount: 0,
        verifiedAttentionCount: 0,
        compliantTotal: 0,
        nonComplianceTotal: 0,
        requiresReviewTotal: 0,
      };
    }

    let passedCleanCount = 0;
    let verifiedAttentionCount = 0;
    let compliantTotal = 0;
    let nonComplianceTotal = 0;
    let requiresReviewTotal = 0;

    applicableFindings.forEach((f) => {
      const isAttention =
        f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
        f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
        f.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW ||
        f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW ||
        f.aiObservation.state === 'NOT_DETECTED' ||
        f.aiObservation.confidence === 'LOW' ||
        f.isCorrected;

      if (!isAttention) {
        // Clean statutory pass
        passedCleanCount++;
        compliantTotal++;
      } else {
        // Attention requirement
        if (f.isVerified) {
          verifiedAttentionCount++;
          if (f.status === FindingStatus.VERIFIED_COMPLIANT) {
            compliantTotal++;
          } else if (f.status === FindingStatus.VERIFIED_NON_COMPLIANT) {
            nonComplianceTotal++;
          } else if (f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW) {
            requiresReviewTotal++;
          }
        } else {
          // Unverified candidate
          if (f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE) {
            nonComplianceTotal++;
          } else if (f.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW) {
            requiresReviewTotal++;
          }
        }
      }
    });

    const clearedCount = passedCleanCount + verifiedAttentionCount;
    const clearedPercent = totalChecks > 0 ? Math.min(100, Math.round((clearedCount / totalChecks) * 100)) : 0;

    return {
      totalChecks,
      clearedCount,
      clearedPercent,
      passedCleanCount,
      verifiedAttentionCount,
      compliantTotal,
      nonComplianceTotal,
      requiresReviewTotal,
    };
  }, [findings]);

  // Filtered Findings computed list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // Exclude non-applicable / exempt rules completely so inspectors only see active rules
      if (
        f.candidateStatus === FindingCandidateStatus.NOT_APPLICABLE ||
        f.status === FindingStatus.VERIFIED_NOT_APPLICABLE
      ) {
        return false;
      }

      const isCleanPass =
        f.candidateStatus === FindingCandidateStatus.COMPLIANT_CANDIDATE &&
        f.aiObservation.state !== 'NOT_DETECTED' &&
        f.aiObservation.confidence !== 'LOW' &&
        !f.isCorrected;

      // 1. Tab filter (Evaluated with Whole-Rule Integrity in Multi-Specimen view)
      if (filterTab === 'POTENTIAL_NON_COMPLIANCE') {
        if (selectedSampleId === 'ALL' && samples.length > 1) {
          const ruleKey = f.ruleId || f.ruleReference;
          const ruleHasPnc = findings.some(
            (other) =>
              (other.ruleId === ruleKey || other.ruleReference === ruleKey) &&
              (other.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
                other.status === FindingStatus.VERIFIED_NON_COMPLIANT)
          );
          if (!ruleHasPnc) return false;
        } else {
          if (
            f.candidateStatus !== FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE &&
            f.status !== FindingStatus.VERIFIED_NON_COMPLIANT
          ) {
            return false;
          }
        }
      } else if (filterTab === 'REQUIRES_INSPECTOR_REVIEW') {
        if (selectedSampleId === 'ALL' && samples.length > 1) {
          const ruleKey = f.ruleId || f.ruleReference;
          const ruleHasReview = findings.some(
            (other) =>
              (other.ruleId === ruleKey || other.ruleReference === ruleKey) &&
              (other.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW ||
                other.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW)
          );
          if (!ruleHasReview) return false;
        } else {
          if (
            f.candidateStatus !== FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW &&
            f.status !== FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW
          ) {
            return false;
          }
        }
      } else if (filterTab === 'COMPLIANT_CANDIDATE') {
        if (selectedSampleId === 'ALL' && samples.length > 1) {
          const ruleKey = f.ruleId || f.ruleReference;
          const ruleHasDefect = findings.some(
            (other) =>
              (other.ruleId === ruleKey || other.ruleReference === ruleKey) &&
              (other.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
                other.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
                other.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW ||
                other.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW ||
                other.aiObservation.state === 'NOT_DETECTED')
          );
          if (ruleHasDefect) return false;
          if (
            f.candidateStatus !== FindingCandidateStatus.COMPLIANT_CANDIDATE &&
            f.status !== FindingStatus.VERIFIED_COMPLIANT
          ) {
            return false;
          }
        } else {
          if (
            f.candidateStatus !== FindingCandidateStatus.COMPLIANT_CANDIDATE &&
            f.status !== FindingStatus.VERIFIED_COMPLIANT
          ) {
            return false;
          }
        }
      } else if (filterTab === 'VERIFIED') {
        if (!f.isVerified && !isCleanPass) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = f.ruleId.toLowerCase().includes(q);
        const matchRef = f.ruleReference.toLowerCase().includes(q);
        const matchDecl = f.declarationType.toLowerCase().includes(q);
        const matchTitle = formatRuleTitle(f).toLowerCase().includes(q);
        const matchReq = f.requirementDescription.toLowerCase().includes(q);
        const matchObs = (f.aiObservation.extractedValue || '').toLowerCase().includes(q);
        if (!matchId && !matchRef && !matchDecl && !matchTitle && !matchReq && !matchObs) {
          return false;
        }
      }

      return true;
    });
  }, [findings, filterTab, searchQuery]);

  // Split findings into Attention-Required vs All-Clear Passed
  // Under Legal Metrology Rules: If ANY specimen for a statutory rule has a defect or review requirement,
  // the ENTIRE rule belongs in Attention-Required (Action Cards) and is never split into the passed checklist.
  const { attentionFindings, passedFindings } = useMemo(() => {
    // 1. Group active filtered findings by statutory rule
    const ruleGroups = new Map<string, ComplianceFindingData[]>();
    filteredFindings.forEach((f) => {
      const key = f.ruleId || f.ruleReference;
      if (!ruleGroups.has(key)) {
        ruleGroups.set(key, []);
      }
      ruleGroups.get(key)!.push(f);
    });

    const attention: ComplianceFindingData[] = [];
    const passed: ComplianceFindingData[] = [];

    // 2. Evaluate rule by rule across all specimens
    ruleGroups.forEach((groupItems) => {
      const ruleHasAttention = groupItems.some((f) => {
        return (
          f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
          f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
          f.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW ||
          f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW ||
          f.aiObservation.state === 'NOT_DETECTED' ||
          f.aiObservation.confidence === 'LOW' ||
          f.isCorrected
        );
      });

      if (ruleHasAttention) {
        // Under Legal Metrology rules, all specimens for a defective/review rule stay together
        attention.push(...groupItems);
      } else {
        // Clean passing rule (all specimens compliant)
        passed.push(...groupItems);
      }
    });

    return { attentionFindings: attention, passedFindings: passed };
  }, [filteredFindings]);

  // Unique rule count for attention findings in multi-sample view
  const uniqueAttentionRuleCount = useMemo(() => {
    return new Set(attentionFindings.map((f) => f.ruleId || f.ruleReference)).size;
  }, [attentionFindings]);

  // Render an individual Finding Card with 1-Click Verification Toolbar
  const renderFindingCard = (finding: ComplianceFindingData) => {
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

    const isFindingProcessing = verifyingFindingId === finding._id;

    return (
      <Card
        key={finding._id}
        className={`border transition-all duration-150 ${
          finding.isVerified
            ? 'border-slate-200 bg-white shadow-2xs'
            : finding.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE
            ? 'border-rose-200 bg-rose-50/20 shadow-xs ring-1 ring-rose-200/50'
            : finding.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW
            ? 'border-amber-200 bg-amber-50/20 shadow-xs ring-1 ring-amber-200/50'
            : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Card Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {formatRuleTitle(finding)}
                </h3>
                <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {finding.ruleReference}
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  Unit: {finding.sampleCode}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {finding.ruleFamily.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {finding.requirementDescription}
              </p>
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
                  {finding.inspectorVerification.verifiedValue ||
                    finding.aiObservation.extractedValue || (
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
              {finding.aiObservation.evidenceImageIds &&
                finding.aiObservation.evidenceImageIds.length > 0 &&
                currentInspection && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Attached Photo Evidence:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {finding.aiObservation.evidenceImageIds.map((imgId: string, idx: number) => {
                        const imgUrl = getSampleImageUrl(
                          currentInspection._id,
                          finding.sampleId,
                          imgId
                        );
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

            {/* Right Column: Statutory Legal Requirement Layer */}
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
                    {finding.ruleEngineResult.reason ||
                      'Evaluated against statutory package criteria.'}
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
          {finding.isVerified ? (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100">
                    Officer Determination Recorded
                  </span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {finding.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Verified by:{' '}
                  <strong className="text-slate-200">
                    {finding.inspectorVerification.verifiedByName ||
                      finding.inspectorVerification.verifiedBy}
                  </strong>{' '}
                  on{' '}
                  {finding.inspectorVerification.verifiedAt
                    ? new Date(
                        finding.inspectorVerification.verifiedAt
                      ).toLocaleString('en-IN')
                    : 'Recorded'}
                </p>
                {finding.inspectorVerification.notes && (
                  <p className="text-xs text-slate-300 italic pt-0.5">
                    Note: "{finding.inspectorVerification.notes}"
                  </p>
                )}
              </div>

              {/* Direct Quick Re-verify / Update for Inspector */}
              {!isController && (
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFindingProcessing}
                    className={`text-xs font-semibold ${
                      finding.status === FindingStatus.VERIFIED_NON_COMPLIANT
                        ? 'bg-slate-800 border-slate-700 text-emerald-300 hover:bg-emerald-950 hover:border-emerald-700 hover:text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-rose-300 hover:bg-rose-950 hover:border-rose-700 hover:text-rose-200'
                    }`}
                    onClick={() =>
                      handleDirectVerify(
                        finding,
                        finding.status === FindingStatus.VERIFIED_NON_COMPLIANT
                          ? InspectorVerificationDecision.VERIFIED_COMPLIANT
                          : InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                      )
                    }
                  >
                    {isFindingProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : finding.status === FindingStatus.VERIFIED_NON_COMPLIANT ? (
                      'Change to Compliant'
                    ) : (
                      'Change to Violation'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
                    onClick={() => handleOpenCorrection(finding)}
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit Notes
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Direct 1-Click Inspector Action Toolbar */
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {isController ? (
                  <div className="text-xs text-slate-400 italic">
                    Verification action restricted to assigned field inspector.
                  </div>
                ) : (
                  <>
                    {/* Direct 1-Click Verify Compliant */}
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isFindingProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                      icon={
                        isFindingProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() =>
                        handleDirectVerify(
                          finding,
                          InspectorVerificationDecision.VERIFIED_COMPLIANT
                        )
                      }
                    >
                      Verify Compliant
                    </Button>

                    {/* Direct 1-Click Flag Non-Compliant */}
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isFindingProcessing}
                      className="text-xs font-semibold shadow-2xs"
                      icon={
                        isFindingProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() =>
                        handleDirectVerify(
                          finding,
                          InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                        )
                      }
                    >
                      Flag Violation
                    </Button>

                    {/* Direct 1-Click Action Required */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFindingProcessing}
                      className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs"
                      icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      onClick={() =>
                        handleDirectVerify(
                          finding,
                          InspectorVerificationDecision.VERIFIED_REQUIRES_FURTHER_REVIEW
                        )
                      }
                    >
                      Action Required
                    </Button>
                  </>
                )}
              </div>

              {/* Right: Correct Value & Add Notes Button */}
              {!isController && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
                    onClick={() => handleOpenCorrection(finding)}
                    className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    Correct Value / Notes
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render a Grouped Action Card for "All Samples" View
  const renderGroupedFindingCard = (group: ComplianceFindingData[]) => {
    const primary = group[0];
    const isRuleProcessing = verifyingRuleId === primary.ruleId;
    const isGroupVerified = group.every((f) => f.isVerified);
    const hasViolation = group.some(
      (f) =>
        f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
        f.status === FindingStatus.VERIFIED_NON_COMPLIANT
    );
    const sampleCodes = group.map((f) => f.sampleCode);
    const isAllSamplesAffected = samples.length > 0 && group.length >= samples.length;

    const defectiveFindings = group.filter(
      (f) =>
        f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE ||
        f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
        f.aiObservation.state === 'NOT_DETECTED'
    );
    const defectiveCount = defectiveFindings.length;
    const isAllVerifiedCompliant =
      isGroupVerified && group.every((f) => f.status === FindingStatus.VERIFIED_COMPLIANT);
    const hasVerifiedViolation =
      group.some((f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT);

    return (
      <Card
        key={primary.ruleId}
        className={`border transition-all duration-150 ${
          isGroupVerified
            ? hasVerifiedViolation
              ? 'border-rose-300 bg-rose-50/10 shadow-xs ring-1 ring-rose-200/40'
              : 'border-slate-200 bg-white shadow-2xs'
            : hasViolation
            ? 'border-rose-300 bg-rose-50/20 shadow-xs ring-1 ring-rose-200/50'
            : 'border-amber-300 bg-amber-50/20 shadow-xs ring-1 ring-amber-200/50'
        }`}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {formatRuleTitle(primary)}
                </h3>
                <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {primary.ruleReference}
                </span>

                {/* Affected Scope Badge */}
                {defectiveCount > 0 && !isGroupVerified ? (
                  <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    {defectiveCount} of {samples.length} Specimens Defective ({defectiveFindings.map((s) => s.sampleCode.split('-').pop()).join(', ')})
                  </span>
                ) : isAllSamplesAffected ? (
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    All {samples.length} Specimens ({sampleCodes.map((s) => s.split('-').pop()).join(', ')})
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {group.length} of {samples.length} Specimens ({sampleCodes.map((s) => s.split('-').pop()).join(', ')})
                  </span>
                )}

                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {primary.ruleFamily.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {primary.requirementDescription}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {isGroupVerified ? (
                hasVerifiedViolation ? (
                  <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
                    Verified Violation ({group.filter((f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT).length}/{group.length})
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                    Verified Compliant ({group.filter((f) => f.isVerified).length}/{group.length})
                  </Badge>
                )
              ) : hasViolation ? (
                <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
                  Potential Non-Compliance ({defectiveCount > 0 ? `${defectiveCount} of ${group.length} Defective` : 'Batch'})
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                  Requires Review
                </Badge>
              )}
            </div>
          </div>

          {/* Statutory Legal Requirement Strip */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span><strong>Statutory Criteria:</strong> {primary.requirementDescription}</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono flex-shrink-0">
              {primary.ruleEngineResult?.reason && (
                <span>Reason: {primary.ruleEngineResult.reason}</span>
              )}
              <span>•</span>
              <span>DB v{primary.ruleEngineResult?.ruleDatabaseVersion || '1.0'}</span>
            </div>
          </div>

          {/* Multi-Specimen Observation Comparison Grid */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Specimen Package Observations ({group.length} Units)</span>
              <span className="text-[10px] font-normal text-slate-400">
                Side-by-side comparison across sampled units
              </span>
            </div>

            <div className={`grid grid-cols-1 ${group.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
              {group.map((f) => {
                const obsValue = f.inspectorVerification.verifiedValue || f.aiObservation.extractedValue;
                const conf = f.aiObservation.confidence;
                const hasImages = f.aiObservation.evidenceImageIds && f.aiObservation.evidenceImageIds.length > 0;

                return (
                  <div
                    key={f._id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      f.isVerified
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE
                        ? 'bg-rose-50/30 border-rose-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Unit: {f.sampleCode}
                      </span>
                      {conf && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            conf === 'HIGH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : conf === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          Conf: {conf}
                        </span>
                      )}
                    </div>

                    {/* Observed Value */}
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5">Observed Value:</div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-xs font-semibold text-slate-800 break-words min-h-[34px]">
                        {obsValue || <span className="text-slate-400 italic">No declaration detected</span>}
                      </div>
                    </div>

                    {/* Thumbnail */}
                    {hasImages && currentInspection && (
                      <div className="pt-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Evidence:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {f.aiObservation.evidenceImageIds.map((imgId: string, idx: number) => {
                            const imgUrl = getSampleImageUrl(currentInspection._id, f.sampleId, imgId);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    url: imgUrl,
                                    title: `${formatRuleTitle(primary)} (${primary.ruleReference})`,
                                    subtitle: `Unit: ${f.sampleCode} • Observed: ${obsValue || 'None'}`,
                                  })
                                }
                                className="group relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
                              >
                                <img
                                  src={imgUrl}
                                  alt="Specimen thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Per-specimen status footer */}
                    <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-100">
                      <span className="text-slate-500">Status:</span>
                      {f.isVerified ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {f.status === FindingStatus.VERIFIED_COMPLIANT ? 'Compliant' : 'Violation'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Toolbar / Banner */}
          {isGroupVerified ? (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100">
                    Officer Determination Recorded for All {group.length} Specimens
                  </span>
                  <span className="text-slate-600">&bull;</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      hasVerifiedViolation ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {hasVerifiedViolation
                      ? 'VERIFIED_NON_COMPLIANT (Statutory Violation)'
                      : 'VERIFIED_COMPLIANT (Passed)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Recorded across specimens {sampleCodes.map((s) => s.split('-').pop()).join(', ')}
                </p>
              </div>

              {!isController && (
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRuleProcessing}
                    className={`text-xs font-semibold ${
                      hasVerifiedViolation
                        ? 'bg-slate-800 border-slate-700 text-emerald-300 hover:bg-emerald-950 hover:border-emerald-700 hover:text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-rose-300 hover:bg-rose-950 hover:border-rose-700 hover:text-rose-200'
                    }`}
                    onClick={() =>
                      handleGroupDirectVerify(
                        group,
                        hasVerifiedViolation
                          ? InspectorVerificationDecision.VERIFIED_COMPLIANT
                          : InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                      )
                    }
                  >
                    {isRuleProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : hasVerifiedViolation ? (
                      'Change All to Compliant'
                    ) : (
                      'Change All to Violation'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
                    onClick={() => handleOpenCorrection(primary)}
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit Notes
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {!isController && (
                  <>
                    {/* 1-Click Verify All Compliant */}
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isRuleProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                      icon={
                        isRuleProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() =>
                        handleGroupDirectVerify(group, InspectorVerificationDecision.VERIFIED_COMPLIANT)
                      }
                    >
                      Verify All Compliant ({group.length} Units)
                    </Button>

                    {/* 1-Click Flag All as Violation */}
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isRuleProcessing}
                      className="text-xs font-semibold shadow-2xs"
                      icon={
                        isRuleProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() =>
                        handleGroupDirectVerify(group, InspectorVerificationDecision.VERIFIED_NON_COMPLIANT)
                      }
                    >
                      Flag Violation for Batch ({group.length} Units)
                    </Button>

                    {/* Edit Notes */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                      onClick={() => handleOpenCorrection(primary)}
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit Notes
                    </Button>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Applies determination to all {group.length} specimens at once.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render List of Findings: Grouped if in All-Samples view with multiple samples, else individual cards
  const renderFindingList = (items: ComplianceFindingData[]) => {
    const isMultiSampleView = selectedSampleId === 'ALL' && samples.length > 1;

    if (isMultiSampleView) {
      const groupsMap = new Map<string, ComplianceFindingData[]>();
      items.forEach((item) => {
        const key = item.ruleId || item.ruleReference;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(item);
      });

      return (
        <div className="space-y-4">
          {Array.from(groupsMap.values()).map(renderGroupedFindingCard)}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map(renderFindingCard)}
      </div>
    );
  };

  // Render Compact 1-Line Statutory Checklist Table for Passing / Compliant Rules
  const renderChecklistTable = (
    items: ComplianceFindingData[],
    title: string = 'Statutory Requirements Checklist',
    subtitle: string = 'Passing declarations verified compliant under Legal Metrology Rules',
    showBatchButton: boolean = true
  ) => {
    if (items.length === 0) return null;

    const unverifiedCount = items.filter((f) => !f.isVerified).length;
    const isMultiSampleView = selectedSampleId === 'ALL' && samples.length > 1;

    // Group passing items by statutory rule when viewing all samples to eliminate repetitive duplicate rows
    const groupedItems = isMultiSampleView
      ? (() => {
          const map = new Map<
            string,
            {
              key: string;
              primaryFinding: ComplianceFindingData;
              allFindings: ComplianceFindingData[];
              sampleCodes: string[];
              uniqueObservedValues: string[];
              isAllVerified: boolean;
              allEvidenceIds: string[];
            }
          >();

          for (const finding of items) {
            const groupKey = finding.ruleId || finding.ruleReference;
            const existing = map.get(groupKey);
            const val = (
              finding.inspectorVerification.verifiedValue ||
              finding.aiObservation.extractedValue ||
              ''
            ).trim();
            const evidence = finding.aiObservation.evidenceImageIds || [];

            if (existing) {
              existing.allFindings.push(finding);
              if (!existing.sampleCodes.includes(finding.sampleCode)) {
                existing.sampleCodes.push(finding.sampleCode);
              }
              if (val && !existing.uniqueObservedValues.includes(val)) {
                existing.uniqueObservedValues.push(val);
              }
              if (!finding.isVerified) {
                existing.isAllVerified = false;
              }
              for (const ev of evidence) {
                if (!existing.allEvidenceIds.includes(ev)) {
                  existing.allEvidenceIds.push(ev);
                }
              }
            } else {
              map.set(groupKey, {
                key: groupKey,
                primaryFinding: finding,
                allFindings: [finding],
                sampleCodes: [finding.sampleCode],
                uniqueObservedValues: val ? [val] : [],
                isAllVerified: finding.isVerified,
                allEvidenceIds: [...evidence],
              });
            }
          }

          return Array.from(map.values());
        })()
      : [];

    const totalDisplayCount = isMultiSampleView ? groupedItems.length : items.length;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header Strip */}
        <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {totalDisplayCount} {isMultiSampleView ? 'Statutory Rules Satisfied' : 'Rules'}
              </span>
              {isMultiSampleView && (
                <span className="text-[11px] font-medium text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                  Consolidated across all {samples.length} specimens
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>

          {showBatchButton && unverifiedCount > 0 && !isController && (
            <Button
              variant="outline"
              size="sm"
              disabled={isVerifyingAllPassed}
              onClick={() => handleVerifyBatch(items)}
              className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs shadow-2xs font-semibold self-start sm:self-auto"
              icon={
                isVerifyingAllPassed ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )
              }
            >
              {isVerifyingAllPassed
                ? 'Recording...'
                : `Batch Confirm All (${unverifiedCount})`}
            </Button>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-600 font-bold uppercase bg-slate-100/70 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Statutory Declaration Parameter</th>
                <th className="py-3 px-4">Observed on Package</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-3">Evaluation Status</th>
                <th className="py-3 px-3 text-center">Evidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {isMultiSampleView
                ? groupedItems.map((group) => {
                    const primary = group.primaryFinding;
                    const isProcessing = group.allFindings.some(
                      (f) => verifyingFindingId === f._id
                    );
                    const hasEvidence = group.allEvidenceIds.length > 0;

                    return (
                      <tr
                        key={group.key}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Plain English Parameter Name & Citation */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {formatRuleTitle(primary)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {primary.ruleReference}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span
                                className="truncate max-w-xs"
                                title={primary.requirementDescription}
                              >
                                {primary.requirementDescription}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Observed Value on Package */}
                        <td className="py-3 px-4">
                          {group.uniqueObservedValues.length > 0 ? (
                            <span
                              className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block max-w-xs truncate"
                              title={group.uniqueObservedValues.join(' | ')}
                            >
                              {group.uniqueObservedValues.join(' | ')}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium italic text-[11px]">
                              Compliant standard format
                            </span>
                          )}
                        </td>

                        {/* Sample Unit Coverage */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px] inline-block"
                            title={`Applicable to: ${group.sampleCodes.join(', ')}`}
                          >
                            All {group.sampleCodes.length} Specimens
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {group.sampleCodes
                              .map((c) => c.split('-').pop())
                              .join(', ')}
                          </div>
                        </td>

                        {/* Evaluation Status Badge */}
                        <td className="py-3 px-3">
                          <Badge
                            variant={group.isAllVerified ? 'success' : 'info'}
                            size="sm"
                            icon={
                              group.isAllVerified ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : undefined
                            }
                          >
                            {group.isAllVerified
                              ? 'Verified Compliant'
                              : 'Compliant Candidate'}
                          </Badge>
                        </td>

                        {/* Photo Evidence Preview */}
                        <td className="py-3 px-3 text-center">
                          {hasEvidence && currentInspection ? (
                            <button
                              type="button"
                              onClick={() => {
                                const imgId = group.allEvidenceIds[0];
                                const url = getSampleImageUrl(
                                  currentInspection._id,
                                  primary.sampleId,
                                  imgId
                                );
                                setLightboxImage({
                                  url,
                                  title: `${formatRuleTitle(primary)} (${primary.ruleReference})`,
                                  subtitle: `Observed: ${
                                    group.uniqueObservedValues.join(' | ') || 'Compliant'
                                  } • All ${group.sampleCodes.length} Specimens`,
                                });
                              }}
                              title="View Attached Evidence Photo"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer transition-colors inline-flex items-center gap-1"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-semibold">
                                {group.allEvidenceIds.length}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!group.isAllVerified && !isController ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleVerifyBatch(group.allFindings)}
                                className="text-[11px] py-1 px-2.5 bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors shadow-2xs font-semibold"
                                icon={
                                  isProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  )
                                }
                              >
                                {isProcessing ? 'Saving...' : 'Verify All'}
                              </Button>
                            ) : (
                              <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold mr-1">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Auto-Recorded
                              </span>
                            )}
                            {!isController && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleGroupDirectVerify(
                                      group.allFindings,
                                      InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                                    )
                                  }
                                  className="text-[10px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-semibold transition-colors"
                                  icon={<XCircle className="w-3 h-3 text-rose-500" />}
                                  title="Flag rule as violation across all specimens"
                                >
                                  Flag Violation
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrection(primary)}
                                  title="Edit observed value or notes"
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : items.map((finding) => {
                    const isProcessing = verifyingFindingId === finding._id;
                    const hasEvidence =
                      finding.aiObservation.evidenceImageIds &&
                      finding.aiObservation.evidenceImageIds.length > 0;

                    return (
                      <tr
                        key={finding._id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Plain English Parameter Name & Citation */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {formatRuleTitle(finding)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {finding.ruleReference}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span
                                className="truncate max-w-xs"
                                title={finding.requirementDescription}
                              >
                                {finding.requirementDescription}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Observed Value on Package */}
                        <td className="py-3 px-4">
                          {finding.inspectorVerification.verifiedValue ||
                          finding.aiObservation.extractedValue ? (
                            <span
                              className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block max-w-xs truncate"
                              title={
                                finding.inspectorVerification.verifiedValue ||
                                finding.aiObservation.extractedValue ||
                                ''
                              }
                            >
                              {finding.inspectorVerification.verifiedValue ||
                                finding.aiObservation.extractedValue}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium italic text-[11px]">
                              Compliant standard format
                            </span>
                          )}
                        </td>

                        {/* Sample Unit */}
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {finding.sampleCode}
                        </td>

                        {/* Evaluation Status Badge */}
                        <td className="py-3 px-3">
                          <Badge
                            variant={finding.isVerified ? 'success' : 'info'}
                            size="sm"
                            icon={
                              finding.isVerified ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : undefined
                            }
                          >
                            {finding.isVerified
                              ? 'Verified Compliant'
                              : 'Compliant Candidate'}
                          </Badge>
                        </td>

                        {/* Photo Evidence Preview */}
                        <td className="py-3 px-3 text-center">
                          {hasEvidence && currentInspection ? (
                            <button
                              type="button"
                              onClick={() => {
                                const imgId =
                                  finding.aiObservation.evidenceImageIds[0];
                                const url = getSampleImageUrl(
                                  currentInspection._id,
                                  finding.sampleId,
                                  imgId
                                );
                                setLightboxImage({
                                  url,
                                  title: `${formatRuleTitle(finding)} (${finding.ruleReference})`,
                                  subtitle: `Observed: ${
                                    finding.aiObservation.extractedValue ||
                                    'Compliant'
                                  } • Unit: ${finding.sampleCode}`,
                                });
                              }}
                              title="View Attached Evidence Photo"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer transition-colors inline-flex items-center gap-1"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-semibold">
                                {finding.aiObservation.evidenceImageIds.length}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>

                        {/* Quick 1-Click Action & Edit */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!finding.isVerified && !isController && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleDirectVerify(
                                    finding,
                                    InspectorVerificationDecision.VERIFIED_COMPLIANT
                                  )
                                }
                                className="text-[11px] py-1 px-2.5 bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors shadow-2xs font-semibold"
                                icon={
                                  isProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  )
                                }
                              >
                                {isProcessing ? 'Saving...' : 'Verify'}
                              </Button>
                            )}
                            {finding.isVerified && (
                              <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold mr-1">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Auto-Recorded
                              </span>
                            )}
                            {!isController && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleDirectVerify(
                                      finding,
                                      InspectorVerificationDecision.VERIFIED_NON_COMPLIANT
                                    )
                                  }
                                  className="text-[10px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-semibold transition-colors"
                                  icon={<XCircle className="w-3 h-3 text-rose-500" />}
                                  title="Flag finding as non-compliant violation"
                                >
                                  Flag Violation
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrection(finding)}
                                  title="Edit observed value or notes"
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
      {(telemetry || findings.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Findings */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Checks
            </span>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {kpiMetrics.totalChecks}
            </div>
            <p className="text-[10px] text-slate-400">Statutory parameters</p>
          </div>

          {/* Verification Progress */}
          <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Verified / Cleared
              </span>
              <span className="text-xs font-mono font-bold text-blue-800">
                {kpiMetrics.clearedPercent}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-blue-900 font-mono">
              {kpiMetrics.clearedCount} / {kpiMetrics.totalChecks}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  kpiMetrics.clearedPercent === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${kpiMetrics.clearedPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              {kpiMetrics.passedCleanCount} passed + {kpiMetrics.verifiedAttentionCount} verified
            </p>
          </div>

          {/* Compliant Candidates */}
          <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Compliant
            </span>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              {kpiMetrics.compliantTotal}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">
              {kpiMetrics.passedCleanCount} passed + {kpiMetrics.compliantTotal - kpiMetrics.passedCleanCount} verified
            </p>
          </div>

          {/* Potential Non-Compliances */}
          <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Non-Compliance
            </span>
            <div className="text-xl font-extrabold text-rose-700 font-mono">
              {kpiMetrics.nonComplianceTotal}
            </div>
            <p className="text-[10px] text-rose-600">
              {findings.filter((f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT).length} flagged violations
            </p>
          </div>

          {/* Requires Review */}
          <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Requires Review
            </span>
            <div className="text-xl font-extrabold text-amber-700 font-mono">
              {kpiMetrics.requiresReviewTotal}
            </div>
            <p className="text-[10px] text-amber-600">Manual inspection</p>
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
            All Checks ({kpiMetrics.totalChecks})
          </button>
          <button
            onClick={() => setFilterTab('POTENTIAL_NON_COMPLIANCE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'POTENTIAL_NON_COMPLIANCE'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Violations & Discrepancies ({kpiMetrics.nonComplianceTotal})
          </button>
          <button
            onClick={() => setFilterTab('REQUIRES_INSPECTOR_REVIEW')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'REQUIRES_INSPECTOR_REVIEW'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Requires Review ({kpiMetrics.requiresReviewTotal})
          </button>
          <button
            onClick={() => setFilterTab('COMPLIANT_CANDIDATE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'COMPLIANT_CANDIDATE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Compliant ({kpiMetrics.compliantTotal})
          </button>
          <button
            onClick={() => setFilterTab('VERIFIED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'VERIFIED'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Verified / Cleared ({kpiMetrics.clearedCount})
          </button>
        </div>

        {/* Text Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search statutory parameters, rules, declarations..."
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
          <div className="space-y-6">
            {/* Smart Option 3 Partition: Action Cards for defects/reviews + Compact Checklist Table for passed */}
            {filterTab === 'ALL' && !searchQuery.trim() ? (
              attentionFindings.length === 0 ? (
                /* All Statutory Rules Compliant / All-Clear State */
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-blue-50/30 border border-emerald-200 text-center space-y-4 shadow-xs">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                        All Clear &bull; 100% Compliant
                      </div>
                      <h3 className="text-lg font-bold text-emerald-950">
                        All {passedFindings.length} Statutory Requirements Compliant!
                      </h3>
                      <p className="text-xs text-emerald-900 max-w-md mx-auto leading-relaxed">
                        No package discrepancies, numeral height violations, or missing mandatory declarations were detected for this specimen.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      {passedFindings.some((f) => !f.isVerified) && !isController && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isVerifyingAllPassed}
                          onClick={handleVerifyAllPassed}
                          className="bg-white border-emerald-300 text-emerald-800 text-xs shadow-2xs hover:bg-emerald-50 font-semibold"
                          icon={
                            isVerifyingAllPassed ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          }
                        >
                          {isVerifyingAllPassed
                            ? 'Recording...'
                            : `Confirm & Record All ${passedFindings.filter((f) => !f.isVerified).length} Passed Rules`}
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/inspector/reports')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Proceed to Reports & PDF
                      </Button>
                    </div>
                  </div>

                  {/* Clean Compact Checklist Table */}
                  {renderChecklistTable(
                    passedFindings,
                    'Statutory Requirements Checklist',
                    'All statutory package declarations evaluated compliant under Legal Metrology Rules'
                  )}
                </div>
              ) : (
                /* Attention Required Section + Passed Table */
                <div className="space-y-6">
                  {/* 1. Action Cards for Discrepancies & Non-Compliances */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Action Required: Discrepancies & Potential Non-Compliances{' '}
                          {selectedSampleId === 'ALL' && samples.length > 1
                            ? `(${uniqueAttentionRuleCount} Rules across ${attentionFindings.length} Specimens)`
                            : `(${attentionFindings.length})`}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedSampleId === 'ALL' && samples.length > 1
                          ? `${attentionFindings.filter((f) => f.isVerified).length} of ${attentionFindings.length} unit checks verified`
                          : `${attentionFindings.filter((f) => f.isVerified).length} of ${attentionFindings.length} verified`}
                      </span>
                    </div>

                    {renderFindingList(attentionFindings)}
                  </div>

                  {/* 2. Compact Statutory Checklist Table for Passing Rules */}
                  {passedFindings.length > 0 &&
                    renderChecklistTable(
                      passedFindings,
                      'Compliant Statutory Declarations',
                      `${passedFindings.length} statutory requirements met & evaluated compliant under Legal Metrology Rules`
                    )}
                </div>
              )
            ) : filterTab === 'COMPLIANT_CANDIDATE' ? (
              /* Compliant Candidates Tab: Clean Compact Table */
              renderChecklistTable(
                filteredFindings,
                'Compliant Statutory Declarations',
                'Declarations meeting statutory requirements under Legal Metrology Rules'
              )
            ) : filterTab === 'VERIFIED' ? (
              /* Verified Tab: Violations at top if any, then compact table for verified compliant */
              <div className="space-y-6">
                {(() => {
                  const verifiedViolations = filteredFindings.filter(
                    (f) =>
                      f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
                      f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW
                  );
                  const verifiedPassed = filteredFindings.filter(
                    (f) =>
                      f.status === FindingStatus.VERIFIED_COMPLIANT ||
                      (!f.isVerified && f.candidateStatus === FindingCandidateStatus.COMPLIANT_CANDIDATE)
                  );
                  return (
                    <>
                      {verifiedViolations.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <h3 className="text-sm font-bold text-slate-900">
                              Verified Non-Compliances{' '}
                              {selectedSampleId === 'ALL' && samples.length > 1
                                ? `(${new Set(verifiedViolations.map((f) => f.ruleId)).size} Rules across ${verifiedViolations.length} Specimens)`
                                : `(${verifiedViolations.length})`}
                            </h3>
                          </div>
                          {renderFindingList(verifiedViolations)}
                        </div>
                      )}
                      {verifiedPassed.length > 0 &&
                        renderChecklistTable(
                          verifiedPassed,
                          'Verified Compliant Declarations',
                          'Statutory requirements verified compliant by field inspector'
                        )}
                    </>
                  );
                })()}
              </div>
            ) : searchQuery.trim() ? (
              /* Search Results: Partition into Attention Cards vs Compliant Table */
              <div className="space-y-6">
                {attentionFindings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Discrepancies Matching Search{' '}
                      {selectedSampleId === 'ALL' && samples.length > 1
                        ? `(${uniqueAttentionRuleCount} Rules across ${attentionFindings.length} Specimens)`
                        : `(${attentionFindings.length})`}
                    </h3>
                    {renderFindingList(attentionFindings)}
                  </div>
                )}
                {passedFindings.length > 0 &&
                  renderChecklistTable(
                    passedFindings,
                    'Compliant Declarations Matching Search',
                    `Found ${passedFindings.length} matching parameters`
                  )}
              </div>
            ) : (
              /* Potential Non-Compliance or Requires Review Tabs */
              renderFindingList(filteredFindings)
            )}
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

              {/* Apply to all specimens checkbox when in All-Samples view */}
              {selectedSampleId === 'ALL' && samples.length > 1 && (
                <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="applyToAll"
                    checked={applyCorrectionToGroup}
                    onChange={(e) => setApplyCorrectionToGroup(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="applyToAll" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Apply this correction & notes to all {samples.length} specimens for this rule
                  </label>
                </div>
              )}
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
