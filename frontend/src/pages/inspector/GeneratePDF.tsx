import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileDown,
  Printer,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Calendar,
  Building2,
  MapPin,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  BadgeAlert,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchInspectionReportData,
  InspectionReportDTO,
} from '../../services/reportService';
import { fetchInspectionHistory } from '../../services/historyService';
import { generateInspectionPdf } from '../../utils/pdfGenerator';

const PACKAGE_CONTEXT_LABELS: Record<string, string> = {
  RETAIL_PACKAGE: 'Retail Package',
  WHOLESALE_PACKAGE: 'Wholesale Package',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE: 'Industrial / Institutional Package',
  IMPORTED_PACKAGE: 'Imported Package',
  EXPORT_PACKAGE: 'Export Package',
};

export const GeneratePDF: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeInspectionId = paramId || searchParams.get('inspectionId') || '';

  const [availableInspections, setAvailableInspections] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [reportData, setReportData] = useState<InspectionReportDTO | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load available inspections for dropdown if needed
  useEffect(() => {
    setLoadingList(true);
    fetchInspectionHistory({ limit: 50 })
      .then((res) => {
        setAvailableInspections(res.inspections || []);
        // If no active ID, default to first inspection in list
        if (!activeInspectionId && res.inspections.length > 0) {
          setSearchParams({ inspectionId: res.inspections[0]._id });
        }
      })
      .catch((err) => console.error('Failed to load inspection options:', err))
      .finally(() => setLoadingList(false));
  }, []);

  // 2. Load report data whenever activeInspectionId changes
  useEffect(() => {
    if (!activeInspectionId) return;

    setLoadingReport(true);
    setError(null);
    fetchInspectionReportData(activeInspectionId)
      .then((data) => {
        setReportData(data);
      })
      .catch((err: any) => {
        console.error('Failed to load report data:', err);
        setError(err.message || 'Failed to prepare inspection report data.');
      })
      .finally(() => setLoadingReport(false));
  }, [activeInspectionId]);

  const handleSelectInspection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (newId) {
      if (paramId) {
        navigate(`/inspector/generate-pdf/${newId}`);
      } else {
        setSearchParams({ inspectionId: newId });
      }
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) return;
    setGeneratingPdf(true);
    try {
      await generateInspectionPdf(reportData, { download: true });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to synthesize PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Consolidated PDF Report"
        subtitle="Produce official tamper-evident Legal Metrology inspection report with multi-sample evidence"
        badge={<Badge variant="success">Phase 14 jsPDF Engine Active</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Reports', href: '/inspector/reports' },
          { label: 'Generate PDF' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4 text-slate-600" />}
              onClick={() => window.print()}
              disabled={!reportData || loadingReport || generatingPdf}
            >
              Print Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FileDown className="w-4 h-4" />}
              onClick={handleExportPdf}
              disabled={!reportData || loadingReport || generatingPdf}
            >
              {generatingPdf ? 'Synthesizing PDF...' : 'Export Official PDF'}
            </Button>
          </div>
        }
      />

      {/* Case Selector Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Select Inspection Case</span>
              <span className="text-[11px] text-slate-500">
                Choose an inspection to synthesize its consolidated multi-sample report
              </span>
            </div>
          </div>

          <div className="w-full sm:w-96">
            <select
              value={activeInspectionId}
              onChange={handleSelectInspection}
              disabled={loadingList || loadingReport}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            >
              {availableInspections.map((ins) => (
                <option key={ins._id} value={ins._id}>
                  {ins.inspectionNumber} — {ins.commodity} ({ins.status})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error / Content */}
      {loadingReport ? (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
          <p className="text-xs font-medium">Assembling authoritative multi-sample report data...</p>
        </div>
      ) : error ? (
        <div className="p-8">
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
            title="Unable to Load Inspection Report"
            description={error}
          />
        </div>
      ) : !reportData ? (
        <div className="p-8">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-slate-400" />}
            title="No Inspection Selected"
            description="Please select an inspection from the dropdown above to preview and export its official report."
          />
        </div>
      ) : (
        /* Report Document Sheet Preview */
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-300 shadow-lg p-8 sm:p-12 text-slate-800 space-y-8 font-sans">
          {/* Official Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <ShieldCheck className="w-7 h-7 text-sky-300" />
              </div>
              <div>
                <div className="text-base font-black text-slate-900 tracking-wider uppercase">
                  SMART METROLOGY
                </div>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                  Scan. Verify. Comply.
                </div>
                <div className="text-[11px] text-slate-500">
                  Government Legal Metrology (Packaged Commodities) Inspection Report
                </div>
              </div>
            </div>

            <div className="text-right sm:text-right font-mono text-xs">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Report Number</div>
              <div className="font-bold text-sm text-slate-900">{reportData.metadata.reportNumber}</div>
              <div className="text-[11px] text-slate-500">
                Date: {new Date(reportData.metadata.reportGeneratedAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>

          {/* Inspection Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Inspection ID</span>
              <span className="font-mono font-bold text-blue-700">{reportData.metadata.inspectionNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Commodity</span>
              <span className="font-bold text-slate-800">{reportData.metadata.commodity}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Package Context</span>
              <span className="font-bold text-slate-800">
                {PACKAGE_CONTEXT_LABELS[reportData.metadata.packageContext] || reportData.metadata.packageContext}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Sample Scope</span>
              <span className="font-bold text-slate-800">
                {reportData.summary.totalSamplesActual} Individual Samples
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Inspecting Officer</span>
              <span className="font-bold text-slate-800">{reportData.metadata.inspectorName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Badge Number</span>
              <span className="font-mono text-slate-800">{reportData.metadata.inspectorId}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Location / Market</span>
              <span className="font-bold text-slate-800">{reportData.metadata.location}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Overall Finding Status</span>
              <span
                className={`font-bold ${
                  reportData.summary.finalStatus === 'COMPLIANT'
                    ? 'text-emerald-700'
                    : reportData.summary.finalStatus === 'NON_COMPLIANT'
                    ? 'text-red-700'
                    : 'text-amber-700'
                }`}
              >
                {reportData.summary.finalStatus}
              </span>
            </div>
          </div>

          {/* Consolidated Multi-Sample Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>Consolidated Specimen Findings ({reportData.samples.length} Samples in this Inspection)</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                Rule DB v{reportData.systemIdentity.ruleDatabaseVersion}
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Sample #</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Photos</th>
                    <th className="p-2.5">Rules Checked</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.samples.map((s) => (
                    <tr key={s.sampleId} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-bold font-mono">Sample #{s.sampleNumber}</td>
                      <td className="p-2.5 font-mono text-slate-600">{s.sampleCode}</td>
                      <td className="p-2.5">{s.images.length} Captured</td>
                      <td className="p-2.5">{s.findings.length} Statutory Rules</td>
                      <td className="p-2.5">
                        <Badge variant={s.status === 'VERIFIED' ? 'success' : 'warning'}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Per-Sample Inspection Sections */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Detailed Specimen Evidence & Statutory Verifications
            </h4>

            {reportData.samples.map((sample) => (
              <div key={sample.sampleId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="font-bold text-xs text-blue-900">
                    SPECIMEN UNIT #{sample.sampleNumber}: {sample.sampleCode}
                  </div>
                  <Badge variant="neutral">{sample.status}</Badge>
                </div>

                {sample.notes && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                    <strong>Sampling Notes:</strong> {sample.notes}
                  </div>
                )}

                {/* Evidence thumbnails */}
                {sample.images.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">Photographic Evidence:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sample.images.map((img) => (
                        <div key={img.imageId} className="bg-white p-2 rounded border border-slate-200 text-center">
                          {img.availabilityState === 'AVAILABLE' && img.streamUrl ? (
                            <img
                              src={img.streamUrl}
                              alt={`Evidence #${img.sequence}`}
                              className="w-full h-20 object-cover rounded mb-1"
                            />
                          ) : (
                            <div className="w-full h-20 bg-amber-50 border border-amber-200 rounded flex flex-col items-center justify-center p-1 text-center mb-1">
                              <BadgeAlert className="w-4 h-4 text-amber-500 mb-0.5" />
                              <span className="text-[9px] font-bold text-amber-800 leading-tight">
                                Evidence Unavailable
                              </span>
                              <span className="text-[8px] text-amber-600 mt-0.5">
                                (Lifecycle Expired)
                              </span>
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-slate-600 font-semibold">
                            Photo #{img.sequence}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            {Math.round(img.sizeBytes / 1024)} KB · {img.mimeType.split('/')[1]?.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified findings table */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Verified Findings:</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border border-slate-200 bg-white">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">Rule Ref</th>
                          <th className="p-1.5">Requirement</th>
                          <th className="p-1.5">Original AI Value</th>
                          <th className="p-1.5">Verified Value</th>
                          <th className="p-1.5">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sample.findings.slice(0, 5).map((f) => (
                          <tr key={f.findingId}>
                            <td className="p-1.5 font-bold font-mono text-blue-800">{f.ruleReference}</td>
                            <td className="p-1.5 max-w-xs truncate">{f.requirementDescription}</td>
                            <td className="p-1.5 font-mono text-slate-600">{f.aiValue || '—'}</td>
                            <td className="p-1.5 font-mono text-slate-800">
                              {f.verifiedValue || f.aiValue || '—'}
                              {f.isCorrected && (
                                <span className="ml-1 text-[9px] text-amber-700 font-bold">(*Corrected)</span>
                              )}
                            </td>
                            <td className="p-1.5 font-bold">
                              {f.status === 'VERIFIED_COMPLIANT' ? (
                                <span className="text-emerald-700">COMPLIANT</span>
                              ) : f.status === 'VERIFIED_NON_COMPLIANT' ? (
                                <span className="text-red-700">NON-COMPLIANT</span>
                              ) : (
                                <span className="text-slate-600">{f.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sample.findings.length > 5 && (
                      <p className="text-[10px] text-slate-400 italic mt-1 text-right">
                        ...and {sample.findings.length - 5} additional statutory rules evaluated in the official PDF document.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Signatures & Official Stamp */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
            <div className="space-y-1 text-slate-500 text-[11px]">
              <div>Generated by Smart Metrology Assistive System v1.0</div>
              <div>Problem Statement SIH26034 &bull; Legal Metrology Enforcement</div>
              <div className="font-mono">Verification Hash: {reportData.systemIdentity.verificationHash}</div>
            </div>

            <div className="text-center sm:text-right">
              <div className="w-48 border-b border-slate-400 pb-1 mb-1 font-serif text-slate-700 italic">
                {reportData.metadata.inspectorName}
              </div>
              <div className="font-bold text-slate-800">Inspector, Legal Metrology</div>
              <div className="text-[10px] text-slate-500">
                Badge ID: {reportData.metadata.inspectorId} &bull; Official Inspection Report
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
