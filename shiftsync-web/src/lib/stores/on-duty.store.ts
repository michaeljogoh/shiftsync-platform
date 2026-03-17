'use client';

import { create } from 'zustand';

export interface OnDutyEntry {
  userId: string;
  shiftId: string;
}

export interface OnDutyPayload {
  locationId: string;
  onDuty: OnDutyEntry[];
  at: string;
}

export interface OnDutyStore {
  data: Record<string, OnDutyPayload>;
  setLocationData: (locationId: string, payload: OnDutyPayload) => void;
  setBulk: (updates: Record<string, OnDutyPayload>) => void;
}

export const useOnDutyStore = create<OnDutyStore>((set) => ({
  data: {},
  setLocationData(locationId, payload) {
    set((state) => ({
      data: { ...state.data, [locationId]: payload },
    }));
  },
  setBulk(updates) {
    set((state) => ({
      data: { ...state.data, ...updates },
    }));
  },
}));
