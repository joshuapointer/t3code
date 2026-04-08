import { type PreviewUrl } from "@t3tools/contracts";
import { create } from "zustand";

export interface PreviewStore {
  previews: PreviewUrl[];
  setPreviews: (previews: PreviewUrl[]) => void;
  addPreview: (preview: PreviewUrl) => void;
  updatePreviewStatus: (id: string, status: "active" | "expired" | "removed") => void;
  removePreview: (id: string) => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  previews: [],

  setPreviews: (previews) => set({ previews }),

  addPreview: (preview) =>
    set((state) => {
      const exists = state.previews.some((p) => p.id === preview.id);
      if (exists) return state;
      return { previews: [...state.previews, preview] };
    }),

  updatePreviewStatus: (id, status) =>
    set((state) => ({
      previews: state.previews.map((p) => (p.id === id ? { ...p, status } : p)),
    })),

  removePreview: (id) =>
    set((state) => ({
      previews: state.previews.filter((p) => p.id !== id),
    })),
}));
