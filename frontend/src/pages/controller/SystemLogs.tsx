import React from 'react';
import { ScrollText, ShieldCheck, Download, Search, User } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface LogItem {
  id: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'security';
}

export const SystemLogs: React.FC = () => {
  const logs: LogItem[] = [
    {
      id: 'LOG-9821',
      actor: 'Ramesh Kumar',
      role: 'Inspector',
      action: 'INSPECTION_COMPLETED',
      resource: 'Inspection #INS-2026-001 (5 Samples)',
      timestamp: '08 Sep 2026, 03:45:12 PM',
      severity: 'info',
    },
    {
      id: 'LOG-9820',
      actor: 'Ramesh Kumar',
      role: 'Inspector',
      action: 'FINDING_VERIFIED',
      resource: 'Sample #2, Rule 6(1)(a) Confirmed Non-Compliant',
      timestamp: '07 Sep 2026, 11:24:08 AM',
      severity: 'warning',
    },
    {
      id: 'LOG-9819',
      actor: 'Rajesh Verma',
      role: 'Assistant Controller',
      action: 'RULE_VERSION_PUBLISHED',
      resource: 'Rule 6(1)(e) updated to v2.3',
      timestamp: '05 Sep 2026, 10:15:30 AM',
      severity: 'security',
    },
    {
      id: 'LOG-9818',
      actor: 'Priya Sharma',
      role: 'Inspector',
      action: 'PDF_REPORT_GENERATED',
      resource: 'Report #REP-2026-015',
      timestamp: '04 Sep 2026, 04:20:11 PM',
      severity: 'info',
    },
  ];

  const columns: Column<LogItem>[] = [
    {
      header: 'Log ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.id}</span>,
    },
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (row) => <span className="text-xs text-slate-500 font-mono">{row.timestamp}</span>,
    },
    {
      header: 'Actor',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-xs">{row.actor}</div>
          <div className="text-[10px] text-slate-400">{row.role}</div>
        </div>
      ),
    },
    {
      header: 'Action Event',
      accessor: 'action',
      render: (row) => (
        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Resource',
      accessor: 'resource',
      render: (row) => <span className="text-xs text-slate-700">{row.resource}</span>,
    },
    {
      header: 'Level',
      render: (row) => (
        <Badge variant={row.severity === 'security' ? 'purple' : row.severity === 'warning' ? 'warning' : 'info'}>
          {row.severity.toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail & Logs"
        subtitle="Immutable event logs capturing inspection life cycles, verification actions, and rule modifications"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'System Logs' },
        ]}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Audit Trail (CSV)
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Security & Activity Audit Ledger"
          subtitle="Real-time chronological events recorded across the platform"
        />
        <CardContent className="p-0">
          <Table columns={columns} data={logs} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

