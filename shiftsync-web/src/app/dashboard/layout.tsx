'use client';

import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSocketSync } from '@/lib/socket/use-socket-sync';
import { ConstraintFeedbackRoot } from '@/components/constraint-feedback/ConstraintFeedbackRoot';
import { NotificationsStoreSync } from '@/components/notifications-store-sync';

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  useSocketSync();

  return (
    <TooltipProvider>
    <SidebarProvider>
      <NotificationsStoreSync />
      <ConstraintFeedbackRoot />
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-3 sm:px-4">
            <div className="flex min-h-[44px] min-w-[44px] items-center md:min-w-0">
              <SidebarTrigger className="-ml-1" aria-label="Open menu" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex size-2 rounded-full bg-green-500" title="Connected" />
              <span className="hidden sm:inline text-[11px]">ShiftSync</span>
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
