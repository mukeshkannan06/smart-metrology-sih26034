import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  Eye,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fetchSupervisoryViolations, SupervisoryViolationItem } from '../../services/analyticsService';

export const ViolationsSupervisory: React.FC = () => {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<SupervisoryViolationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadViolations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSupervisoryViolations();
      setViolations(data);
    } catch (err: any) {
      console.error('[VIOLATIONS_SUPERVISORY] Failed to load:', err);
      setError(err.message || 'Unable to load supervisory violations log.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadViolations();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisory Violations & Observations"
        subtitle="Comprehensive log of identified non-compliances and potential statutory violations across packaged commodities in your jurisdiction"
        badge={<Badge variant="purple">Enforcement Monitoring</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Violations' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadViolations}
          >
            Refresh Log
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Active Supervisory Findings Log</span>
              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {violations.length} record{violations.length !== 1 ? 's' : ''}
              </span>
            </div>
          }
          subtitle="Non-compliant and potential violation findings recorded under LMPC Rules 2011"
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Loading supervisory violation log from MongoDB Atlas...
            </div>
          ) : violations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Zero active statutory violations recorded across the current jurisdiction.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Finding & Case ID</th>
                    <th className="py-3 px-4">Field Officer</th>
                    <th className="py-3 px-4">Commodity & Context</th>
                    <th className="py-3 px-4">Rule Reference</th>
                    <th className="py-3 px-4">Observed vs Verified</th>
                    <th className="py-3 px-4">Determination</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violations.map((v) => (
                    <tr key={v.findingId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-rose-700 text-xs">{v.findingId}</div>
                        <div className="font-mono text-[11px] text-purple-800 font-semibold mt-0.5">
                          {v.inspectionNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{v.inspectorName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{v.inspectorBadge}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{v.commodity}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600">
                            {v.packageContext.replace(/_/g, ' ')}
                          </span>
                          {v.brand && <span>• {v.brand}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {v.ruleReference}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {v.requirementDescription}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div>
                          AI: <span className="font-mono text-slate-800">{v.aiValue || 'NOT_FOUND'}</span>
                        </div>
                        {v.verifiedValue && (
                          <div className="text-slate-900 font-medium">
                            Officer: <span className="font-mono text-rose-700">{v.verifiedValue}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {v.status === 'VERIFIED_NON_COMPLIANT' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Verified Violation</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span>Potential Violation</span>
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(v.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/controller/inspections/${v.inspectionId}`)}
                          >
                            Case
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/controller/generate-pdf/${v.inspectionId}`)}
                          >
                            PDF
                          </Button>
                        </div>
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
