import { create } from "zustand";

interface NetworkState {
  isOnline: boolean;
  pendingCount: number;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
