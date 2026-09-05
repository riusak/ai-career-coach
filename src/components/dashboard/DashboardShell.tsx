'use client';

import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import type { DashboardUser } from '@/types/dashboard';

interface DashboardShellProps {
  user: DashboardUser;
  children: ReactNode;
}

/**
 * Client shell of the « Career Dashboard » — exact structural port of the
 * template's App.tsx: fixed w-60 sidebar (mobile drawer on < lg), floating
 * hamburger, main canvas with template header and card grid.
 */
export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden antialiased font-jakarta">
      {/* Mobile Hamburger Toggle */}
      <button
        onClick={() => setMobileSidebarOpen((open) => !open)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3 rounded-full bg-[#0B1528] text-white shadow-xl border border-slate-700 font-bold cursor-pointer"
        aria-label="Toggle Menu"
      >
        {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <div
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-60 h-screen transition-transform duration-200 ease-in-out`}
      >
        <Sidebar user={user} />
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Canvas Area */}
      <div className="lg:pl-60 flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Canvas Content Container */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 pt-3 sm:pt-4 flex flex-col gap-6 sm:gap-7 lg:gap-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}