import { create } from "zustand";

interface UIStore {
  readonly desktopSidebarOpen: boolean;
  readonly mobileSidebarOpen: boolean;
  readonly selectedToolId: string | null;
  readonly wizardStep: number;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  selectTool: (id: string | null) => void;
  setWizardStep: (step: number) => void;
  resetWizard: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  desktopSidebarOpen: true,
  mobileSidebarOpen: false,
  selectedToolId: null,
  wizardStep: 0,
  toggleDesktopSidebar: () =>
    set((state) => ({ desktopSidebarOpen: !state.desktopSidebarOpen })),
  setDesktopSidebarOpen: (open) => set({ desktopSidebarOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  selectTool: (id) => set({ selectedToolId: id }),
  setWizardStep: (step) => set({ wizardStep: step }),
  resetWizard: () => set({ wizardStep: 0 }),
}));
