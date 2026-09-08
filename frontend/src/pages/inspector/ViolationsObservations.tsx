import React from 'react';
import { AlertTriangle, Download, FileText, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

interface ViolationRow {
  id: string;
  inspectionId: string;
  ruleRef: string;
  commodity: string;
  declarationType: string;
  violationDetail: string;
  status: 'confirmed' | 'pending_review';
}

export const ViolationsObservations: React.FC = () => {
  const violations: ViolationRow[] = [
    {
      id: 'VIO-2026-001',
      inspectionId: 'INS-2026-002',
      ruleRef: 'Rule 6(1)(a)',
      commodity: 'Imported Roasted Almonds (500g)',
      declarationType: 'Generic Name',
      violationDetail: 'Absence of generic / common commodity name on front display panel',
      status: 'confirmed',
    },
    {
      id: 'VIO-2026-002',
      inspectionId: 'INS-2026-002',
      ruleRef: 'Rule 6(1)(d)',
      commodity: 'Imported Roasted Almonds (500g)',
      declarationType: 'Net Quantity',
      violationDetail: 'Net quantity numeral height below statutory 4.0mm limit',
      status: 'confirmed',
    },
    {
      id: 'VIO-2026-003',
      inspectionId: 'INS-2026-003',
      ruleRef: 'Rule 6(1)(g)',
      commodity: 'Refined Mustard Oil (1L)',
      declarationType: 'Consumer Care',
      violationDetail: 'Consumer care contact details illegible / partially missing',
      status: 'pending_review',
    },
  ];

  const columns: Column<ViolationRow>[] = [
    {
      header: 'Violation ID',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-rose-700">{row.id}</span>,
    },
    {
      header: 'Inspection',
      accessor: 'inspectionId',
      render: (row) => <span className="font-mono text-xs text-blue-700">{row.inspectionId}</span>,
    },
    {
      header: 'Rule Reference',
      accessor: 'ruleRef',
      render: (row) => <span className="font-semibold text-slate-800">{row.ruleRef}</span>,
    },
    {
      header: 'Commodity',
      accessor: 'commodity',
    },
    {
      header: 'Violation Observation',
      accessor: 'violationDetail',
      render: (row) => <span className="text-xs text-slate-700">{row.violationDetail}</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'confirmed' ? 'danger' : 'warning'}>
          {row.status === 'confirmed' ? 'Officer Confirmed' : 'Pending Review'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Violations / Observations"
        subtitle="Catalogue of statutory declaration discrepancies observed during package commodities inspections"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Violations' },
        ]}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Violations Report
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Observed Non-Compliance Records"
          subtitle="Showing 3 active non-compliance items"
        />
        <CardContent className="p-0">
          <Table columns={columns} data={violations} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

