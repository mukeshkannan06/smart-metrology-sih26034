import React, { useState } from 'react';
import { Search, Filter, PlusCircle, Eye } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

interface InspectionItem {
  id: string;
  commodity: string;
  context: string;
  location: string;
  date: string;
  samples: number;
  status: 'compliant' | 'non_compliant' | 'pending';
}

export const MyInspections: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const demoData: InspectionItem[] = [
    {
      id: 'INS-2026-001',
      commodity: 'Pure Desi Cow Ghee (1L)',
      context: 'Retail Package',
      location: 'Connaught Place Market, ND',
      date: '08 Sep 2026',
      samples: 5,
      status: 'compliant',
    },
    {
      id: 'INS-2026-002',
      commodity: 'Imported Roasted Almonds (500g)',
      context: 'Imported Package',
      location: 'Khan Market, ND',
      date: '07 Sep 2026',
      samples: 3,
      status: 'non_compliant',
    },
    {
      id: 'INS-2026-003',
      commodity: 'Refined Mustard Oil (1L Pouch)',
      context: 'Single-Piece Retail',
      location: 'Karol Bagh Market, ND',
      date: '06 Sep 2026',
      samples: 5,
      status: 'pending',
    },
    {
      id: 'INS-2026-004',
      commodity: 'Wholewheat Biscuits (200g)',
      context: 'Retail Package',
      location: 'Lajpat Nagar Central Market',
      date: '04 Sep 2026',
      samples: 4,
      status: 'compliant',
    },
    {
      id: 'INS-2026-005',
      commodity: 'Washing Powder Detergent (2kg)',
      context: 'Wholesale Package',
      location: 'Chandni Chowk Wholesale Market',
      date: '02 Sep 2026',
      samples: 3,
      status: 'compliant',
    },
  ];

  const columns: Column<InspectionItem>[] = [
    {
      header: 'Inspection ID',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-blue-700">{row.id}</span>,
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
      header: 'Samples Scope',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.samples} Samples
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        if (row.status === 'compliant') return <Badge variant="success">Verified Compliant</Badge>;
        if (row.status === 'non_compliant') return <Badge variant="danger">Potential Non-Compliance</Badge>;
        return <Badge variant="warning">Pending Verification</Badge>;
      },
    },
    {
      header: 'Action',
      render: () => (
        <Button
          variant="outline"
          size="sm"
          icon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
          onClick={() => navigate('/inspector/findings')}
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

      <Card>
        <CardHeader
          title="Inspections Register"
          subtitle="Showing 5 of 28 recorded events (Demo Placeholder)"
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
              <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5 text-slate-600" />}>
                Filter
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table columns={columns} data={demoData} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

