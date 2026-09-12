import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  Package,
  ShieldCheck,
  Building2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  fetchAnalyticsOverview,
  fetchSupervisoryInspectors,
  exportAnalyticsSummaryCSV,
  AnalyticsOverviewData,
  AnalyticsFilterParams,
  InspectorSupervisoryItem,
} from '../../services/analyticsService';

const TIME_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const PACKAGE_CONTEXT_OPTIONS = [
  { value: 'ALL', label: 'All Package Contexts' },
  { value: 'RETAIL_PACKAGE', label: 'Retail Package' },
  { value: 'WHOLESALE_PACKAGE', label: 'Wholesale Package' },
  { value: 'INDUSTRIAL_INSTITUTIONAL_PACKAGE', label: 'Industrial / Institutional' },
  { value: 'IMPORTED_PACKAGE', label: 'Imported Package' },
  { value: 'EXPORT_PACKAGE', label: 'Export Package' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'READY_FOR_SAMPLING', label: 'Ready for Sampling' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const ReportsAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsFilterParams['timeRange']>('30d');
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');
  const [selectedContext, setSelectedContext] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [inspectors, setInspectors] = useState<InspectorSupervisoryItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load inspector list once for the filter dropdown
  useEffect(() => {
    fetchSupervisoryInspectors()
      .then((data) => setInspectors(data))
      .catch((err) => console.error('Failed to load inspector filter list:', err));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: AnalyticsFilterParams = {
        timeRange,
        inspectorId: selectedInspector !== 'ALL' ? selectedInspector : undefined,
        packageContext: selectedContext !== 'ALL' ? (selectedContext as any) : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as any) : undefined,
      };

      const data = await fetchAnalyticsOverview(filters);
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('[REPORTS_ANALYTICS] Failed to load:', err);
      setError(err.message || 'Unable to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, selectedInspector, selectedContext, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setTimeRange('30d');
    setSelectedInspector('ALL');
    setSelectedContext('ALL');
    setSelectedStatus('ALL');
  };

  const isFiltered =
    timeRange !== '30d' ||
    selectedInspector !== 'ALL' ||
    selectedContext !== 'ALL' ||
    selectedStatus !== 'ALL';

  const summary = analyticsData?.summary || {
    totalInspections: 0,
    activeInspections: 0,
    completedInspections: 0,
    requiresReviewInspections: 0,
    totalSamples: 0,
    totalFindings: 0,
    verifiedFindings: 0,
    pendingFindings: 0,
    verifiedCompliantCount: 0,
    verifiedNonCompliantCount: 0,
    verifiedNotApplicableCount: 0,
    verifiedRequiresReviewCount: 0,
    officerCorrectionsCount: 0,
    overallComplianceRate: 100,
  };

  const activityTrend = analyticsData?.trends.inspectionActivity || [];
  const declTypeData = analyticsData?.charts.findingsByDeclarationType || [];
  const topCommodities = analyticsData?.breakdowns.topCommodities || [];
  const topLocations = analyticsData?.breakdowns.topLocations || [];
  const contextData = analyticsData?.charts.packageContextDistribution || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisory Reports & Analytics"
        subtitle="Jurisdiction-wide statutory Legal Metrology compliance metrics, throughput trends, and risk profiling"
        badge={<Badge variant="purple">Supervisory Intelligence</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Reports & Analytics' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => analyticsData && exportAnalyticsSummaryCSV(analyticsData)}
              disabled={!analyticsData || isLoading}
            >
              Export Analytics CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Multi-Criteria Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Filter Parameters:
              </span>
              {isFiltered && (
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Active Filter Applied
                </span>
              )}
            </div>

            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reset to Default (30 Days)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Time Horizon Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Time Horizon
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TIME_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Inspector Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Field Officer
              </label>
              <select
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Field Officers</option>
                {inspectors.map((insp) => (
                  <option key={insp.badgeNumber} value={insp.badgeNumber}>
                    {insp.name} ({insp.badgeNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Package Context Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Statutory Context
              </label>
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {PACKAGE_CONTEXT_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Inspection Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Total Inspections</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{summary.totalInspections}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{summary.completedInspections} completed</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Child Samples</div>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{summary.totalSamples}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Physical units checked</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Statutory Findings</div>
          <div className="text-xl font-bold text-purple-700 mt-0.5">{summary.totalFindings}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{summary.pendingFindings} pending verification</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Verified Compliant</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{summary.verifiedCompliantCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Metrology rule pass</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Non-Compliances</div>
          <div className="text-xl font-bold text-rose-700 mt-0.5">{summary.verifiedNonCompliantCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Statutory violations</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Compliance Rate</div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">{summary.overallComplianceRate}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Of verified determinations</div>
        </div>
      </div>

      {/* Main Charts: Throughput Trend & Findings by Declaration Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time-Series Activity Trend */}
        <Card>
          <CardHeader
            title="Inspection Throughput & Findings Trend"
            subtitle="Time-series volume of packages inspected and rule findings identified"
          />
          <CardContent className="h-72">
            {activityTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No inspection data available for the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrend} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="inspections"
                    name="Inspections"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="findings"
                    name="Findings Logged"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="violations"
                    name="Violations"
                    stroke="#E11D48"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Findings by Declaration Type */}
        <Card>
          <CardHeader
            title="Findings by Mandatory Declaration Type"
            subtitle="Verification outcomes grouped across LMPC Rule 6 statutory categories"
          />
          <CardContent className="h-72">
            {declTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No finding records found for the selected scope.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={declTypeData}
                  layout="vertical"
                  margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis
                    type="category"
                    dataKey="declarationType"
                    tick={{ fontSize: 9, fill: '#475569' }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="compliant" name="Compliant" fill="#10B981" stackId="a" />
                  <Bar dataKey="nonCompliant" name="Violations" fill="#E11D48" stackId="a" />
                  <Bar dataKey="pending" name="Pending Review" fill="#F59E0B" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns Grid: Commodities & Geographic Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Inspected Commodities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Top Inspected Packaged Commodities"
              subtitle="Volume of examinations and identified non-compliances per commodity"
            />
            <CardContent className="p-0">
              {topCommodities.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No commodity data recorded in this scope.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {topCommodities.map((c, idx) => (
                    <div
                      key={c.commodity}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] flex items-center justify-center border border-purple-200">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{c.commodity}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-slate-600 font-medium">
                          <strong>{c.inspections}</strong> inspection{c.inspections > 1 ? 's' : ''}
                        </span>
                        {c.violations > 0 ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded text-[11px] border border-rose-200">
                            {c.violations} violation{c.violations > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium rounded text-[11px]">
                            Clean
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Inspection Locations / Markets */}
        <div>
          <Card>
            <CardHeader
              title="Top Enforcement Locations"
              subtitle="Inspection concentrations by market and trade center"
            />
            <CardContent className="p-0">
              {topLocations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No location data recorded in this scope.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {topLocations.map((loc) => (
                    <div key={loc.location} className="p-3 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{loc.location}</span>
                          </div>
                          {loc.market && (
                            <div className="text-[10px] text-slate-400 ml-4">{loc.market}</div>
                          )}
                        </div>
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {loc.inspections}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
