import React from 'react';
import { Camera, RefreshCw, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ScanCapturePackage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan / Capture Package"
        subtitle="Photograph package declarations for AI multimodal analysis"
        badge={<Badge variant="info">Camera UI Shell</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Scan Package' },
        ]}
      />

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">Phase 2 Camera Shell:</span> Real mobile camera streaming, client-side image compression, and Gemini vision processing will be activated in Phase 9 & 10.
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden">
          <CardHeader
            title="Sample #1 of 5: Principal Display Panel"
            subtitle="Position the front of the packaged commodity inside the target frame"
          />
          <CardContent className="p-6">
            {/* Viewfinder Placeholder */}
            <div className="w-full aspect-[4/3] max-h-96 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
              <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-sky-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-sky-400" />
                </div>
                <div className="text-[11px] text-white/50 text-center font-mono">
                  Keep Net Quantity, MRP & Generic Name within frame
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-sky-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-sky-400" />
                </div>
              </div>

              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-105 transition-transform">
                <Camera className="w-8 h-8 text-sky-400" />
              </div>
              <p className="text-white font-semibold text-sm">Camera Stream Placeholder</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs">
                Supports mobile device camera capture & high-resolution photograph confirmation.
              </p>
            </div>

            {/* Action Controls */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={<Upload className="w-4 h-4 text-slate-600" />}
                className="w-full sm:w-auto"
                onClick={() => alert('File upload will be activated in Phase 9')}
              >
                Upload Photo
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Camera className="w-4 h-4" />}
                className="w-full sm:w-auto"
                onClick={() => alert('Camera capture will be activated in Phase 9')}
              >
                Capture Photograph
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<RefreshCw className="w-4 h-4" />}
                className="w-full sm:w-auto"
                onClick={() => alert('Camera switch will be activated in Phase 9')}
              >
                Switch Camera
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

