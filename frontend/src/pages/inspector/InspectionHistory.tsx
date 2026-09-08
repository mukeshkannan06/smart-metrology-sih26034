import React from 'react';
import { History, Calendar, FileText, Download } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const InspectionHistory: React.FC = () => {
  const historyEvents = [
    {
      id: 'INS-2026-001',
      date: '08 Sep 2026, 03:45 PM',
      commodity: 'Pure Desi Cow Ghee (1L)',
      action: 'Inspection Completed & Consolidated PDF Report Generated',
      status: 'Verified Compliant',
      officer: 'Ramesh Kumar (INS-DEL-01)',
    },
    {
      id: 'INS-2026-002',
      date: '07 Sep 2026, 11:20 AM',
      commodity: 'Imported Roasted Almonds (500g)',
      action: '2 Potential Non-Compliances Verified and Submitted to Assistant Controller',
      status: 'Potential Non-Compliance',
      officer: 'Ramesh Kumar (INS-DEL-01)',
    },
    {
      id: 'INS-2026-003',
      date: '06 Sep 2026, 05:10 PM',
      commodity: 'Refined Mustard Oil (1L Pouch)',
      action: 'Sample 3 of 5 Captured. Inspection in Progress.',
      status: 'In Progress',
      officer: 'Ramesh Kumar (INS-DEL-01)',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection History"
        subtitle="Complete chronological audit record of inspection events and actions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Inspection History' },
        ]}
      />

      <Card>
        <CardHeader
          title="Timeline Audit Trail"
          subtitle="Showing historical verification records"
          action={
            <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
              Export History Log
            </Button>
          }
        />
        <CardContent className="p-6">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
            {historyEvents.map((event, idx) => (
              <div key={idx} className="relative flex items-start space-x-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white z-10">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900">{event.commodity}</span>
                    <span className="font-mono text-[11px] text-blue-700 font-semibold">{event.id}</span>
                  </div>
                  <p className="text-xs text-slate-600">{event.action}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{event.date}</span>
                    </span>
                    <Badge variant={event.status.includes('Compliant') ? 'success' : event.status.includes('Non-Compliance') ? 'danger' : 'warning'}>
                      {event.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

