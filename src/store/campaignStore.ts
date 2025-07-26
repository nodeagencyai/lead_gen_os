import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CampaignMode = 'email' | 'linkedin';

interface CampaignState {
  mode: CampaignMode;
  setMode: (mode: CampaignMode) => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      mode: 'email',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'campaign-mode',
    }
  )
);