import React from 'react';
import { FileDown, Printer, ShieldCheck, CheckCircle2, Download, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const GeneratePDF: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Consolidated PDF Report"
        subtitle="Produce official tamper-evident Legal Metrology inspection report with multi-sample evidence"
        badge={<Badge variant="info">PDF Engine Preview</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Reports', href: '/inspector/reports' },
          { label: 'Generate PDF' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4 text-slate-600" />}
              onClick={() => window.print()}
            >
              Print Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FileDown className="w-4 h-4" />}
              onClick={() => alert('jsPDF generation will be implemented in Phase 14')}
            >
              Export Official PDF
            </Button>
          </div>
        }
      />

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">Phase 2 Report Layout Preview:</span> Displays the exact document structure for a 5-sample consolidated inspection report. Live client-side PDF synthesis via jsPDF will be activated in Phase 14.
        </div>
      </div>

      {/* Report Document Sheet Preview */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-300 shadow-lg p-8 sm:p-12 text-slate-800 space-y-8 font-sans">
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              <ShieldCheck className="w-7 h-7 text-sky-300" />
            </div>
            <div>
              <div className="text-base font-black text-slate-900 tracking-wider uppercase">
                SMART METROLOGY
              </div>
              <div className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                Scan. Verify. Comply.
              </div>
              <div className="text-[11px] text-slate-500">
                Government Legal Metrology (Packaged Commodities) Inspection Report
              </div>
            </div>
          </div>

          <div className="text-right sm:text-right font-mono text-xs">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Report Number</div>
            <div className="font-bold text-sm text-slate-900">REP-2026-001</div>
            <div className="text-[11px] text-slate-500">Date: 08 Sep 2026</div>
          </div>
        </div>

        {/* Inspection Metadata Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Inspection ID</span>
            <span className="font-mono font-bold text-blue-700">INS-2026-001</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Commodity</span>
            <span className="font-bold text-slate-800">Pure Desi Cow Ghee (1L)</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Package Context</span>
            <span className="font-bold text-slate-800">Retail Package</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Sample Scope</span>
            <span className="font-bold text-slate-800">5 Individual Samples</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Inspecting Officer</span>
            <span className="font-bold text-slate-800">Ramesh Kumar</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Badge Number</span>
            <span className="font-mono text-slate-800">INS-DEL-01</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Location / Market</span>
            <span className="font-bold text-slate-800">Connaught Place, New Delhi</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Overall Status</span>
            <span className="font-bold text-emerald-700">PASS (Compliant)</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Executive Summary & Legal Declarations Audit
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            All 5 individual retail specimens of the subject commodity were inspected under Rule 6(1) of the Legal Metrology (Packaged Commodities) Rules, 2011. Principal display panel declarations including commodity generic name, manufacturer credentials, net quantity, maximum retail price, and consumer care details were verified with assistive vision AI and confirmed by the inspecting officer.
          </p>
        </div>

        {/* Consolidated Multi-Sample Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Consolidated Specimen Findings (Samples 1 to 5)
          </h4>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Sample #</th>
                <th className="p-2.5">Net Quantity Declared</th>
                <th className="p-2.5">MRP Declared</th>
                <th className="p-2.5">Manufacturer Info</th>
                <th className="p-2.5">LMPC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[1, 2, 3, 4, 5].map((s) => (
                <tr key={s}>
                  <td className="p-2.5 font-bold font-mono">Sample #{s}</td>
                  <td className="p-2.5">1 Litre / 910 g</td>
                  <td className="p-2.5">Rs. 650.00 (Incl. taxes)</td>
                  <td className="p-2.5">Amul Fed Dairy, Anand, Gujarat</td>
                  <td className="p-2.5 text-emerald-700 font-bold">COMPLIANT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures & Official Stamp */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
          <div className="space-y-1 text-slate-500 text-[11px]">
            <div>Generated by Smart Metrology Assistive System v1.0</div>
            <div>Problem Statement SIH26034 &bull; Legal Metrology Enforcement</div>
            <div className="font-mono">Verification Hash: 8f9b2c4e1a0d3e5f7a2b</div>
          </div>

          <div className="text-center sm:text-right">
            <div className="w-48 border-b border-slate-400 pb-1 mb-1 font-serif text-slate-700 italic">
              Ramesh Kumar
            </div>
            <div className="font-bold text-slate-800">Inspector, Legal Metrology</div>
            <div className="text-[10px] text-slate-500">Badge ID: INS-DEL-01 &bull; Delhi Zone</div>
          </div>
        </div>
      </div>
    </div>
  );
};

