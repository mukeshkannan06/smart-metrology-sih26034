import React from 'react';
import { AlertTriangle, Download, Filter } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface SupervisoryViolation {
  id: string;
  inspectionId: string;
  inspector: string;
  commodity: string;
  ruleRef: string;
  severity: 'high' | 'medium' | 'low';
  status: 'confirmed' | 'notice_issued' | 'under_review';
}

export const ViolationsSupervisory: React.FC = () => {
  const violations: SupervisoryViolation[] = [
    {
      id: 'VIO-2026-001',
      inspectionId: 'INS-2026-002',
      inspector: 'Ramesh Kumar (INS-DEL-01)',
      commodity: 'Imported Roasted Almonds (500g)',
      ruleRef: 'Rule 6(1)(a) — Common Name Missing',
      severity: 'high',
      status: 'notice_issued',
    },
    {
      id: 'VIO-2026-002',
      inspectionId: 'INS-2026-002',
      inspector: 'Ramesh Kumar (INS-DEL-01)',
      commodity: 'Imported Roasted Almonds (500g)',
      ruleRef: 'Rule 6(1)(d) — Numeral Height',
      severity: 'medium',
      status: 'confirmed',
    },
    {
      id: 'VIO-2026-005',
      inspectionId: 'INS-2026-016',
      inspector: 'Priya Sharma (INS-DEL-02)',
      commodity: 'Imported Chocolate Confectionery (250g)',
      ruleRef: 'Rule 6(1)(n) — Country of Origin Missing',
      severity: 'high',
      status: 'under_review',
    },
  ];

  const columns: Column<SupervisoryViolation>[] = [
    {
      header: 'Violation ID',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-rose-700">{row.id}</span>,
    },
    {
      header: 'Inspecting Officer',
      accessor: 'inspector',
      render: (row) => <span className="text-xs font-semibold text-slate-800">{row.inspector}</span>,
    },
    {
      header: 'Commodity',
      accessor: 'commodity',
    },
    {
      header: 'Rule Citation',
      accessor: 'ruleRef',
      render: (row) => <span className="text-xs font-semibold text-purple-900">{row.ruleRef}</span>,
    },
    {
      header: 'Severity',
      render: (row) => (
        <Badge variant={row.severity === 'high' ? 'danger' : 'warning'}>
          {row.severity.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Legal Status',
      render: (row) => (
        <Badge variant={row.status === 'notice_issued' ? 'danger' : 'neutral'}>
          {row.status === 'notice_issued' ? 'Statutory Notice Issued' : row.status === 'confirmed' ? 'Officer Confirmed' : 'Under Review'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisory Violations Register"
        subtitle="Jurisdiction-level log of non-compliances flagged under Legal Metrology Act & Rules"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Violations' },
        ]}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Violations Dossier
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="All Jurisdiction Non-Compliances"
          subtitle="Showing active infractions across all field zones"
        />
        <CardContent className="p-0">
          <Table columns={columns} data={violations} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

