import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, Eye, Loader2, AlertCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  InspectionData,
  InspectionStatus,
  PACKAGE_CONTEXT_DEFINITIONS,
  fetchMyInspections,
} from '../../services/inspectionService';

export const MyInspections: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMyInspections();
        if (isMounted) {
          setInspections(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load inspections.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInspections = inspections.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.inspectionNumber?.toLowerCase().includes(term) ||
      item.commodity?.toLowerCase().includes(term) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      item.location?.toLowerCase().includes(term) ||
      (item.market && item.market.toLowerCase().includes(term)) ||
      item.packageContext?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: InspectionStatus) => {
    switch (status) {
      case InspectionStatus.READY_FOR_SAMPLING:
        return <Badge variant="info">Ready for Sampling</Badge>;
      case InspectionStatus.IN_PROGRESS:
        return <Badge variant="warning">In Progress</Badge>;
      case InspectionStatus.COMPLETED:
        return <Badge variant="success">Completed</Badge>;
      case InspectionStatus.ARCHIVED:
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const columns: Column<InspectionData>[] = [
    {
      header: 'Inspection ID',
      accessor: 'inspectionNumber',
      render: (row) => (
        <button
          onClick={() => navigate(`/inspector/inspections/${row._id}`)}
          className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline text-left cursor-pointer"
        >
          {row.inspectionNumber}
        </button>
      ),
    },
    {
      header: 'Commodity',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.commodity}</div>
          {row.brand && (
            <div className="text-[11px] text-slate-500">
              Brand: <span className="font-medium text-slate-700">{row.brand}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Package Context',
      render: (row) => {
        const def = PACKAGE_CONTEXT_DEFINITIONS[row.packageContext];
        return (
          <div>
            <div className="font-medium text-slate-800 text-xs">
              {def?.label || row.packageContext}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {def?.statutoryRef}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Market Location',
      render: (row) => (
        <div>
          <div className="text-slate-800">{row.location}</div>
          {row.market && <div className="text-[11px] text-slate-400">{row.market}</div>}
        </div>
      ),
    },
    {
      header: 'Samples Scope',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.samplesCount} {row.samplesCount === 1 ? 'Unit' : 'Units'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
          onClick={() => navigate(`/inspector/inspections/${row._id}`)}
          className="text-xs"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Inspections"
        subtitle="Manage and review packaged commodity inspections assigned to your inspector profile"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'My Inspections' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/inspector/new-inspection')}
          >
            New Inspection
          </Button>
        }
      />

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      <Card className="border-slate-200 shadow-xs">
        <CardHeader
          title="Inspections Register"
          subtitle={
            loading
              ? 'Loading recorded events...'
              : `Showing ${filteredInspections.length} of ${inspections.length} recorded events`
          }
          action={
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search commodity or ID..."
                  className="text-xs px-3 py-1.5 pl-8 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-400">Loading inspection records from database...</span>
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Package className="w-10 h-10 text-slate-300" />}
                title="No Inspections Found"
                description={
                  searchTerm
                    ? `No inspections matched "${searchTerm}". Try adjusting your search keywords.`
                    : 'You have not initiated any packaged commodity inspections yet.'
                }
                actionText="Initiate First Inspection"
                onAction={() => navigate('/inspector/new-inspection')}
              />
            </div>
          ) : (
            <Table columns={columns} data={filteredInspections} keyExtractor={(row) => row._id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
