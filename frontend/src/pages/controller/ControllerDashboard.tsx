import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  FileCheck2,
  Database,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Clock,
  BookOpen,
  Filter,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { DashboardCard } from '../../components/ui/DashboardCard';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAnalyticsOverview,
  AnalyticsOverviewData,
  AnalyticsFilterParams,
} from '../../services/analyticsService';

const TIME_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export const ControllerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<AnalyticsFilterParams['timeRange']>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsOverview({ timeRange });
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('[CONTROLLER_DASHBOARD] Failed to load:', err);
      setError(err.message || 'Unable to load supervisory analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Supervisory Dashboard"
          subtitle="Loading statewide legal metrology inspection data from MongoDB Atlas..."
          badge={<Badge variant="purple">Supervisory Authority</Badge>}
        />
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Aggregating jurisdiction inspection telemetry...</p>
          <p className="text-xs text-slate-400 mt-1">Assistant Controller of Legal Metrology Portal</p>
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Supervisory Dashboard"
          subtitle={`${user?.name || 'Assistant Controller'} — Assistant Controller of Legal Metrology`}
          badge={<Badge variant="purple">Supervisory Authority</Badge>}
        />
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold text-sm">Unable to load supervisory dashboard</div>
              <div className="text-xs text-rose-600 mt-0.5">{error}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

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
  const statusCharts = analyticsData?.charts.statusDistribution || [];
  const contextCharts = analyticsData?.charts.packageContextDistribution || [];
  const workloadCharts = analyticsData?.charts.inspectorWorkload || [];
  const attentionRequired = analyticsData?.attentionRequired || [];

  return (
    <div className="space-y-6">
      {/* Supervisory Header */}
      <PageHeader
        title="Supervisory Dashboard"
        subtitle={`${user?.name || 'Dr. Vikram Singh'} — Assistant Controller of Legal Metrology • State Jurisdiction HQ`}
        badge={<Badge variant="purple">Supervisory Authority</Badge>}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Database className="w-4 h-4 text-purple-600" />}
              onClick={() => navigate('/controller/rule-database')}
            >
              Rule Database
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<BarChart2 className="w-4 h-4" />}
              onClick={() => navigate('/controller/reports-analytics')}
            >
              Reports & Analytics
            </Button>
          </div>
        }
      />

      {/* Real-Time Filter Toolbar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Time Horizon:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value as any)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === r.value
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span className="hidden sm:inline">
            Scope: <strong className="text-purple-800">{analyticsData?.filtersApplied.timeRange}</strong>
          </span>
          <button
            onClick={loadDashboard}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Supervisory Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <DashboardCard
          title="Total Inspections"
          value={summary.totalInspections}
          badge="Jurisdiction"
          subtext="Conducted in scope"
          icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
          theme="blue"
        />
        <DashboardCard
          title="In Progress"
          value={summary.activeInspections}
          badge="Active"
          subtext="On-field evaluations"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          theme="amber"
        />
        <DashboardCard
          title="Completed"
          value={summary.completedInspections}
          badge="Concluded"
          subtext="Verified compliance files"
          icon={<FileCheck2 className="w-5 h-5 text-emerald-600" />}
          theme="emerald"
        />
        <DashboardCard
          title="Samples Evaluated"
          value={summary.totalSamples}
          badge="Units"
          subtext="Child specimens inspected"
          icon={<Package className="w-5 h-5 text-purple-600" />}
          theme="indigo"
        />
        <DashboardCard
          title="Statutory Findings"
          value={summary.totalFindings}
          badge="Observations"
          subtext={`${summary.pendingFindings} pending review`}
          icon={<AlertTriangle className="w-5 h-5 text-indigo-600" />}
          theme="slate"
        />
        <DashboardCard
          title="Verified Findings"
          value={summary.verifiedFindings}
          badge={`${summary.overallComplianceRate}% Rate`}
          subtext={`${summary.verifiedNonCompliantCount} violations`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          theme="emerald"
        />
      </div>

      {/* Primary Analytics Grid: Throughput Trend & Context Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspection Activity Trend Over Time */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Inspection & Statutory Finding Activity"
              subtitle="Chronological volume of packages inspected and findings logged"
              action={
                <span className="text-[11px] text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {analyticsData?.filtersApplied.timeRange}
                </span>
              }
            />
            <CardContent className="h-72">
              {activityTrend.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
                  <BarChart2 className="w-8 h-8 text-slate-300 mb-2" />
                  <div className="text-xs text-slate-400">
                    No inspection data available for the selected filters.
                  </div>
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
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
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
                      name="Findings"
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
        </div>

        {/* Package Context Distribution */}
        <div>
          <Card>
            <CardHeader
              title="Statutory Package Context"
              subtitle="Distribution across canonical packaging classifications"
            />
            <CardContent className="h-72">
              {contextCharts.every((c) => c.count === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
                  <div className="text-xs text-slate-400">
                    No packaging context data recorded.
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contextCharts}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis
                      type="category"
                      dataKey="label"
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
                    <Bar dataKey="count" name="Inspections" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Analytics Grid: Inspector Workload & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Inspector Workload */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Field Officer Activity Comparison"
              subtitle="Inspection packages, samples, and findings logged by enrolled inspectors"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/controller/inspectors')}
                >
                  View Full Roster
                </Button>
              }
            />
            <CardContent className="h-72">
              {workloadCharts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
                  <BarChart2 className="w-8 h-8 text-slate-300 mb-2" />
                  <div className="text-xs text-slate-400">No inspector activity recorded yet.</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadCharts} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="inspections" name="Inspections" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="samples" name="Samples" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="findings" name="Findings" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inspection Status Breakdown */}
        <div>
          <Card>
            <CardHeader
              title="Inspection Status Breakdown"
              subtitle="Statewide ratio of completed, in-progress, and archived files"
            />
            <CardContent className="h-72 flex flex-col items-center justify-center">
              {statusCharts.length === 0 ? (
                <div className="text-center p-6 bg-slate-50/50 rounded-xl w-full">
                  <div className="text-xs text-slate-400">No inspections in database to plot.</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusCharts}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {statusCharts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderRadius: '8px',
                          color: '#FFF',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
                    {statusCharts.map((item) => (
                      <div key={item.name} className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 font-medium">
                          {item.name}: <strong className="text-slate-900">{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attention Required Section */}
      <Card>
        <CardHeader
          title="Attention Required — Inspections with Outstanding Findings or Violations"
          subtitle="Direct supervisor visibility into cases requiring officer verification or enforcement review"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/controller/inspections')}
            >
              All Inspections
            </Button>
          }
        />
        <CardContent className="p-0">
          {attentionRequired.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              All inspected packages in the selected horizon have been verified with zero outstanding issues.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionRequired.map((item) => (
                <div
                  key={item.inspectionId}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {item.inspectionNumber}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">{item.commodity}</span>
                      {item.brand && <span className="text-[11px] text-slate-400">({item.brand})</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>Officer: <strong className="text-slate-700">{item.inspectorName}</strong></span>
                      <span>•</span>
                      <span>Context: <strong className="text-slate-700">{item.packageContext.replace(/_/g, ' ')}</strong></span>
                      <span>•</span>
                      <span>Logged: {new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.violationsCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>{item.violationsCount} Violation{item.violationsCount > 1 ? 's' : ''}</span>
                      </span>
                    )}
                    {item.pendingFindingsCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{item.pendingFindingsCount} Pending</span>
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/controller/inspections/${item.inspectionId}`)}
                    >
                      Audit Record
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/controller/generate-pdf/${item.inspectionId}`)}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
