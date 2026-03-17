'use client';

import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useSocketSync } from '@/lib/socket/use-socket-sync';
import { ConstraintFeedbackRoot } from '@/components/constraint-feedback/ConstraintFeedbackRoot';
import { NotificationsStoreSync } from '@/components/notifications-store-sync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useSocketSync();

  return (
    <SidebarProvider>
      <NotificationsStoreSync />
      <ConstraintFeedbackRoot />
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
          <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-slate-200">
                ShiftSync dashboard
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:inline">Next.js · Tailwind · shadcn/ui</span>
            </div>
          </header>
          <div className="flex-1 p-4">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

