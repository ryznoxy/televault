import { create } from 'zustand';

/**
 * Visibility of the background-permissions tour. Kept in a store so the
 * Troubleshooting screen can replay it without duplicating the modal.
 */
type TourState = {
  open: boolean;
  show: () => void;
  hide: () => void;
};

export const useTourStore = create<TourState>(set => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
