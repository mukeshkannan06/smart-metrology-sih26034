import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Calendar, Clock, AlertTriangle, CheckCircle2, Package, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fetchSupervisoryInspectors, InspectorSupervisoryItem } from '../../services/analyticsService';

export const InspectorsList: React.FC = () => {
  const navigate = useNavigate();
  const [inspectors, setInspectors] = useState<InspectorSupervisoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInspectors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSupervisoryInspectors();
      setInspectors(data);
    } catch (err: any) {
      console.error('[INSPECTORS_LIST] Failed to load:', err);
      setError(err.message || 'Unable to load supervisory inspectors roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInspectors();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervised Legal Metrology Officers"
        subtitle="Roster of field Legal Metrology inspectors assigned to your jurisdiction with real-time enforcement activity"
        badge={<Badge variant="purple">Supervisory Roster</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Inspectors' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadInspectors}
          >
            Refresh Roster
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading field inspector roster from MongoDB Atlas...
        </div>
      ) : inspectors.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
          No enrolled field inspectors found in jurisdiction.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inspectors.map((insp) => (
            <Card key={insp.id}>
              <CardHeader
                title={
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {insp.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{insp.name}</div>
                      <div className="text-xs text-purple-700 font-mono font-semibold">
                        Badge ID: {insp.badgeNumber}
                      </div>
                    </div>
                  </div>
                }
                action={
                  <Badge variant={insp.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {insp.status === 'ACTIVE' ? 'Active Duty' : 'Inactive'}
                  </Badge>
                }
              />
              <CardContent className="space-y-4">
                <div className="text-xs text-slate-500 flex items-center space-x-2">
                  <span className="font-mono text-slate-400">@{insp.username}</span>
                  <span>•</span>
                  <span>Field Inspector, Legal Metrology</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Inspections</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{insp.totalInspections}</div>
                    <div className="text-[10px] text-emerald-600">{insp.completed} completed</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Samples</div>
                    <div className="text-sm font-bold text-blue-700 mt-0.5">{insp.totalSamples}</div>
                    <div className="text-[10px] text-slate-400">Examined units</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Findings</div>
                    <div className="text-sm font-bold text-purple-700 mt-0.5">{insp.totalFindings}</div>
                    <div className="text-[10px] text-emerald-600">{insp.verifiedFindings} verified</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Violations</div>
                    <div className="text-sm font-bold text-rose-700 mt-0.5">{insp.violationsCount}</div>
                    <div className="text-[10px] text-slate-400">Non-compliant</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Last Activity:{' '}
                      <strong>
                        {insp.lastActivityDate
                          ? new Date(insp.lastActivityDate).toLocaleDateString('en-IN')
                          : 'No recent activity'}
                      </strong>
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/controller/inspections?search=${encodeURIComponent(insp.badgeNumber)}`)}
                  >
                    View Cases
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
