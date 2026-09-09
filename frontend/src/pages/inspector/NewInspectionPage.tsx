import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  Tag,
  Hash,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Building2,
  Globe,
  Ship,
  Boxes,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  PackageContext,
  PACKAGE_CONTEXT_DEFINITIONS,
  createInspection,
} from '../../services/inspectionService';

export const NewInspectionPage: React.FC = () => {
  const navigate = useNavigate();

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [commodity, setCommodity] = useState('');
  const [brand, setBrand] = useState('');
  const [location, setLocation] = useState('');
  const [market, setMarket] = useState('');
  const [remarks, setRemarks] = useState('');
  const [packageContext, setPackageContext] = useState<PackageContext>(
    PackageContext.RETAIL_PACKAGE
  );
  const [samplesCount, setSamplesCount] = useState<number>(5);
  const [customSamplesInput, setCustomSamplesInput] = useState<string>('5');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Context icon resolver
  const getContextIcon = (ctx: PackageContext) => {
    switch (ctx) {
      case PackageContext.RETAIL_PACKAGE:
        return <Package className="w-5 h-5 text-blue-600" />;
      case PackageContext.WHOLESALE_PACKAGE:
        return <Boxes className="w-5 h-5 text-indigo-600" />;
      case PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE:
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case PackageContext.IMPORTED_PACKAGE:
        return <Globe className="w-5 h-5 text-amber-600" />;
      case PackageContext.EXPORT_PACKAGE:
        return <Ship className="w-5 h-5 text-emerald-600" />;
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    setErrorMsg(null);
    if (!commodity.trim()) {
      setErrorMsg('Commodity name is required.');
      return false;
    }
    if (!location.trim()) {
      setErrorMsg('Inspection location or market premises is required.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    setErrorMsg(null);
    const count = parseInt(customSamplesInput, 10);
    if (isNaN(count) || count < 1 || !Number.isInteger(count)) {
      setErrorMsg('Inspection sample count must be a positive whole number (minimum 1).');
      return false;
    }
    setSamplesCount(count);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handlePresetSamples = (count: number) => {
    setSamplesCount(count);
    setCustomSamplesInput(count.toString());
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await createInspection({
        commodity: commodity.trim(),
        brand: brand.trim() ? brand.trim() : undefined,
        packageContext,
        location: location.trim(),
        market: market.trim() ? market.trim() : undefined,
        samplesCount,
        remarks: remarks.trim() ? remarks.trim() : undefined,
      });

      // Redirect immediately to the new Inspection Workspace
      navigate(`/inspector/inspections/${created._id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while creating inspection.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Details & Premises', desc: 'Commodity & Location' },
    { number: 2, title: 'Package Context', desc: 'LMPC Category & Sample Scope' },
    { number: 3, title: 'Review & Initiate', desc: 'Verification & Persistence' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="New Inspection"
        subtitle="Initiate a compliant Legal Metrology packaged commodity inspection case"
        badge={<Badge variant="info">Phase 7: Case Initiation</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'My Inspections', href: '/inspector/my-inspections' },
          { label: 'New Inspection' },
        ]}
      />

      {/* Stepper Header */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step) => {
              const isCurrent = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <div
                  key={step.number}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-50/80 border border-blue-200'
                      : isCompleted
                      ? 'bg-slate-50'
                      : 'opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.number}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-bold truncate ${
                        isCurrent ? 'text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate hidden sm:block">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Action Required:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* STEP 1: Details & Premises */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader
            title="Step 1: Inspection Details & Premises"
            subtitle="Enter the physical commodity identity and inspection market location"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commodity Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    placeholder="e.g. Pure Desi Cow Ghee (1L), Wheat Flour (5kg)"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <Package className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The generic or trade name of the packaged commodity under inspection.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand / Manufacturer (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Amul, Patanjali, Britannia, Fortune"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Brand identity or packer trademark appearing on the package.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inspection Premises / Establishment *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Big Bazaar / DMart Superstore, Connaught Place"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Physical store, warehouse, distribution point, or retail premises inspected.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Market Zone / District (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="e.g. Central Delhi Zone, Sector 18 Noida"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforcement zone or district circle under your jurisdiction.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preliminary Notes / Remarks (Optional)
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Routine market surveillance visit following consumer complaint #DEL-2026-88"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Proceed to Package Context
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Package & Inspection Context (5 Statutory Options) */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader
            title="Step 2: Statutory Package Context & Sample Scope"
            subtitle="Select from the 5 statutory packaging categories recognized under Legal Metrology Rules 2011"
          />
          <CardContent className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Statutory Packaging Context (Strictly 5 Options)
              </label>
              <div className="space-y-3">
                {Object.values(PackageContext).map((ctxKey) => {
                  const def = PACKAGE_CONTEXT_DEFINITIONS[ctxKey];
                  const isSelected = packageContext === ctxKey;
                  return (
                    <div
                      key={ctxKey}
                      onClick={() => setPackageContext(ctxKey)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            {getContextIcon(ctxKey)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-900">{def.label}</span>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {def.statutoryRef}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              {def.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0 ml-3 mt-1">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sample Scope Selection */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inspection Sample Scope (Multi-Sample Protocol)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Specify the number of package units to be examined during this inspection case (minimum 1).
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {[1, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePresetSamples(num)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                      samplesCount === num && customSamplesInput === num.toString()
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {num} {num === 1 ? 'Unit' : 'Units'}
                  </button>
                ))}

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">or custom:</span>
                  <input
                    type="number"
                    min={1}
                    value={customSamplesInput}
                    onChange={(e) => {
                      setCustomSamplesInput(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed) && parsed >= 1) {
                        setSamplesCount(parsed);
                      }
                    }}
                    className="w-20 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 text-center"
                  />
                  <span className="text-xs text-slate-500">units</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={handleBack}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Back to Details
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Proceed to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Review & Initiate */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader
              title="Step 3: Review Inspection Metadata"
              subtitle="Confirm parameters before committing this inspection record to the permanent database"
            />
            <CardContent className="space-y-6">
              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Commodity</span>
                  <span className="font-bold text-slate-800 text-sm">{commodity}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Brand / Trademark</span>
                  <span className="font-bold text-slate-800">
                    {brand.trim() ? brand : <em className="text-slate-400 font-normal">Not specified</em>}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Inspection Location</span>
                  <span className="font-bold text-slate-800">{location}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Market Zone</span>
                  <span className="font-bold text-slate-800">
                    {market.trim() ? market : <em className="text-slate-400 font-normal">Jurisdiction General</em>}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Packaging Context</span>
                  <div className="mt-1">
                    <Badge variant="info">
                      {PACKAGE_CONTEXT_DEFINITIONS[packageContext].label}
                    </Badge>
                    <span className="text-[10px] text-slate-500 ml-2">
                      ({PACKAGE_CONTEXT_DEFINITIONS[packageContext].statutoryRef})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Sample Scope</span>
                  <span className="font-bold text-slate-800 text-sm mt-1 block">
                    {samplesCount} {samplesCount === 1 ? 'Sample Unit' : 'Sample Units'}
                  </span>
                </div>

                {remarks.trim() && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[11px] font-semibold">Officer Notes</span>
                    <p className="text-slate-700 italic mt-0.5">{remarks}</p>
                  </div>
                )}
              </div>

              {/* Statutory Readiness Banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-bold text-blue-950">
                    Inspection Case Ready to Initiate
                  </div>
                  <p className="text-blue-800/90 leading-relaxed text-[11px]">
                    Submitting will assign a unique inspection case number, bind your officer credential, and create the root inspection record. In Phase 8, individual sample specimens will be attached for OCR extraction and rule engine evaluation.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="md"
                  disabled={isSubmitting}
                  onClick={handleBack}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Back to Context
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  icon={
                    isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                >
                  {isSubmitting ? 'Initiating Inspection...' : 'Initiate Inspection Case'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
