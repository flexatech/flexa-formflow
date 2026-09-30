import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EmailElement } from "../types";

export type LayoutScope = "all" | "woocommerce";

/** A template that would show a second logo/footer once the layout is on. */
export interface LayoutOverlapRow {
    id: number;
    title: string;
    header: boolean;
    footer: boolean;
}

export interface EmailLayout {
    enabled: boolean;
    scope: LayoutScope;
    header: EmailElement[];
    footer: EmailElement[];
    overlap: LayoutOverlapRow[];
}

const KEY = ["email-layout"];

export function useEmailLayout() {
    return useQuery({
        queryKey: KEY,
        queryFn: async () => api.get<EmailLayout>("/email-layout"),
    });
}

export type LayoutPatch = Partial<Pick<EmailLayout, "enabled" | "scope" | "header" | "footer">>;

/**
 * Partial update: the switch and scope save on their own, the block lists ride
 * along from the editor's autosave. Every response carries the whole layout
 * (including the overlap list), so the cache always matches the server.
 */
export function useSaveEmailLayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patch: LayoutPatch) =>
            api.put<EmailLayout>("/email-layout", patch as unknown as Record<string, unknown>),
        onSuccess: (layout) => {
            queryClient.setQueryData(KEY, layout);
        },
    });
}
