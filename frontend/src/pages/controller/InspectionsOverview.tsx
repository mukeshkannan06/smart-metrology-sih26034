import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface SupervisoryInspection {
  id: string;
  inspectorName: string;
  badge: string;
  commodity: string;
  context: string;
  location: string;
  date: string;
  samplesCount: number;
  status: 'compliant' | 'non_compliant' | 'pending';
}

export const InspectionsOverview: React.FC = () => {
  const [filterInspector, setFilterInspector] = useState('ALL');

  const inspections: SupervisoryInspection[] = [
    {
      id: 'INS-2026-001',
      inspectorName: 'Ramesh Kumar',
      badge: 'INS-DEL-01',
      commodity: 'Pure Desi Cow Ghee (1L)',
      context: 'Retail Package',
      location: 'Connaught Place Market',
      date: '08 Sep 2026',
      samplesCount: 5,
      status: 'compliant',
    },
    {
      id: 'INS-2026-002',
      inspectorName: 'Ramesh Kumar',
      badge: 'INS-DEL-01',
      commodity: 'Imported Roasted Almonds (500g)',
      context: 'Imported Package',
      location: 'Khan Market',
      date: '07 Sep 2026',
      samplesCount: 3,
      status: 'non_compliant',
    },
    {
      id: 'INS-2026-015',
      inspectorName: 'Priya Sharma',
      badge: 'INS-DEL-02',
      commodity: 'Refined Sunflower Oil (1L Pouch)',
      context: 'Retail Package',
      location: 'Saket City Centre Mall',
      date: '07 Sep 2026',
      samplesCount: 5,
      status: 'compliant',
    },
    {
      id: 'INS-2026-016',
      inspectorName: 'Priya Sharma',
      badge: 'INS-DEL-02',
      commodity: 'Imported Chocolate Confectionery (250g)',
      context: 'Imported Package',
      location: 'Vasant Kunj Promenade',
      date: '06 Sep 2026',
      samplesCount: 4,
      status: 'non_compliant',
    },
  ];

  const filtered = inspections.filter((i) =>
    filterInspector === 'ALL' ? true : i.badge === filterInspector
  );

  const columns: Column<SupervisoryInspection>[] = [
    {
      header: 'Inspection ID',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-purple-800">{row.id}</span>,
    },
    {
      header: 'Inspector',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.inspectorName}</div>
          <div className="font-mono text-[10px] text-slate-400">{row.badge}</div>
        </div>
      ),
    },
    {
      header: 'Commodity',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.commodity}</div>
          <div className="text-[11px] text-slate-400">{row.context}</div>
        </div>
      ),
    },
    {
      header: 'Market Location',
      accessor: 'location',
    },
    {
      header: 'Date',
      accessor: 'date',
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
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'compliant' ? 'success' : row.status === 'non_compliant' ? 'danger' : 'warning'}>
          {row.status === 'compliant' ? 'Verified Compliant' : 'Potential Non-Compliance'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      render: () => (
        <Button variant="outline" size="sm" icon={<Eye className="w-3 h-3" />} className="text-xs">
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisory Inspections Register"
        subtitle="Shared view of all packaged commodity inspections across both field inspectors"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Inspections' },
        ]}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Zone Report
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="All Jurisdiction Inspections"
          subtitle="Showing combined multi-inspector dataset (Single Shared Database)"
          action={
            <div className="flex items-center space-x-2">
              <select
                value={filterInspector}
                onChange={(e) => setFilterInspector(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Inspectors</option>
                <option value="INS-DEL-01">Inspector Ramesh Kumar (INS-DEL-01)</option>
                <option value="INS-DEL-02">Inspector Priya Sharma (INS-DEL-02)</option>
              </select>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

