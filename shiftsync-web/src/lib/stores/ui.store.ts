'use client';

import { create } from 'zustand';

/** Monday of the currently viewed week (schedule). */
function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export type ScheduleViewMode = 'calendar' | 'list';

export interface UIStore {
  sidebarCollapsed: boolean;
  activeLocationFilter: string[];
  scheduleViewMode: ScheduleViewMode;
  /** Monday of the currently viewed week. */
  activeWeek: Date;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setActiveLocationFilter: (locationIds: string[]) => void;
  setScheduleViewMode: (mode: ScheduleViewMode) => void;
  setActiveWeek: (date: Date) => void;
}

const defaultMonday = getMondayOfWeek(new Date());

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeLocationFilter: [],
  scheduleViewMode: 'calendar',
  activeWeek: defaultMonday,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveLocationFilter: (locationIds) => set({ activeLocationFilter: locationIds }),
  setScheduleViewMode: (mode) => set({ scheduleViewMode: mode }),
  setActiveWeek: (date) => set({ activeWeek: getMondayOfWeek(date) }),
}));
