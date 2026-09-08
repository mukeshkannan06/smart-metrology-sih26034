import React from 'react';
import { Download, FileText, BookOpen, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const Downloads: React.FC = () => {
  const downloadItems = [
    {
      title: 'Legal Metrology (Packaged Commodities) Rules, 2011 (Amended to 2024)',
      desc: 'Official Gazette publication containing complete statutory provisions, schedules and tables.',
      type: 'PDF Document',
      size: '2.4 MB',
    },
    {
      title: 'Packaged Commodities Inspection Protocol Manual v1.0',
      desc: 'Standard Operating Procedure (SOP) for field inspectors conducting verification and sampling.',
      type: 'PDF Manual',
      size: '1.1 MB',
    },
    {
      title: 'LMPC Numeral Height Compliance Guide (Table 1 Reference Sheet)',
      desc: 'Quick measurement guide for minimum numeral height on principal display panels.',
      type: 'PDF Reference Card',
      size: '420 KB',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downloads & Official Resources"
        subtitle="Official Legal Metrology gazettes, regulatory manuals, and inspection reference guides"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {downloadItems.map((item, idx) => (
          <Card key={idx} hoverable>
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">{item.size}</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => alert(`Downloading ${item.title} (Placeholder)`)}
                  className="text-xs"
                >
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

