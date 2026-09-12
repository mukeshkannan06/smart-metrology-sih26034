import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Eye, Calendar, RefreshCw, AlertTriangle, Building2, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchInspectionHistory, HistoryListResponse } from '../../services/historyService';

const PACKAGE_CONTEXT_LABELS: Record<string, string> = {
  RETAIL_PACKAGE: 'Retail Package',
  WHOLESALE_PACKAGE: 'Wholesale Package',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE: 'Industrial / Institutional',
  IMPORTED_PACKAGE: 'Imported Package',
  EXPORT_PACKAGE: 'Export Package',
};

export const InspectionsOverview: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryListResponse | null>(null);

  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('ALL');
  const [packageContext, setPackageContext] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const loadData = useCallback(async () => {
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
      console.error('Failed to load supervisory inspections:', err);
      setError(err.message || 'Failed to load inspections.');
    } finally {
      setLoading(false);
    }
  }, [search, status, packageContext, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
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
        title="Supervisory Inspections Register"
        subtitle="Shared jurisdiction view of packaged commodity inspections across all field officers"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Inspections' },
        ]}
      />

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search across jurisdiction by commodity, brand, location, or ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div className="w-full md:w-56">
              <select
                value={packageContext}
                onChange={(e) => {
                  setPackageContext(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
              >
                <option value="ALL">All Statutory Contexts</option>
                <option value="RETAIL_PACKAGE">Retail Package</option>
                <option value="WHOLESALE_PACKAGE">Wholesale Package</option>
                <option value="INDUSTRIAL_INSTITUTIONAL_PACKAGE">Industrial / Institutional</option>
                <option value="IMPORTED_PACKAGE">Imported Package</option>
                <option value="EXPORT_PACKAGE">Export Package</option>
              </select>
            </div>

            <div className="w-full md:w-44">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_SAMPLING">Ready for Sampling</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <Button type="submit" variant="primary" size="sm" icon={<Search className="w-3.5 h-3.5" />}>
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={() => loadData()}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader
          title="All Jurisdiction Inspections"
          subtitle={
            data?.pagination.total !== undefined
              ? `Showing ${data.inspections.length} of ${data.pagination.total} jurisdiction cases`
              : 'Jurisdiction-wide inspection records'
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-600" />
              <p className="text-xs font-medium">Loading jurisdiction records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-xs font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadData()}>
                Retry
              </Button>
            </div>
          ) : !data || data.inspections.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<AlertTriangle className="w-6 h-6 text-slate-400" />}
                title="No Inspections Found"
                description="No inspections match the current filters in your supervisory jurisdiction."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Inspection #</th>
                    <th className="py-3 px-4">Inspector Badge</th>
                    <th className="py-3 px-4">Commodity & Brand</th>
                    <th className="py-3 px-4">Statutory Context</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Samples</th>
                    <th className="py-3 px-4">Findings & Status</th>
                    <th className="py-3 px-4 text-right">Audit Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inspections.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/controller/inspections/${item._id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-purple-800 text-xs">
                          {item.inspectionNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-700">
                          {item.inspectorId || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.commodity}</div>
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
                        {item.market && <div className="text-[10px] text-slate-400">{item.market}</div>}
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
                              {item.verifiedFindingsCount} of {item.totalFindingsCount} verified
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
                            navigate(`/controller/inspections/${item._id}`);
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
      </Card>
    </div>
  );
};
