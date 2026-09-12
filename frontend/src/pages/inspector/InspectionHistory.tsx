import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Eye,
  RefreshCw,
  FileCheck2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Building2,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchInspectionHistory,
  HistoryListResponse,
} from '../../services/historyService';

const PACKAGE_CONTEXT_LABELS: Record<string, string> = {
  RETAIL_PACKAGE: 'Retail Package',
  WHOLESALE_PACKAGE: 'Wholesale Package',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE: 'Industrial / Institutional',
  IMPORTED_PACKAGE: 'Imported Package',
  EXPORT_PACKAGE: 'Export Package',
};

export const InspectionHistory: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryListResponse | null>(null);

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('ALL');
  const [packageContext, setPackageContext] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInspectionHistory({
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        packageContext: packageContext !== 'ALL' ? packageContext : undefined,
        page,
        limit,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load inspection history:', err);
      setError(err.message || 'Failed to load inspection history.');
    } finally {
      setLoading(false);
    }
  }, [search, status, packageContext, page, limit]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPackageContext('ALL');
    setPage(1);
  };

  const kpis = data?.summaryKpis || {
    totalInspections: 0,
    completedCount: 0,
    inProgressCount: 0,
    totalSamples: 0,
    totalFindings: 0,
    verifiedFindings: 0,
    complianceRate: 100,
  };

  const getStatusBadge = (inspectionStatus: string) => {
    switch (inspectionStatus) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'READY_FOR_SAMPLING':
        return <Badge variant="neutral">Ready for Sampling</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="neutral">{inspectionStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection History & Audit Trail"
        subtitle="Complete chronological audit record of inspections, package evidence, AI extractions, and statutory verifications"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Inspection History' },
        ]}
      />

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{kpis.totalInspections}</div>
            <div className="text-xs text-slate-500 font-medium">Historical Inspections</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{kpis.completedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Completed & Audited</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-700">{kpis.totalSamples}</div>
            <div className="text-xs text-slate-500 font-medium">Samples Evaluated</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-700">{kpis.complianceRate}%</div>
            <div className="text-xs text-slate-500 font-medium">Statutory Compliance Rate</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by commodity, brand, location, or inspection ID (e.g. INS-2026-001)..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Context Filter */}
            <div className="w-full md:w-56">
              <select
                value={packageContext}
                onChange={(e) => {
                  setPackageContext(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="ALL">All Statutory Contexts</option>
                <option value="RETAIL_PACKAGE">Retail Package</option>
                <option value="WHOLESALE_PACKAGE">Wholesale Package</option>
                <option value="INDUSTRIAL_INSTITUTIONAL_PACKAGE">Industrial / Institutional</option>
                <option value="IMPORTED_PACKAGE">Imported Package</option>
                <option value="EXPORT_PACKAGE">Export Package</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-44">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_SAMPLING">Ready for Sampling</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <Button type="submit" variant="primary" size="sm" icon={<Search className="w-3.5 h-3.5" />}>
                Filter
              </Button>
              {(search || status !== 'ALL' || packageContext !== 'ALL') && (
                <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Historical Records Table */}
      <Card>
        <CardHeader
          title="Historical Case Records"
          subtitle={
            data?.pagination.total !== undefined
              ? `Showing ${data.inspections.length} of ${data.pagination.total} records`
              : 'Historical verification archives'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => loadHistory()}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500" />
              <p className="text-xs font-medium">Retrieving immutable audit records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-xs font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadHistory()}>
                Retry
              </Button>
            </div>
          ) : !data || data.inspections.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<History className="w-6 h-6 text-slate-400" />}
                title="No Historical Inspection Records Found"
                description={
                  search || status !== 'ALL' || packageContext !== 'ALL'
                    ? 'No inspections matched your filter criteria. Try broadening your search or resetting filters.'
                    : 'You have not completed any inspections yet. Create a new inspection to begin.'
                }
                actionText={search || status !== 'ALL' || packageContext !== 'ALL' ? 'Reset Filters' : 'New Inspection'}
                onAction={search || status !== 'ALL' || packageContext !== 'ALL' ? handleResetFilters : () => navigate('/inspector/new-inspection')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Inspection #</th>
                    <th className="py-3 px-4">Commodity & Brand</th>
                    <th className="py-3 px-4">Statutory Context</th>
                    <th className="py-3 px-4">Location / Market</th>
                    <th className="py-3 px-4">Samples</th>
                    <th className="py-3 px-4">Findings & Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inspections.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/inspector/history/${item._id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-700 text-xs flex items-center space-x-1.5">
                          <span>{item.inspectionNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                          <span>{item.commodity}</span>
                        </div>
                        {item.brand && (
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{item.brand}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {PACKAGE_CONTEXT_LABELS[item.packageContext] || item.packageContext}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{item.location}</div>
                        {item.market && (
                          <div className="text-[10px] text-slate-400">{item.market}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-slate-700 font-medium">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.samplesCountActual || 0} / {item.samplesCount} Units
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>{getStatusBadge(item.status)}</div>
                          {item.totalFindingsCount > 0 && (
                            <div className="text-[10px] text-slate-500">
                              {item.verifiedFindingsCount} of {item.totalFindingsCount} findings verified
                              {item.nonCompliantFindingsCount > 0 && (
                                <span className="ml-1 text-red-600 font-semibold">
                                  ({item.nonCompliantFindingsCount} violation{item.nonCompliantFindingsCount > 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/inspector/history/${item._id}`);
                          }}
                        >
                          Audit Record
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination Controls */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{data.pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{data.pagination.totalPages}</span> ({data.pagination.total} total)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                disabled={data.pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
