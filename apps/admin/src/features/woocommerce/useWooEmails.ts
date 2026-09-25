import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WooEmailRow {
    id: string;
    title: string;
    description: string;
    recipient: string;
    hasOrder: boolean;
    enabled: boolean;
    subject: string;
    templateId: number;
}

export interface WooTemplateOption {
    id: number;
    title: string;
}

export interface TokenHint {
    token: string;
    label: string;
}

export interface WooEmailsResponse {
    emails: WooEmailRow[];
    templates: WooTemplateOption[];
    tokens: TokenHint[];
    conditionSubjects: Array<{ value: string; label: string; type: string }>;
    conditionOps: Array<{ value: string; label: string }>;
    hasWooCommerce: boolean;
}

export interface WooEmailPatch {
    enabled?: boolean;
    subject?: string;
    template_id?: number;
}

export function useWooEmails() {
    return useQuery({
        queryKey: ["woo-emails"],
        queryFn: async () => api.get<WooEmailsResponse>("/woo-emails"),
    });
}

export function useSaveWooEmail(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patch: WooEmailPatch) =>
            (await api.put<{ email: { id: string; enabled: boolean; subject: string; templateId: number } }>(
                `/woo-emails/${id}`,
                patch as unknown as Record<string, unknown>,
            )).email,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["woo-emails"] });
        },
    });
}

export function useWooEmailPreview() {
    return useMutation({
        mutationFn: async (id: string) =>
            (await api.post<{ html: string; orderId: number }>(`/woo-emails/${id}/preview`)).html,
    });
}
