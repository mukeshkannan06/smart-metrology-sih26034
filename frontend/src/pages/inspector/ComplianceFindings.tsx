import React from 'react';
import { CheckSquare, AlertTriangle, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const ComplianceFindings: React.FC = () => {
  const findings = [
    {
      id: 'FND-001',
      inspectionId: 'INS-2026-002',
      sampleNo: 'Sample #2',
      ruleRef: 'Rule 6(1)(a)',
      declaration: 'Common / Generic Commodity Name',
      observed: 'No conspicuous generic name detected on principal display panel',
      expected: 'Must state generic name in prominent display',
      status: 'potential_non_compliance',
      confidence: '0.94',
      verified: 'Pending Verification',
    },
    {
      id: 'FND-002',
      inspectionId: 'INS-2026-002',
      sampleNo: 'Sample #4',
      ruleRef: 'Rule 6(1)(d)',
      declaration: 'Net Quantity Numeral Height',
      observed: 'Numeral height 2.2mm detected for 500g package size',
      expected: 'Minimum 4.0mm height required under Table 1',
      status: 'potential_non_compliance',
      confidence: '0.89',
      verified: 'Pending Verification',
    },
    {
      id: 'FND-003',
      inspectionId: 'INS-2026-001',
      sampleNo: 'Sample #1',
      ruleRef: 'Rule 6(1)(e)',
      declaration: 'MRP Inclusive of all taxes',
      observed: 'MRP Rs. 650.00 (Incl. of all taxes)',
      expected: 'Maximum Retail Price with tax declaration',
      status: 'compliant_candidate',
      confidence: '0.98',
      verified: 'Inspector Verified',
    },
    {
      id: 'FND-004',
      inspectionId: 'INS-2026-003',
      sampleNo: 'Sample #3',
      ruleRef: 'Rule 6(1)(g)',
      declaration: 'Consumer Care Contact Details',
      observed: 'Consumer cell phone number faintly visible',
      expected: 'Clear telephone number, email, and address',
      status: 'requires_review',
      confidence: '0.62',
      verified: 'Requires Inspector Review',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Findings"
        subtitle="Rule Engine observations and Inspector verification workbench"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Compliance Findings' },
        ]}
      />

      {/* Filter Tabs Preview */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto custom-scrollbar">
        <button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs">
          All Findings (4)
        </button>
        <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
          Potential Non-Compliances (2)
        </button>
        <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
          Requires Review (1)
        </button>
        <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
          Verified Compliant (1)
        </button>
      </div>

      {/* Findings Cards */}
      <div className="space-y-4">
        {findings.map((fnd) => (
          <Card key={fnd.id}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700">{fnd.id}</span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="font-mono text-xs text-slate-600">{fnd.inspectionId}</span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs font-semibold text-slate-700">{fnd.sampleNo}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {fnd.declaration} — <span className="text-blue-700">{fnd.ruleRef}</span>
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  {fnd.status === 'potential_non_compliance' ? (
                    <Badge variant="danger" icon={<AlertTriangle className="w-3 h-3" />}>
                      Potential Non-Compliance
                    </Badge>
                  ) : fnd.status === 'compliant_candidate' ? (
                    <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                      Compliant Candidate
                    </Badge>
                  ) : (
                    <Badge variant="warning" icon={<HelpCircle className="w-3 h-3" />}>
                      Requires Review
                    </Badge>
                  )}
                </div>
              </div>

              {/* Observed vs Expected */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200/70 font-sans">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Observed Package Declaration:
                  </span>
                  <div className="text-slate-800 font-medium mt-0.5">{fnd.observed}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Statutory LMPC Requirement:
                  </span>
                  <div className="text-slate-800 font-medium mt-0.5">{fnd.expected}</div>
                </div>
              </div>

              {/* Footer with AI Confidence and Verification Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-500">
                  <span>
                    AI Confidence: <strong className="font-mono text-slate-700">{fnd.confidence}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Verification State: <strong className="text-slate-700">{fnd.verified}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert('Inspector correction flow will be implemented in Phase 12')}
                  >
                    Correct / Edit
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => alert('Inspector confirmation flow will be implemented in Phase 12')}
                  >
                    Confirm Finding
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

