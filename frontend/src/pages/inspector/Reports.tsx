import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, FileDown, PlusCircle, RefreshCw, AlertTriangle, Eye, Calendar, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchInspectionHistory } from '../../services/historyService';
import { fetchInspectionReportData } from '../../services/reportService';
import { generateInspectionPdf } from '../../utils/pdfGenerator';

export const Reports: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInspectionHistory({ limit: 50 });
      setInspections(res.inspections || []);
    } catch (err: any) {
      console.error('Failed to load reports archive:', err);
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickDownload = async (e: React.MouseEvent, inspectionId: string) => {
    e.stopPropagation();
    setDownloadingId(inspectionId);
    try {
      const reportData = await fetchInspectionReportData(inspectionId);
      await generateInspectionPdf(reportData, { download: true });
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to generate report: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloadingId(null);
    }
  };

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
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading inspection reports register...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <EmptyState
                icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
                title="Error Loading Reports"
                description={error}
                actionText="Retry"
                onAction={loadData}
              />
            </div>
          ) : inspections.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="w-8 h-8 text-slate-400" />}
                title="No Reports Available"
                description="Create and complete an inspection to generate consolidated PDF reports."
                actionText="New Inspection"
                onAction={() => navigate('/inspector/new-inspection')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Report Number</th>
                    <th className="py-3 px-4">Inspection ID</th>
                    <th className="py-3 px-4">Commodity</th>
                    <th className="py-3 px-4">Date Initiated</th>
                    <th className="py-3 px-4">Samples</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspections.map((row) => {
                    const reportNumber = `REP-${row.inspectionNumber.replace('INS-', '')}`;
                    const isDownloading = downloadingId === row._id;

                    return (
                      <tr
                        key={row._id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => navigate(`/inspector/generate-pdf/${row._id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {reportNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {row.inspectionNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {row.commodity}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(row.createdAt).toLocaleDateString()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            <Package className="w-3 h-3 text-slate-400" />
                            <span>{row.samplesCountActual || row.samplesCount} Units (Consolidated)</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              row.status === 'COMPLETED'
                                ? 'success'
                                : row.status === 'IN_PROGRESS'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/inspector/generate-pdf/${row._id}`);
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Download className="w-3.5 h-3.5" />}
                              disabled={isDownloading}
                              onClick={(e) => handleQuickDownload(e, row._id)}
                            >
                              {isDownloading ? 'Generating...' : 'PDF'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
