import React, { useState } from 'react';
import { Database, Search, Plus, Filter, ShieldCheck, Edit3, ToggleLeft, ToggleRight, History } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface RuleItem {
  id: string;
  ruleRef: string;
  declaration: string;
  applicability: string;
  version: string;
  effectiveFrom: string;
  status: 'active' | 'inactive';
}

export const RuleDatabase: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: 'RUL-001',
      ruleRef: 'Rule 6(1)(a)',
      declaration: 'Common / Generic Commodity Name',
      applicability: 'Retail & Single-Piece Packages',
      version: 'v1.2',
      effectiveFrom: '01 Nov 2011',
      status: 'active',
    },
    {
      id: 'RUL-002',
      ruleRef: 'Rule 6(1)(b)',
      declaration: 'Manufacturer / Packer / Importer Details',
      applicability: 'All Packages (Retail, Wholesale, Imported)',
      version: 'v1.1',
      effectiveFrom: '01 Nov 2011',
      status: 'active',
    },
    {
      id: 'RUL-003',
      ruleRef: 'Rule 6(1)(d)',
      declaration: 'Net Quantity & Numeral Height (Table 1)',
      applicability: 'All Packages by weight or volume',
      version: 'v2.0',
      effectiveFrom: '01 Jan 2018',
      status: 'active',
    },
    {
      id: 'RUL-004',
      ruleRef: 'Rule 6(1)(e)',
      declaration: 'Maximum Retail Price (MRP) & Unit Sale Price',
      applicability: 'Retail Packages (Exempts Industrial)',
      version: 'v2.3',
      effectiveFrom: '01 Dec 2022',
      status: 'active',
    },
    {
      id: 'RUL-005',
      ruleRef: 'Rule 6(1)(n)',
      declaration: 'Country of Origin Declaration',
      applicability: 'Imported Packages Strictly',
      version: 'v1.4',
      effectiveFrom: '01 Jan 2021',
      status: 'active',
    },
  ]);

  const toggleStatus = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r
      )
    );
  };

  const columns: Column<RuleItem>[] = [
    {
      header: 'Rule ID',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-purple-700">{row.id}</span>,
    },
    {
      header: 'Rule Reference',
      accessor: 'ruleRef',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.ruleRef}</span>,
    },
    {
      header: 'Regulated Declaration',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.declaration}</div>
          <div className="text-[11px] text-slate-400">{row.applicability}</div>
        </div>
      ),
    },
    {
      header: 'Version',
      accessor: 'version',
      render: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.version}
        </span>
      ),
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveFrom',
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status === 'active' ? 'Active In Engine' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => alert(`Edit Rule dialog placeholder for ${row.ruleRef}. Full versioning & CRUD in Phase 11.`)}
            className="text-xs p-1"
            title="Edit Rule"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleStatus(row.id)}
            className="text-xs p-1"
            title="Toggle Status"
          >
            {row.status === 'active' ? (
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rule Database Management"
        subtitle="Supervisory governance of codified Legal Metrology rules, applicability parameters, and version histories"
        badge={<Badge variant="purple">Deterministic Engine v1.0</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Rule Database' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => alert('New Rule creation will be implemented in Phase 11')}
          >
            Add New Rule
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Codified LMPC Rule Records"
          subtitle="Governing deterministic compliance evaluation during package inspections"
          action={
            <Button variant="outline" size="sm" icon={<History className="w-3.5 h-3.5" />}>
              Audit Version History
            </Button>
          }
        />
        <CardContent className="p-0">
          <Table columns={columns} data={rules} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

