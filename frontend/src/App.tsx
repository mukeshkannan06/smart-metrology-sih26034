import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Inspector Pages
import { InspectorDashboard } from './pages/inspector/InspectorDashboard';
import { NewInspectionPlaceholder } from './pages/inspector/NewInspectionPlaceholder';
import { ScanCapturePackage } from './pages/inspector/ScanCapturePackage';
import { MyInspections } from './pages/inspector/MyInspections';
import { InspectionHistory } from './pages/inspector/InspectionHistory';
import { ComplianceFindings } from './pages/inspector/ComplianceFindings';
import { ViolationsObservations } from './pages/inspector/ViolationsObservations';
import { Reports } from './pages/inspector/Reports';
import { GeneratePDF } from './pages/inspector/GeneratePDF';
import { RuleReference } from './pages/inspector/RuleReference';

// Assistant Controller Pages
import { ControllerDashboard } from './pages/controller/ControllerDashboard';
import { InspectorsList } from './pages/controller/InspectorsList';
import { InspectionsOverview } from './pages/controller/InspectionsOverview';
import { ReportsAnalytics } from './pages/controller/ReportsAnalytics';
import { ViolationsSupervisory } from './pages/controller/ViolationsSupervisory';
import { ProductsCommodities } from './pages/controller/ProductsCommodities';
import { RuleDatabase } from './pages/controller/RuleDatabase';
import { SystemLogs } from './pages/controller/SystemLogs';

// Shared Pages
import { Downloads } from './pages/shared/Downloads';
import { Settings } from './pages/shared/Settings';
import { NotFound } from './pages/shared/NotFound';

/**
 * RootRedirect determines where to send authenticated users landing on '/'
 */
const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'ASSISTANT_CONTROLLER') {
    return <Navigate to="/controller/dashboard" replace />;
  }
  return <Navigate to="/inspector/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Workspace */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Root redirect based on role */}
              <Route path="/" element={<RootRedirect />} />

              {/* Inspector Workspace Routes (Restricted to INSPECTOR) */}
              <Route element={<ProtectedRoute allowedRoles={['INSPECTOR']} />}>
                <Route path="/inspector">
                  <Route index element={<Navigate to="/inspector/dashboard" replace />} />
                  <Route path="dashboard" element={<InspectorDashboard />} />
                  <Route path="new-inspection" element={<NewInspectionPlaceholder />} />
                  <Route path="scan-capture" element={<ScanCapturePackage />} />
                  <Route path="my-inspections" element={<MyInspections />} />
                  <Route path="history" element={<InspectionHistory />} />
                  <Route path="findings" element={<ComplianceFindings />} />
                  <Route path="violations" element={<ViolationsObservations />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="generate-pdf" element={<GeneratePDF />} />
                  <Route path="rule-reference" element={<RuleReference />} />
                  <Route path="downloads" element={<Downloads />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Assistant Controller Workspace Routes (Restricted to ASSISTANT_CONTROLLER) */}
              <Route element={<ProtectedRoute allowedRoles={['ASSISTANT_CONTROLLER']} />}>
                <Route path="/controller">
                  <Route index element={<Navigate to="/controller/dashboard" replace />} />
                  <Route path="dashboard" element={<ControllerDashboard />} />
                  <Route path="inspectors" element={<InspectorsList />} />
                  <Route path="inspections" element={<InspectionsOverview />} />
                  <Route path="reports-analytics" element={<ReportsAnalytics />} />
                  <Route path="violations" element={<ViolationsSupervisory />} />
                  <Route path="products-commodities" element={<ProductsCommodities />} />
                  <Route path="rule-database" element={<RuleDatabase />} />
                  <Route path="downloads" element={<Downloads />} />
                  <Route path="system-logs" element={<SystemLogs />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
