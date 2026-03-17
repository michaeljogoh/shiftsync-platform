'use client';

import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSocketSync } from '@/lib/socket/use-socket-sync';
import { ConstraintFeedbackRoot } from '@/components/constraint-feedback/ConstraintFeedbackRoot';
import { NotificationsStoreSync } from '@/components/notifications-store-sync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useSocketSync();

  return (
    <TooltipProvider>
    <SidebarProvider>
      <NotificationsStoreSync />
      <ConstraintFeedbackRoot />
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-3 sm:px-4">
            <div className="flex min-h-[44px] min-w-[44px] items-center md:min-w-0">
              <SidebarTrigger className="-ml-1 md:hidden" aria-label="Open menu" />
            </div>
            <p className="truncate text-sm font-medium text-slate-200">
              ShiftSync dashboard
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline">Next.js · Tailwind · shadcn/ui</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}

