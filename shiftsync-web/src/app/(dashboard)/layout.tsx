'use client';

import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
          <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-slate-200">
                ShiftSync dashboard — sections will be implemented one at a time.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:inline">Next.js · Tailwind · shadcn/ui</span>
              <span className="inline-flex h-7 items-center rounded-full border border-slate-700 px-2">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Online</span>
              </span>
            </div>
          </header>
          <div className="flex-1 p-4">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

