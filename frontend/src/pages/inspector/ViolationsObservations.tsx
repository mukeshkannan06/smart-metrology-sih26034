import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  Search,
  FileText,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  Layers,
  Building2,
  Calendar,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fetchInspectorViolations, ViolationObservationRecord } from '../../services/findingService';
import { getSampleImageUrl } from '../../services/sampleService';
import { PLAIN_ENGLISH_RULE_TITLES } from './ComplianceFindings';

export const ViolationsObservations: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [violations, setViolations] = useState<ViolationObservationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterTab, setFilterTab] = useState<'ALL' | 'CONFIRMED' | 'POTENTIAL' | 'REVIEW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Load violations from API
  const loadViolations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchInspectorViolations();
      setViolations(data);
    } catch (err: any) {
      console.error('[VIOLATIONS_PAGE] Failed to load violations:', err);
      setError(err.message || 'Unable to load violations catalogue from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadViolations();
  }, []);

  // Compute KPI metrics
  const kpiMetrics = useMemo(() => {
    const total = violations.length;
    const confirmedViolations = violations.filter(
      (v) => v.status === 'VERIFIED_NON_COMPLIANT'
    ).length;
    const potentialViolations = violations.filter(
      (v) => v.candidateStatus === 'POTENTIAL_NON_COMPLIANCE' && v.status !== 'VERIFIED_NON_COMPLIANT'
    ).length;
    const requiresReview = violations.filter(
      (v) =>
        v.candidateStatus === 'REQUIRES_INSPECTOR_REVIEW' ||
        v.status === 'VERIFIED_REQUIRES_FURTHER_REVIEW'
    ).length;
    const uniqueInspections = new Set(violations.map((v) => v.inspectionId)).size;

    return {
      total,
      confirmedViolations,
      potentialViolations,
      requiresReview,
      uniqueInspections,
    };
  }, [violations]);

  // Filtered list
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      // 1. Tab filter
      if (filterTab === 'CONFIRMED') {
        if (v.status !== 'VERIFIED_NON_COMPLIANT') return false;
      } else if (filterTab === 'POTENTIAL') {
        if (v.candidateStatus !== 'POTENTIAL_NON_COMPLIANCE' || v.status === 'VERIFIED_NON_COMPLIANT') {
          return false;
        }
      } else if (filterTab === 'REVIEW') {
        if (
          v.candidateStatus !== 'REQUIRES_INSPECTOR_REVIEW' &&
          v.status !== 'VERIFIED_REQUIRES_FURTHER_REVIEW'
        ) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = v.inspectionNumber.toLowerCase().includes(q);
        const matchCommodity = v.commodity.toLowerCase().includes(q);
        const matchBrand = (v.brand || '').toLowerCase().includes(q);
        const matchRule = v.ruleReference.toLowerCase().includes(q);
        const matchId = v.ruleId.toLowerCase().includes(q);
        const matchDesc = v.requirementDescription.toLowerCase().includes(q);
        const matchObs = (v.verifiedValue || v.aiValue || '').toLowerCase().includes(q);

        if (!matchNum && !matchCommodity && !matchBrand && !matchRule && !matchId && !matchDesc && !matchObs) {
          return false;
        }
      }

      return true;
    });
  }, [violations, filterTab, searchQuery]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredViolations.length === 0) return;

    const headers = [
      'Finding ID',
      'Inspection Number',
      'Commodity',
      'Brand',
      'Package Context',
      'Unit Specimen',
      'Rule Reference',
      'Statutory Description',
      'Observed Value',
      'Verified Value',
      'Status',
      'Reason / Evaluation',
      'Inspector Name / Badge',
      'Date Recorded',
    ];

    const rows = filteredViolations.map((v) => [
      `"${v.findingId}"`,
      `"${v.inspectionNumber}"`,
      `"${v.commodity.replace(/"/g, '""')}"`,
      `"${(v.brand || '').replace(/"/g, '""')}"`,
      `"${v.packageContext}"`,
      `"${v.sampleCode}"`,
      `"${v.ruleReference}"`,
      `"${v.requirementDescription.replace(/"/g, '""')}"`,
      `"${(v.aiValue || '').replace(/"/g, '""')}"`,
      `"${(v.verifiedValue || '').replace(/"/g, '""')}"`,
      `"${v.status}"`,
      `"${(v.reason || '').replace(/"/g, '""')}"`,
      `"${v.verifiedByName || v.inspectorId}"`,
      `"${new Date(v.createdAt).toLocaleDateString('en-IN')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `statutory_violations_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Violations & Statutory Observations"
        subtitle="Central catalogue of legal metrology infractions, non-compliant declarations, and officer-flagged violations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Violations' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadViolations}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              disabled={filteredViolations.length === 0}
              onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
            >
              Export CSV Report
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadViolations} className="text-xs border-rose-300">
            Retry
          </Button>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Records */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Infractions
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {kpiMetrics.total}
          </div>
          <p className="text-[10px] text-slate-400">
            Across {kpiMetrics.uniqueInspections} monitored case{kpiMetrics.uniqueInspections !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Confirmed Violations */}
        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            Officer Confirmed
          </span>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            {kpiMetrics.confirmedViolations}
          </div>
          <p className="text-[10px] text-rose-600">Statutory violations affirmed</p>
        </div>

        {/* Potential Non-Compliances */}
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Potential Violations
          </span>
          <div className="text-2xl font-extrabold text-amber-700 font-mono">
            {kpiMetrics.potentialViolations}
          </div>
          <p className="text-[10px] text-amber-600">Pending officer determination</p>
        </div>

        {/* Requires Review */}
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Requires Review
          </span>
          <div className="text-2xl font-extrabold text-blue-700 font-mono">
            {kpiMetrics.requiresReview}
          </div>
          <p className="text-[10px] text-blue-600">Discrepancies under evaluation</p>
        </div>
      </div>

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
            All Infractions ({kpiMetrics.total})
          </button>
          <button
            onClick={() => setFilterTab('CONFIRMED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'CONFIRMED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Confirmed Violations ({kpiMetrics.confirmedViolations})
          </button>
          <button
            onClick={() => setFilterTab('POTENTIAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'POTENTIAL'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Potential Violations ({kpiMetrics.potentialViolations})
          </button>
          <button
            onClick={() => setFilterTab('REVIEW')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterTab === 'REVIEW'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Requires Review ({kpiMetrics.requiresReview})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search commodity, rule, case number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Statutory Non-Compliance Register</span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {filteredViolations.length} record{filteredViolations.length !== 1 ? 's' : ''}
              </span>
            </div>
          }
          subtitle="Live synchronized from MongoDB Atlas • Legal Metrology (Packaged Commodities) Rules, 2011"
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-blue-600" />
              <p>Loading active violations and observations from database...</p>
            </div>
          ) : filteredViolations.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Zero Violations Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery.trim()
                  ? 'No statutory violations match your search filter.'
                  : 'No active non-compliances or violations recorded for this filter scope.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Case & Specimen</th>
                    <th className="py-3 px-4">Commodity Details</th>
                    <th className="py-3 px-4">Statutory Rule & Citation</th>
                    <th className="py-3 px-4">Observed Defect</th>
                    <th className="py-3 px-4">Determination Status</th>
                    <th className="py-3 px-3 text-center">Photo Evidence</th>
                    <th className="py-3 px-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredViolations.map((v) => {
                    const isConfirmed = v.status === 'VERIFIED_NON_COMPLIANT';
                    const isReview =
                      v.candidateStatus === 'REQUIRES_INSPECTOR_REVIEW' ||
                      v.status === 'VERIFIED_REQUIRES_FURTHER_REVIEW';
                    const ruleTitle = PLAIN_ENGLISH_RULE_TITLES[v.ruleId] || v.declarationType.replace(/_/g, ' ');
                    const hasPhotos = v.evidenceImageIds && v.evidenceImageIds.length > 0;

                    return (
                      <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Case & Specimen */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/inspector/findings?inspectionId=${v.inspectionId}&sampleId=${v.sampleId || 'ALL'}`
                              )
                            }
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-mono font-bold text-blue-700 text-xs group-hover:underline flex items-center gap-1">
                              <span>{v.inspectionNumber}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Unit {v.sampleCode}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(v.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          </button>
                        </td>

                        {/* Commodity Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{v.commodity}</div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                            {v.brand && (
                              <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-medium text-slate-600">
                                {v.brand}
                              </span>
                            )}
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              {v.packageContext.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Rule Reference */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{ruleTitle}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {v.ruleReference}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {v.ruleFamily.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Observed Defect */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-xs text-slate-700 font-medium">
                            {v.reason || v.requirementDescription}
                          </div>
                          {(v.verifiedValue || v.aiValue) && (
                            <div className="mt-1 font-mono text-[11px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                              Value: {v.verifiedValue || v.aiValue}
                            </div>
                          )}
                          {v.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5 truncate" title={v.notes}>
                              Note: "{v.notes}"
                            </div>
                          )}
                        </td>

                        {/* Determination Status */}
                        <td className="py-3.5 px-4">
                          {isConfirmed ? (
                            <div className="space-y-0.5">
                              <Badge variant="danger" size="sm" icon={<ShieldAlert className="w-3 h-3" />}>
                                Officer Confirmed Violation
                              </Badge>
                              {v.verifiedByName && (
                                <div className="text-[10px] text-slate-500">
                                  by {v.verifiedByName}
                                </div>
                              )}
                            </div>
                          ) : isReview ? (
                            <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                              Action Required (Review)
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                              Potential Violation (Unverified)
                            </Badge>
                          )}
                        </td>

                        {/* Photo Evidence */}
                        <td className="py-3.5 px-3 text-center">
                          {hasPhotos ? (
                            <button
                              type="button"
                              onClick={() => {
                                const imgId = v.evidenceImageIds[0];
                                const url = getSampleImageUrl(v.inspectionId, v.sampleId, imgId);
                                setLightboxImage({
                                  url,
                                  title: `${ruleTitle} (${v.ruleReference})`,
                                  subtitle: `Case: ${v.inspectionNumber} • Unit: ${v.sampleCode} • Defect: ${v.reason || 'Non-compliance'}`,
                                });
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer transition-colors inline-flex items-center gap-1"
                              title="View Attached Evidence Photo"
                            >
                              <ImageIcon className="w-4 h-4" />
                              <span className="text-[10px] font-bold">{v.evidenceImageIds.length}</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/inspector/findings?inspectionId=${v.inspectionId}&sampleId=${v.sampleId || 'ALL'}`
                              )
                            }
                            className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 shadow-2xs font-semibold"
                            icon={<ExternalLink className="w-3 h-3" />}
                          >
                            Verify / Update
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

      {/* Full-Size Evidence Lightbox Viewer */}
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
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
              <span>High-resolution statutory infraction evidence</span>
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
