import React from 'react';
import { Settings as SettingsIcon, ShieldCheck, Moon, Bell, Server, Database, Key } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Configuration"
        subtitle="Manage application preferences, inspection defaults, and system telemetry"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inspection Preferences */}
        <Card>
          <CardHeader
            title="Inspection Configuration"
            subtitle="Default inspection scope and assistive AI options"
          />
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-800">Default Sample Scope</div>
                <div className="text-slate-500 text-[11px]">Number of packages pre-selected for new inspection</div>
              </div>
              <span className="font-semibold px-2.5 py-1 bg-slate-100 rounded text-slate-700">5 Samples</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-800">AI Confidence Review Threshold</div>
                <div className="text-slate-500 text-[11px]">Flag observations below this confidence for mandatory review</div>
              </div>
              <span className="font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded">0.75</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-bold text-slate-800">Auto-Calculate Unit Sale Price (USP)</div>
                <div className="text-slate-500 text-[11px]">Compute Rs. per g/ml when Net Qty and MRP are detected</div>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* System & Architecture Information */}
        <Card>
          <CardHeader
            title="System & Technology Architecture"
            subtitle="Current active service configuration (Phase 2 Shell)"
          />
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500">Architecture:</span>
              <span className="font-mono font-bold text-slate-800">Modular Monolith (Express + React)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500">Database Engine:</span>
              <span className="font-mono text-slate-800">MongoDB Atlas M0 (Phase 4)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500">Vision / OCR Model:</span>
              <span className="font-mono text-slate-800">Google Gemini Multimodal (Phase 10)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500">Prohibited Services:</span>
              <span className="font-mono text-rose-700 font-semibold">Railway: NONE &bull; Cloudinary: NONE</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

