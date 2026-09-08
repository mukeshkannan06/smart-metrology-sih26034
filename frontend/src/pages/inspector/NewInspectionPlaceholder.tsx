import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Layers,
  FileCheck,
  CheckCircle,
  Package,
  MapPin,
  Tag,
  Hash,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const NewInspectionPlaceholder: React.FC = () => {
  const navigate = useNavigate();
  const [selectedContext, setSelectedContext] = useState('Retail Package');
  const [sampleCount, setSampleCount] = useState(5);
  const [commodity, setCommodity] = useState('Pure Desi Ghee');

  const packageContextOptions = [
    {
      name: 'Retail Package',
      desc: 'Standard packaged commodity intended for retail sale to ultimate consumers.',
      code: 'RETAIL',
    },
    {
      name: 'Wholesale Package',
      desc: 'Package containing multiple retail units or commodities for wholesale distribution.',
      code: 'WHOLESALE',
    },
    {
      name: 'Industrial / Institutional Package',
      desc: 'Packages intended for direct industrial consumption or institutional users.',
      code: 'INSTITUTIONAL',
    },
    {
      name: 'Imported Package',
      desc: 'Commodities manufactured abroad and imported into India (triggers Country of Origin rules).',
      code: 'IMPORTED',
    },
    {
      name: 'Export Package',
      desc: 'Packages packed exclusively for export beyond the territories of India.',
      code: 'EXPORT',
    },
    {
      name: 'Single-Piece Retail Package',
      desc: 'Individual packaged piece sold by number rather than weight or measure.',
      code: 'SINGLE_PIECE',
    },
  ];

  const workflowSteps = [
    { number: 1, name: 'Inspection Details', status: 'active' },
    { number: 2, name: 'Package & Context', status: 'active' },
    { number: 3, name: 'Capture Package', status: 'upcoming' },
    { number: 4, name: 'AI/OCR Extraction', status: 'upcoming' },
    { number: 5, name: 'Rule Evaluation', status: 'upcoming' },
    { number: 6, name: 'Inspector Verification', status: 'upcoming' },
    { number: 7, name: 'Consolidated Report', status: 'upcoming' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Inspection"
        subtitle="Initiate a multi-sample Legal Metrology packaged commodity inspection event"
        badge={<Badge variant="info">Workflow Shell</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'New Inspection' },
        ]}
      />

      {/* Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">Phase 2 Visual Workflow Prototype:</span> This interface demonstrates the package context selection and planned 7-step inspection flow. Real image processing and database persistence will be implemented in Phases 7–12.
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between overflow-x-auto pb-2 custom-scrollbar">
            {workflowSteps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-shrink-0 px-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      step.status === 'active'
                        ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1.5 whitespace-nowrap ${
                      step.status === 'active' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-2 mb-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1 & Step 2 Forms Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Inspection Details */}
          <Card>
            <CardHeader
              title="Step 1: Inspection Details & Metadata"
              subtitle="Basic premise and location where the packaged commodity is being examined"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Commodity / Product Category *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={commodity}
                      onChange={(e) => setCommodity(e.target.value)}
                      placeholder="e.g. Edible Oil, Ghee, Biscuits"
                      className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Package className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand / Trade Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Amul, Britannia, Fortune"
                      className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inspection Location / Market *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Supermarket, Connaught Place, New Delhi"
                      className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batch / Lot Number (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-X09"
                      className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Package & Inspection Context */}
          <Card>
            <CardHeader
              title="Step 2: Select Package & Inspection Context"
              subtitle="Determines which LMPC rules and applicability conditions will be evaluated by the Rule Engine"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packageContextOptions.map((ctx) => (
                  <div
                    key={ctx.code}
                    onClick={() => setSelectedContext(ctx.name)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedContext === ctx.name
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{ctx.name}</span>
                      {selectedContext === ctx.name && (
                        <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{ctx.desc}</p>
                  </div>
                ))}
              </div>

              {/* Sample Scope Selector */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Inspection Sample Scope (Multi-Sample)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Number of individual package specimens examined in this inspection event.
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {[1, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSampleCount(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sampleCount === num
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {num} {num === 1 ? 'Sample' : 'Samples'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Summary & Next Stage Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Inspection Summary"
              subtitle="Inspection Event #001 Scope"
            />
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Commodity:</span>
                <span className="font-bold text-slate-800">{commodity || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Package Context:</span>
                <span className="font-bold text-blue-700">{selectedContext}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Sample Scope:</span>
                <span className="font-bold text-slate-800">{sampleCount} Samples</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Applicable Engine:</span>
                <span className="font-mono text-emerald-700 font-semibold">LMPC v1.0 (Deterministic)</span>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-lg text-[11px] text-blue-800 space-y-1 mt-2">
                <div className="font-bold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Next Step in Workflow:</span>
                </div>
                <div>Photograph package principal display panel using camera capture interface.</div>
              </div>

              <div className="pt-3">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<Camera className="w-4 h-4" />}
                  onClick={() => navigate('/inspector/scan-capture')}
                >
                  Proceed to Camera Capture
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Legal Metrology Notice"
              subtitle="Rule 6(1) & Rule 26 Guidelines"
            />
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>Assistive AI Extraction:</strong> Declarations detected by vision AI will be cross-referenced against the deterministic Rule Database.
              </p>
              <p className="text-[11px] text-slate-500">
                The Inspector is the final verifying legal authority. All candidate findings require your review and confirmation before being saved to the permanent record.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

