import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  Package,
  Cpu,
  Scale,
  History,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  BadgeAlert,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchHistoricalInspectionDetail,
  HistoricalInspectionDetail,
  HistoricalImageMetadata,
  HistoricalFinding,
  HistoricalAuditEvent,
} from '../../services/historyService';

const PACKAGE_CONTEXT_LABELS: Record<string, string> = {
  RETAIL_PACKAGE: 'Retail Package',
  WHOLESALE_PACKAGE: 'Wholesale Package',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE: 'Industrial / Institutional Package',
  IMPORTED_PACKAGE: 'Imported Package',
  EXPORT_PACKAGE: 'Export Package',
};

type TabType = 'summary' | 'technical' | 'audit';

export const InspectionHistoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalInspectionDetail | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Selected sample for filtering observations/findings
  const [selectedSampleId, setSelectedSampleId] = useState<string>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchHistoricalInspectionDetail(id)
      .then((res) => {
        setData(res);
      })
      .catch((err: any) => {
        console.error('Failed to load historical inspection detail:', err);
        setError(err.message || 'Failed to load inspection record.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading immutable audit record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
          title="Inspection Record Not Found"
          description={error || 'Unable to locate the specified historical inspection record.'}
          actionText="Back to History"
          onAction={() => navigate('/inspector/history')}
        />
      </div>
    );
  }

  const { inspection, samples, extractions, ruleEvaluations, findings, auditTrail, summary } = data;

  const filteredFindings =
    selectedSampleId === 'ALL'
      ? findings
      : findings.filter((f) => f.sampleId === selectedSampleId);

  const formatDateTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };

  const pdfUrl = location.pathname.startsWith('/controller')
    ? `/controller/generate-pdf/${inspection._id}`
    : `/inspector/generate-pdf/${inspection._id}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={() => navigate(pdfUrl)}
          >
            Export Official PDF
          </Button>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Case Archive
            </span>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {inspection.inspectionNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Case Identity & Metadata Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold text-slate-900">{inspection.commodity}</h1>
              <Badge variant={inspection.status === 'COMPLETED' ? 'success' : 'warning'}>
                {inspection.status}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1.5">
              {inspection.brand && (
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Brand: <strong className="text-slate-700">{inspection.brand}</strong></span>
                </span>
              )}
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{inspection.location}{inspection.market ? ` (${inspection.market})` : ''}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Initiated: {formatDateTime(inspection.createdAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Statutory Context</div>
              <div className="text-xs font-bold text-slate-800">
                {PACKAGE_CONTEXT_LABELS[inspection.packageContext] || inspection.packageContext}
              </div>
            </div>
          </div>
        </div>

        {/* Compact KPI Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
            <div className="text-[10px] text-slate-500 font-medium">Physical Samples</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {summary.samplesVerified} / {summary.totalSamples} Units
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
            <div className="text-[10px] text-slate-500 font-medium">Findings Verified</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {summary.percentVerified}% ({summary.verifiedFindings}/{summary.totalFindings})
            </div>
          </div>

          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/70">
            <div className="text-[10px] text-emerald-700 font-medium">Compliance Rate</div>
            <div className="text-base font-bold text-emerald-700 mt-0.5">
              {summary.overallComplianceRate}%
            </div>
          </div>

          <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-200/70">
            <div className="text-[10px] text-red-700 font-medium">Violations</div>
            <div className="text-base font-bold text-red-700 mt-0.5">
              {summary.nonCompliantFindings} Detected
            </div>
          </div>

          <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/70">
            <div className="text-[10px] text-amber-700 font-medium">Officer Corrections</div>
            <div className="text-base font-bold text-amber-700 mt-0.5">
              {summary.correctedObservationsCount} Corrected
            </div>
          </div>

          <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200/70">
            <div className="text-[10px] text-blue-700 font-medium">Audit Status</div>
            <div className="text-xs font-bold text-blue-700 mt-1 flex items-center space-x-1">
              {summary.isFullyAudited ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fully Audited</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Final</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3-TAB EXECUTIVE NAVIGATION BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>1. Summary & Findings</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${
                activeTab === 'summary'
                  ? 'bg-blue-700 text-blue-100'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {summary.totalFindings}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technical')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'technical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2. AI & Rule Engine</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${
                activeTab === 'technical'
                  ? 'bg-blue-700 text-blue-100'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              DB v1.0
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>3. Audit Trail & Log</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${
                activeTab === 'audit'
                  ? 'bg-blue-700 text-blue-100'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {auditTrail.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUMMARY & FINDINGS (DEFAULT EXECUTIVE VIEW)                        */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Pillar 1: Package Samples & Photographic Evidence */}
          <Card>
            <CardHeader
              title="Pillar 1 — Original Package Evidence & Samples"
              subtitle="Physical sample units registered for inspection and photographic evidence availability"
            />
            <CardContent className="p-5 space-y-4">
              {samples.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No samples registered for this inspection.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {samples.map((sample) => (
                    <div
                      key={sample._id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {sample.sampleCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            Sample Unit #{sample.sampleNumber}
                          </span>
                        </div>
                        <Badge variant={sample.status === 'VERIFIED' ? 'success' : 'neutral'}>
                          {sample.status}
                        </Badge>
                      </div>

                      {sample.notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                          <strong>Notes:</strong> {sample.notes}
                        </p>
                      )}

                      {/* Image Evidence Gallery */}
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center space-x-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Package Photographs ({sample.images.length})</span>
                        </div>

                        {sample.images.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No images captured for this unit.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {sample.images.map((img: HistoricalImageMetadata) => (
                              <div
                                key={img.imageId}
                                className="bg-white p-2 rounded-lg border border-slate-200 space-y-1 text-center"
                              >
                                {img.availabilityState === 'AVAILABLE' && img.streamUrl ? (
                                  <div
                                    className="w-full h-24 bg-slate-100 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90"
                                    onClick={() => setPreviewImage(img.streamUrl)}
                                  >
                                    <img
                                      src={img.streamUrl}
                                      alt={`Evidence #${img.sequence}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full h-24 bg-amber-50 border border-amber-200 rounded flex flex-col items-center justify-center p-2 text-center">
                                    <BadgeAlert className="w-5 h-5 text-amber-500 mb-1" />
                                    <span className="text-[9px] font-bold text-amber-800 leading-tight">
                                      Evidence Unavailable
                                    </span>
                                    <span className="text-[8px] text-amber-600 mt-0.5">
                                      (Lifecycle Expired)
                                    </span>
                                  </div>
                                )}

                                <div className="text-[10px] font-mono text-slate-600 font-semibold truncate">
                                  Photo #{img.sequence}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  {Math.round(img.sizeBytes / 1024)} KB · {img.mimeType.split('/')[1]?.toUpperCase()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pillars 4 & 5: Inspector Correction & Statutory Verification Record */}
          <Card>
            <CardHeader
              title="Pillars 4 & 5 — Inspector Correction & Statutory Verification Record"
              subtitle="Officer-verified compliance determinations with side-by-side comparison of original AI extraction vs officer-verified values"
              action={
                samples.length > 1 ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">Filter Sample:</span>
                    <select
                      value={selectedSampleId}
                      onChange={(e) => setSelectedSampleId(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Samples ({samples.length})</option>
                      {samples.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.sampleCode} (#{s.sampleNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : undefined
              }
            />
            <CardContent className="p-0">
              {filteredFindings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No compliance findings recorded for the selected sample scope.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Rule ID & Ref</th>
                        <th className="py-3 px-4">Statutory Requirement</th>
                        <th className="py-3 px-4">Original AI Extraction</th>
                        <th className="py-3 px-4">Verified / Corrected Value</th>
                        <th className="py-3 px-4">Decision</th>
                        <th className="py-3 px-4">Officer Notes</th>
                        <th className="py-3 px-4">Verified By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFindings.map((f: HistoricalFinding) => {
                        const isCorrected = f.isCorrected || f.inspectorVerification?.isCorrected;
                        const aiVal = f.aiObservation?.extractedValue;
                        const verifiedVal = f.inspectorVerification?.verifiedValue;

                        return (
                          <tr key={f._id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-slate-800 text-xs">{f.ruleId}</div>
                              <div className="text-[10px] text-blue-700 font-medium">{f.ruleReference}</div>
                            </td>

                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-medium text-slate-900">{f.declarationType}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-2">
                                {f.requirementDescription}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block text-[11px]">
                                {aiVal || <span className="text-slate-400 italic">Not Detected</span>}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {isCorrected ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-amber-900 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block text-[11px]">
                                    {verifiedVal}
                                  </div>
                                  <div className="text-[9px] text-amber-700 font-semibold flex items-center space-x-1">
                                    <span>* Officer Corrected</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="font-mono text-slate-700 text-[11px]">
                                  {verifiedVal || aiVal || <span className="text-slate-400">—</span>}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {f.status === 'VERIFIED_COMPLIANT' ? (
                                <Badge variant="success">Verified Compliant</Badge>
                              ) : f.status === 'VERIFIED_NON_COMPLIANT' ? (
                                <Badge variant="danger">Non-Compliant</Badge>
                              ) : f.status === 'VERIFIED_NOT_APPLICABLE' ? (
                                <Badge variant="neutral">Not Applicable</Badge>
                              ) : f.status === 'VERIFIED_REQUIRES_FURTHER_REVIEW' ? (
                                <Badge variant="warning">Requires Review</Badge>
                              ) : (
                                <Badge variant="neutral">{f.candidateStatus || 'PENDING'}</Badge>
                              )}
                            </td>

                            <td className="py-3 px-4 max-w-xs text-slate-600 text-[11px]">
                              {f.inspectorVerification?.notes || <span className="text-slate-400 italic">—</span>}
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              {f.inspectorVerification?.verifiedByName ? (
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {f.inspectorVerification.verifiedByName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatDateTime(f.inspectorVerification.verifiedAt)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Pending</span>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI EXTRACTION & STATUTORY RULE ENGINE                              */}
      {/* ========================================================================= */}
      {activeTab === 'technical' && (
        <div className="space-y-6">
          {/* Pillar 2: AI Multimodal Observation Record */}
          <Card>
            <CardHeader
              title="Pillar 2 — AI Multimodal Declarations Extraction Record"
              subtitle="Immutable raw observations extracted by Gemini multimodal AI model (preserved without modification)"
            />
            <CardContent className="p-5 space-y-4">
              {extractions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No AI multimodal extractions recorded for this case.</p>
              ) : (
                <div className="space-y-4">
                  {extractions.map((ext) => (
                    <div
                      key={ext.extractionId || ext._id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-4 h-4 text-purple-600" />
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {ext.extractionId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Model: <strong className="text-purple-700">{ext.aiModel}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-600 font-semibold">
                            Confidence: {Math.round((ext.overallConfidence || 0) * 100)}%
                          </span>
                          <Badge variant={ext.status === 'COMPLETED' ? 'success' : 'warning'}>
                            {ext.status}
                          </Badge>
                        </div>
                      </div>

                      {ext.warnings && ext.warnings.length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                          <div className="font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Extraction Warnings ({ext.warnings.length}):</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                            {ext.warnings.map((w: string, i: number) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Declarations Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                              <th className="py-2 px-3">Declaration Category</th>
                              <th className="py-2 px-3">Extracted Text</th>
                              <th className="py-2 px-3">Normalized Value</th>
                              <th className="py-2 px-3">Confidence</th>
                              <th className="py-2 px-3">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(ext.declarations || []).map((dec: any, idx: number) => (
                              <tr key={idx} className="hover:bg-white/60">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {dec.category}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-700">
                                  {dec.extractedValue || <span className="text-slate-400">N/A</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">
                                  {dec.normalizedValue || <span className="text-slate-400">—</span>}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {Math.round((dec.confidence || 0) * 100)}%
                                </td>
                                <td className="py-2 px-3">
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                                    {dec.state}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pillar 3: Statutory Rule Engine Evaluation Record */}
          <Card>
            <CardHeader
              title="Pillar 3 — Statutory Rule Engine Evaluation Record"
              subtitle="Evaluation results against the statutory rule database (preserves historical Rule DB Version)"
            />
            <CardContent className="p-5 space-y-4">
              {ruleEvaluations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No rule evaluations recorded for this inspection.</p>
              ) : (
                <div className="space-y-4">
                  {ruleEvaluations.map((rev) => (
                    <div
                      key={rev.evaluation_id || rev._id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <Scale className="w-4 h-4 text-blue-600" />
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {rev.evaluation_id}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            Rule DB v{rev.rule_database_version || '1.0'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Evaluated: {formatDateTime(rev.evaluated_at)}
                        </div>
                      </div>

                      {rev.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500">Total Evaluated:</span>{' '}
                            <strong className="text-slate-800">{rev.summary.total_rules_evaluated}</strong>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500">Applicable:</span>{' '}
                            <strong className="text-blue-700">{rev.summary.applicable_count}</strong>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500">Exempt / Not Applicable:</span>{' '}
                            <strong className="text-slate-600">{rev.summary.not_applicable_count}</strong>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500">Potential Violations:</span>{' '}
                            <strong className="text-red-600">{rev.summary.potential_violations_count}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHAIN OF CUSTODY & CHRONOLOGICAL AUDIT TRAIL                       */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader
            title="Pillar 6 — Chronological Append-Only Audit Trail"
            subtitle="Cryptographically verified event history answering WHO, WHAT, WHEN, ON WHICH ENTITY, and WHAT CHANGED"
          />
          <CardContent className="p-6">
            {auditTrail.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No audit events recorded for this inspection.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
                {auditTrail.map((ev: HistoricalAuditEvent) => {
                  const isExpanded = expandedEventId === ev.auditEventId;

                  return (
                    <div key={ev.auditEventId} className="relative flex items-start space-x-4 pl-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white z-10">
                        <History className="w-4 h-4" />
                      </div>

                      <div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {ev.auditEventId}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{ev.action}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTime(ev.timestamp)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700">{ev.description}</p>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 gap-2">
                          <div className="flex items-center space-x-3">
                            <span>
                              Actor: <strong className="text-slate-800">{ev.actorName}</strong> (
                              <span className="font-mono text-[10px]">{ev.actorRole}</span>)
                            </span>
                            <span>
                              Source: <strong className="text-indigo-700">{ev.source}</strong>
                            </span>
                            <span>
                              Target: <strong className="text-slate-700">{ev.entityType}</strong>
                            </span>
                          </div>

                          {(ev.beforeState || ev.afterState || ev.metadata) && (
                            <button
                              type="button"
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.auditEventId)}
                              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 text-[11px]"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Payload Diff'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Expandable State Diff / Metadata */}
                        {isExpanded && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs font-mono">
                            {ev.beforeState && (
                              <div>
                                <span className="text-red-700 font-bold font-sans text-[10px] uppercase">
                                  Before State:
                                </span>
                                <pre className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] overflow-x-auto text-slate-700">
                                  {JSON.stringify(ev.beforeState, null, 2)}
                                </pre>
                              </div>
                            )}

                            {ev.afterState && (
                              <div>
                                <span className="text-emerald-700 font-bold font-sans text-[10px] uppercase">
                                  After State:
                                </span>
                                <pre className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] overflow-x-auto text-slate-700">
                                  {JSON.stringify(ev.afterState, null, 2)}
                                </pre>
                              </div>
                            )}

                            {ev.metadata && (
                              <div>
                                <span className="text-blue-700 font-bold font-sans text-[10px] uppercase">
                                  Event Metadata:
                                </span>
                                <pre className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] overflow-x-auto text-slate-700">
                                  {JSON.stringify(ev.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2 shadow-2xl space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-xs font-bold text-slate-800">Package Evidence Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage}
              alt="Package Evidence Preview"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
