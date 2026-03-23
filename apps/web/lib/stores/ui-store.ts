import { create } from "zustand";

interface UIStore {
  readonly mobileMenuOpen: boolean;
  readonly selectedToolId: string | null;
  readonly wizardStep: number;
  setMobileMenuOpen: (open: boolean) => void;
  selectTool: (id: string | null) => void;
  setWizardStep: (step: number) => void;
  resetWizard: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  mobileMenuOpen: false,
  selectedToolId: null,
  wizardStep: 0,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  selectTool: (id) => set({ selectedToolId: id }),
  setWizardStep: (step) => set({ wizardStep: step }),
  resetWizard: () => set({ wizardStep: 0 }),
}));
