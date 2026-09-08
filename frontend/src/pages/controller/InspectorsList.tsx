import React from 'react';
import { Users, Shield, MapPin, Mail, Phone, Calendar, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const InspectorsList: React.FC = () => {
  const inspectors = [
    {
      id: 'usr_insp_01',
      badge: 'INS-DEL-01',
      name: 'Ramesh Kumar',
      role: 'Inspector, Legal Metrology',
      division: 'North & Central Delhi Enforcement Zone',
      email: 'ramesh.kumar@metrology.gov.in (Synthetic)',
      phone: '+91 98765 43210 (Demo)',
      activeSince: 'Jan 2024',
      totalInspections: 34,
      complianceRate: '94.1%',
      status: 'Active Duty',
    },
    {
      id: 'usr_insp_02',
      badge: 'INS-DEL-02',
      name: 'Priya Sharma',
      role: 'Inspector, Legal Metrology',
      division: 'South & West Delhi Enforcement Zone',
      email: 'priya.sharma@metrology.gov.in (Synthetic)',
      phone: '+91 98765 43211 (Demo)',
      activeSince: 'Mar 2024',
      totalInspections: 30,
      complianceRate: '91.3%',
      status: 'On Field Inspection',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervised Inspectors"
        subtitle="Manage and monitor field Legal Metrology inspectors assigned to your jurisdiction"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Inspectors' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inspectors.map((insp) => (
          <Card key={insp.id}>
            <CardHeader
              title={
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {insp.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{insp.name}</div>
                    <div className="text-xs text-blue-700 font-mono font-semibold">{insp.badge}</div>
                  </div>
                </div>
              }
              action={
                <Badge variant={insp.status === 'Active Duty' ? 'success' : 'info'}>
                  {insp.status}
                </Badge>
              }
            />
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{insp.division}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{insp.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{insp.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Inspections</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{insp.totalInspections}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Verification Rate</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">{insp.complianceRate}</div>
                </div>
              </div>

              <div className="pt-1 flex items-center space-x-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Inspection Records
                </Button>
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  Activity Audit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

