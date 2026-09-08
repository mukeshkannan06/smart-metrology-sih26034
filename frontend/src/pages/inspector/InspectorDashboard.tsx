import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderCheck,
  Clock,
  CheckCircle2,
  PlusCircle,
  Camera,
  BookOpen,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { DashboardCard } from '../../components/ui/DashboardCard';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  fetchInspectorDashboard,
  InspectorDashboardData,
} from '../../services/dashboardService';

export const InspectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<InspectorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchInspectorDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('[INSPECTOR_DASHBOARD] Failed to load:', err);
      setError(err.message || 'Unable to load inspector dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Define columns for Recent Inspections table
  const columns: Column<InspectorDashboardData['recentInspections'][0]>[] = [
    {
      header: 'Inspection ID',
      accessor: 'inspectionNumber',
      render: (row) => (
        <span className="font-mono font-bold text-blue-700 tracking-wide">
          {row.inspectionNumber}
        </span>
      ),
    },
    {
      header: 'Commodity / Product',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.commodity}</div>
          {row.brand && <div className="text-[11px] text-slate-400">{row.brand}</div>}
        </div>
      ),
    },
    {
      header: 'Context',
      accessor: 'packageContext',
      render: (row) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
          {row.packageContext.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Location',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.location}</div>
          {row.market && <div className="text-[10px] text-slate-400">{row.market}</div>}
        </div>
      ),
    },
    {
      header: 'Samples',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.samplesCount} Samples
        </span>
      ),
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
      header: 'Action',
      render: () => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inspector/findings')}
          className="text-xs"
        >
          View Findings
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${user?.name || 'Inspector'}`}
          subtitle="Loading your Legal Metrology inspection data from MongoDB Atlas..."
          badge={<Badge variant="info">Enforcement Officer</Badge>}
        />
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Retrieving assigned inspections...</p>
          <p className="text-xs text-slate-400 mt-1">Legal Metrology Packaged Commodities Inspection Portal</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${user?.name || 'Inspector'}`}
          subtitle={`${user?.designation || 'Inspector, Legal Metrology'} — ${user?.badgeNumber || 'Active'}`}
          badge={<Badge variant="info">Enforcement Officer</Badge>}
        />
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold text-sm">Unable to load inspector dashboard</div>
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
    totalInspections: 0,
    inProgress: 0,
    completed: 0,
    archived: 0,
    totalSamples: 0,
  };

  const recentInspections = dashboardData?.recentInspections || [];
  const statusCharts = dashboardData?.charts.statusDistribution || [];
  const contextCharts = dashboardData?.charts.contextDistribution || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${dashboardData?.officer.name || user?.name}`}
        subtitle={`${user?.designation || 'Inspector, Legal Metrology'} — Officer ID: ${dashboardData?.officer.badgeNumber || user?.badgeNumber}`}
        badge={<Badge variant="info">Inspector Active</Badge>}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Camera className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/inspector/scan-capture')}
            >
              Scan Package
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => navigate('/inspector/new-inspection')}
            >
              New Inspection
            </Button>
          </div>
        }
      />

      {/* Real-time MongoDB Status Banner */}
      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px] uppercase tracking-wider">
            Live Database Connected
          </span>
          <span>
            Displaying inspection metrics scoped exclusively to your assigned officer identity.
          </span>
        </div>
        <span className="text-[11px] font-mono text-blue-600 font-semibold hidden md:inline">
          MongoDB Atlas &bull; Real Data
        </span>
      </div>

      {/* Dynamic Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="My Inspections"
          value={summary.totalInspections}
          badge="Database Count"
          subtext="Logged under your officer ID"
          icon={<FolderCheck className="w-5 h-5 text-blue-600" />}
          theme="blue"
        />
        <DashboardCard
          title="In Progress"
          value={summary.inProgress}
          badge="Active"
          subtext="Awaiting verification & report"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          theme="amber"
        />
        <DashboardCard
          title="Completed"
          value={summary.completed}
          badge="Verified"
          subtext="Statutory inspection concluded"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          theme="emerald"
        />
        <DashboardCard
          title="Samples Examined"
          value={summary.totalSamples}
          badge="Child Samples"
          subtext="Across your inspection records"
          icon={<PackageCheck className="w-5 h-5 text-indigo-600" />}
          theme="indigo"
        />
      </div>

      {/* Visual Analytics & Protocol Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution & Analytics */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Inspection Status & Context Breakdown"
              subtitle="Derived in real-time from your assigned MongoDB Atlas inspection records"
              action={
                <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  Recharts Analytics
                </span>
              }
            />
            <CardContent>
              {summary.totalInspections === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
                  <div className="font-semibold text-sm text-slate-700">No Inspection Records Yet</div>
                  <div className="text-xs text-slate-400 max-w-sm mt-1">
                    Once you conduct inspections, graphical breakdown charts for your packages will appear here.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                  {/* Status Pie Chart */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Inspection Status
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusCharts}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={35}
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
                    <div className="flex flex-wrap justify-center gap-3 text-xs mt-1">
                      {statusCharts.map((entry, idx) => (
                        <span key={idx} className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-600">{entry.name}: <strong>{entry.value}</strong></span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Context Bar Chart */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Packaging Context
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={contextCharts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="context" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E293B',
                            borderRadius: '8px',
                            color: '#F8FAFC',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" name="Inspections" fill="#0B66C3" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Reference & Guide */}
        <div>
          <Card>
            <CardHeader
              title="Inspection Protocol"
              subtitle="LMPC Assistive System Workflow"
            />
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  1
                </span>
                <div>
                  <div className="font-bold text-slate-800">Select Package Context</div>
                  <div className="text-slate-500 text-[11px]">Specify commodity, market context & sample scope.</div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  2
                </span>
                <div>
                  <div className="font-bold text-slate-800">Photograph Package</div>
                  <div className="text-slate-500 text-[11px]">Capture clear photos of principal display panel.</div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  3
                </span>
                <div>
                  <div className="font-bold text-slate-800">Verify AI Extractions</div>
                  <div className="text-slate-500 text-[11px]">Rule Engine evaluates findings; Inspector verifies legal facts.</div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  icon={<BookOpen className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => navigate('/inspector/rule-reference')}
                >
                  Browse LMPC Rule Reference
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <Card>
        <CardHeader
          title="Recent Package Inspections"
          subtitle="Latest inspection events recorded under your inspector profile"
          action={
            recentInspections.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inspector/my-inspections')}
                className="text-xs"
              >
                View Full History
              </Button>
            ) : undefined
          }
        />
        <CardContent className="p-0">
          {recentInspections.length > 0 ? (
            <Table
              columns={columns}
              data={recentInspections}
              keyExtractor={(row) => row.id}
            />
          ) : (
            <div className="p-8">
              <EmptyState
                icon={<FolderCheck className="w-7 h-7 text-blue-600" />}
                badge="Empty Dataset"
                title="No Inspections Recorded Yet"
                description="Your officer profile currently has zero recorded package inspections in MongoDB Atlas. Click below to begin a new inspection."
                actionText="Start New Inspection"
                onAction={() => navigate('/inspector/new-inspection')}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default InspectorDashboard;
