import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans text-slate-800">
      {/* Sidebar (fixed left) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area (offset by 64 on desktop) */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Header */}
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Inspection System Footer */}
        <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span>
              <strong>SMART METROLOGY</strong> &bull; SIH26034 Assistive Inspection System
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Phase 5: Authentication & Access Control &bull; Scan. Verify. Comply.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

