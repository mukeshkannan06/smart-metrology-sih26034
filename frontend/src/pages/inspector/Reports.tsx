import React from 'react';
import { FileText, Download, FileDown, PlusCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

interface ReportRow {
  reportNumber: string;
  inspectionId: string;
  commodity: string;
  generatedDate: string;
  samplesCount: number;
  complianceOutcome: string;
  fileSize: string;
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();

  const reports: ReportRow[] = [
    {
      reportNumber: 'REP-2026-001',
      inspectionId: 'INS-2026-001',
      commodity: 'Pure Desi Cow Ghee (1L)',
      generatedDate: '08 Sep 2026, 03:50 PM',
      samplesCount: 5,
      complianceOutcome: 'Compliant (All 5 Samples Passed)',
      fileSize: '412 KB',
    },
    {
      reportNumber: 'REP-2026-002',
      inspectionId: 'INS-2026-002',
      commodity: 'Imported Roasted Almonds (500g)',
      generatedDate: '07 Sep 2026, 11:45 AM',
      samplesCount: 3,
      complianceOutcome: 'Non-Compliant (2 Violations Flagged)',
      fileSize: '385 KB',
    },
  ];

  const columns: Column<ReportRow>[] = [
    {
      header: 'Report Number',
      accessor: 'reportNumber',
      render: (row) => <span className="font-mono font-bold text-blue-700">{row.reportNumber}</span>,
    },
    {
      header: 'Inspection ID',
      accessor: 'inspectionId',
      render: (row) => <span className="font-mono text-xs text-slate-700">{row.inspectionId}</span>,
    },
    {
      header: 'Commodity',
      accessor: 'commodity',
    },
    {
      header: 'Date Generated',
      accessor: 'generatedDate',
      render: (row) => <span className="text-xs text-slate-500">{row.generatedDate}</span>,
    },
    {
      header: 'Samples Included',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.samplesCount} Samples (Consolidated)
        </span>
      ),
    },
    {
      header: 'Outcome',
      render: (row) => (
        <Badge variant={row.complianceOutcome.includes('Compliant (All') ? 'success' : 'danger'}>
          {row.complianceOutcome}
        </Badge>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-3.5 h-3.5 text-blue-600" />}
          onClick={() => navigate('/inspector/generate-pdf')}
          className="text-xs"
        >
          Download PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidated Reports"
        subtitle="Official Legal Metrology inspection reports with multi-sample evidence and rule citations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Reports' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<FileDown className="w-4 h-4" />}
            onClick={() => navigate('/inspector/generate-pdf')}
          >
            Generate New PDF
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Generated Reports Archive"
          subtitle="Showing consolidated PDF documents (Phase 14 jsPDF Engine)"
        />
        <CardContent className="p-0">
          <Table columns={columns} data={reports} keyExtractor={(row) => row.reportNumber} />
        </CardContent>
      </Card>
    </div>
  );
};

