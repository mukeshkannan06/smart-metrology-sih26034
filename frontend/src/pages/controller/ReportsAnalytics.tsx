import React from 'react';
import { BarChart3, TrendingUp, Download, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ReportsAnalytics: React.FC = () => {
  const complianceTrend = [
    { week: 'Week 1', rate: 91, target: 90 },
    { week: 'Week 2', rate: 88, target: 90 },
    { week: 'Week 3', rate: 94, target: 90 },
    { week: 'Week 4', rate: 92, target: 90 },
    { week: 'Week 5', rate: 96, target: 90 },
  ];

  const marketBreakdown = [
    { market: 'Retail Hypermarkets', inspections: 24, violations: 2 },
    { market: 'Wholesale Mandis', inspections: 18, violations: 3 },
    { market: 'Local Retail Stores', inspections: 16, violations: 4 },
    { market: 'E-Commerce Hubs', inspections: 6, violations: 1 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Jurisdiction-wide Legal Metrology compliance metrics and inspection trends"
        badge={<Badge variant="purple">Supervisory Intelligence</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Reports & Analytics' },
        ]}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Executive Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Rate Trend */}
        <Card>
          <CardHeader
            title="Weekly Compliance Rate Trend (%)"
            subtitle="Percentage of inspected packaged commodities meeting all mandatory declarations"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={complianceTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="rate" name="Observed Compliance Rate %" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target" name="Statutory Benchmark (90%)" stroke="#94A3B8" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Category Breakdown */}
        <Card>
          <CardHeader
            title="Inspections & Violations by Market Category"
            subtitle="Risk profiling across retail and wholesale distribution channels"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketBreakdown} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="market" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="inspections" name="Total Inspections" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="violations" name="Violations Found" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

