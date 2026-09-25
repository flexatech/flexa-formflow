import { create } from "zustand";

export interface ToastState {
    id: number;
    message: string;
    tone: "success" | "error";
}

interface UiState {
    /** Transient (never persisted): the active toast, or null. */
    toast: ToastState | null;
    showToast: (message: string, tone?: ToastState["tone"]) => void;
    dismissToast: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
    toast: null,
    showToast: (message, tone = "success") =>
        set({ toast: { id: Date.now(), message, tone } }),
    dismissToast: () => set({ toast: null }),
}));
