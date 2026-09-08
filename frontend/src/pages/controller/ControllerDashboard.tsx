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
  FolderCheck,
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
  fetchControllerDashboard,
  ControllerDashboardData,
} from '../../services/dashboardService';

export const ControllerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<ControllerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchControllerDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('[CONTROLLER_DASHBOARD] Failed to load:', err);
      setError(err.message || 'Unable to load supervisory dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Inspector Roster Table Columns
  const inspectorColumns: Column<ControllerDashboardData['inspectorActivity'][0]>[] = [
    {
      header: 'Badge ID',
      accessor: 'badgeNumber',
      render: (row) => (
        <span className="font-mono font-bold text-blue-700">{row.badgeNumber}</span>
      ),
    },
    {
      header: 'Field Officer Name',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
            {row.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{row.name}</div>
            <div className="text-[10px] font-mono text-slate-400">@{row.username}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Total Inspections',
      accessor: 'totalInspections',
      render: (row) => <span className="font-bold text-slate-800">{row.totalInspections}</span>,
    },
    {
      header: 'In Progress',
      accessor: 'inProgress',
      render: (row) => (
        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
          {row.inProgress} active
        </span>
      ),
    },
    {
      header: 'Completed',
      accessor: 'completed',
      render: (row) => (
        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
          {row.completed} verified
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {row.status === 'ACTIVE' ? 'Active Duty' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  // Recent Global Inspections Table Columns
  const inspectionColumns: Column<ControllerDashboardData['recentInspections'][0]>[] = [
    {
      header: 'Inspection ID',
      accessor: 'inspectionNumber',
      render: (row) => (
        <span className="font-mono font-bold text-blue-700 tracking-wide">{row.inspectionNumber}</span>
      ),
    },
    {
      header: 'Field Inspector',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.inspectorName}</div>
          <div className="text-[10px] font-mono text-slate-400">{row.inspectorBadge}</div>
        </div>
      ),
    },
    {
      header: 'Commodity / Product',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.commodity}</div>
          {row.brand && <div className="text-[11px] text-slate-400">{row.brand}</div>}
        </div>
      ),
    },
    {
      header: 'Package Context',
      accessor: 'packageContext',
      render: (row) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          {row.packageContext.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Market / Location',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.location}</div>
          {row.market && <div className="text-[10px] text-slate-400">{row.market}</div>}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        if (row.status === 'COMPLETED') {
          return <Badge variant="success">Completed</Badge>;
        }
        if (row.status === 'IN_PROGRESS') {
          return <Badge variant="warning">In Progress</Badge>;
        }
        return <Badge variant="neutral">Archived</Badge>;
      },
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="inline-flex items-center space-x-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </span>
      ),
    },
  ];

  if (isLoading) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Supervisory Dashboard"
          subtitle={`${user?.name || 'Dr. Vikram Singh'} — Assistant Controller of Legal Metrology`}
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

  const summary = dashboardData?.summary || {
    totalInspectors: 0,
    totalInspections: 0,
    inProgress: 0,
    completed: 0,
    archived: 0,
    totalSamples: 0,
    totalRules: 0,
  };

  const inspectorActivity = dashboardData?.inspectorActivity || [];
  const recentInspections = dashboardData?.recentInspections || [];
  const statusCharts = dashboardData?.charts.statusDistribution || [];
  const contextCharts = dashboardData?.charts.contextDistribution || [];
  const workloadCharts = dashboardData?.charts.inspectorWorkload || [];

  return (
    <div className="space-y-6">
      {/* Supervisory Header */}
      <PageHeader
        title="Supervisory Dashboard"
        subtitle={`${dashboardData?.officer.name || user?.name} — Assistant Controller of Legal Metrology &bull; State Jurisdiction HQ`}
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

      {/* Real Data Notice */}
      <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs text-purple-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 bg-purple-700 text-white font-bold rounded text-[10px] uppercase tracking-wider">
            Supervisory Jurisdiction Telemetry
          </span>
          <span>
            Real-time aggregate data across all active field officers derived directly from MongoDB Atlas.
          </span>
        </div>
        <span className="text-[11px] font-mono text-purple-700 font-semibold hidden md:inline">
          MongoDB Atlas &bull; Live Aggregations
        </span>
      </div>

      {/* Supervisory Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Field Inspectors"
          value={summary.totalInspectors}
          badge="Enrolled"
          subtext="Active in jurisdiction"
          icon={<Users className="w-5 h-5 text-purple-600" />}
          theme="indigo"
        />
        <DashboardCard
          title="Total Inspections"
          value={summary.totalInspections}
          badge="Jurisdiction"
          subtext="Combined enforcement total"
          icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
          theme="blue"
        />
        <DashboardCard
          title="In Progress"
          value={summary.inProgress}
          badge="On Field"
          subtext="Active field examinations"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          theme="amber"
        />
        <DashboardCard
          title="Completed"
          value={summary.completed}
          badge="Concluded"
          subtext="Verified compliance files"
          icon={<FileCheck2 className="w-5 h-5 text-emerald-600" />}
          theme="emerald"
        />
        <DashboardCard
          title="Statutory Rules"
          value={summary.totalRules}
          badge="LMPC 2011"
          subtext="Active statutory provisions"
          icon={<BookOpen className="w-5 h-5 text-slate-600" />}
          theme="slate"
        />
      </div>

      {/* Recharts Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspector Workload Distribution */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Field Inspector Workload Comparison"
              subtitle="Total inspection packages processed per enrolled officer in jurisdiction"
              action={
                <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  Live Workload
                </span>
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
                  <BarChart data={workloadCharts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="inspections" name="Inspections Logged" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution Pie Chart */}
        <div>
          <Card>
            <CardHeader
              title="Inspection Status Breakdown"
              subtitle="Statewide ratio of in-progress vs completed files"
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
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={5}
                      >
                        {statusCharts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderRadius: '8px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs mt-2">
                    {statusCharts.map((entry, idx) => (
                      <span key={idx} className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-600">{entry.name}: <strong>{entry.value}</strong></span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Inspector Roster */}
      <Card>
        <CardHeader
          title="Enrolled Field Inspectors"
          subtitle="Supervisory roster of Legal Metrology enforcement officers under your authority"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/controller/inspectors')}
              className="text-xs"
            >
              Manage Inspectors
            </Button>
          }
        />
        <CardContent className="p-0">
          <Table
            columns={inspectorColumns}
            data={inspectorActivity}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      {/* Recent Statewide Inspections Table */}
      <Card>
        <CardHeader
          title="Recent Statewide Inspections"
          subtitle="Latest packaged commodity inspection reports across all assigned zones"
          action={
            recentInspections.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/controller/inspections')}
                className="text-xs"
              >
                View All Inspections
              </Button>
            ) : undefined
          }
        />
        <CardContent className="p-0">
          {recentInspections.length > 0 ? (
            <Table
              columns={inspectionColumns}
              data={recentInspections}
              keyExtractor={(row) => row.id}
            />
          ) : (
            <div className="p-8">
              <EmptyState
                icon={<FolderCheck className="w-7 h-7 text-purple-600" />}
                badge="Supervisory Empty State"
                title="No Inspections Logged Statewide"
                description="No field inspections have been created in the database yet. When inspectors log inspections, they will appear here in real time."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default ControllerDashboard;
