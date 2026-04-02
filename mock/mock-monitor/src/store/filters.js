import { create } from 'zustand';

export const useMonitorFilters = create((set) => ({
  city: '',
  platformName: '',
  state: '',
  setFilter: (key, value) => set({ [key]: value }),
  setFilters: (filters) => set(filters),
  resetFilters: () => set({ city: '', platformName: '', state: '' })
}));
