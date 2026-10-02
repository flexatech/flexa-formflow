import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EMAIL_VIEWPORT } from "./emailFrame";
import { loadPatternPreview } from "./patternPreviewLoader";
import { LatestRender } from "./latestRender";
import {
    normalizePattern,
    patternsForContext,
    type DynamicDataCategory,
    type EmailElement,
    type EmailPattern,
    type EmailTemplate,
    type EmailTree,
    type PatternCategory,
    type PatternContext,
    type TemplateOriginRef,
} from "./types";

interface TemplatesListResponse {
    items: EmailTemplate[];
}

interface TemplateResponse {
    template: EmailTemplate;
}

export function useEmailTemplatesList() {
    return useQuery({
        queryKey: ["email-templates"],
        queryFn: async () => (await api.get<TemplatesListResponse>("/email-templates")).items,
    });
}

export function useEmailTemplate(id: number) {
    return useQuery({
        queryKey: ["email-template", id],
        queryFn: async () => (await api.get<TemplateResponse>(`/email-templates/${id}`)).template,
        enabled: id > 0,
    });
}

export function useCreateEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (title: string) =>
            (await api.post<TemplateResponse>("/email-templates", { title })).template,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

/**
 * Editor autosave. The `tree` document is sent whole (one editor owns it);
 * `title` rides along when changed.
 */
export function useSaveEmailTemplate(id: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (fields: Partial<Pick<EmailTemplate, "title" | "tree">>) =>
            (await api.put<TemplateResponse>(`/email-templates/${id}`, fields)).template,
        onSuccess: (template) => {
            queryClient.setQueryData(["email-template", id], template);
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

export function useDeleteEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/email-templates/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

export function useDuplicateEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) =>
            (await api.post<TemplateResponse>(`/email-templates/${id}/duplicate`)).template,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

/**
 * The Dynamic Data browser's sources for the current preview form. Samples are
 * resolved server-side through the same render context the preview uses, so the
 * picker and the preview never disagree.
 */
export function useDynamicData(formId: number, orderId = 0) {
    return useQuery<DynamicDataCategory[]>({
        queryKey: ["email-dynamic-data", formId, orderId],
        // Sample data changes only when entries, the form or the order change;
        // switching back to a source already loaded makes no request. The
        // signal drops a request the user has already moved past.
        queryFn: async ({ signal }) =>
            (
                await api.get<{ categories: DynamicDataCategory[] }>(
                    `/emails/dynamic-data?form_id=${formId}&order_id=${orderId}`,
                    signal,
                )
            ).categories,
        staleTime: 5 * 60_000,
    });
}

export interface PatternLibrary {
    categories: PatternCategory[];
    patterns: EmailPattern[];
    /** Server render revision of the sample data (site name, logo, brand colour); keys thumbnails. */
    revision: number;
}

/**
 * The pattern library for one editing context (a normal email, or the global
 * header / footer). Static per plugin version, so cached for the session.
 */
export function useEmailPatterns(context: PatternContext = "email") {
    return useQuery<PatternLibrary>({
        queryKey: ["email-patterns", context],
        queryFn: async () => {
            const res = await api.get<{ categories: PatternCategory[]; patterns: unknown[]; revision?: number }>(
                `/emails/patterns?context=${context}`,
            );
            return {
                categories: Array.isArray(res.categories) ? res.categories : [],
                revision: typeof res.revision === "number" ? res.revision : 0,
                patterns: patternsForContext(
                    (Array.isArray(res.patterns) ? res.patterns : [])
                        .map(normalizePattern)
                        .filter((p): p is EmailPattern => p !== null),
                    context,
                ),
            };
        },
        staleTime: Infinity,
    });
}

/**
 * Rendered HTML for one pattern's thumbnail, from the same renderer as the
 * email. Fetched only once `enabled` (the card is near the viewport), batched
 * with other cards, and cached for the session per pattern id, pattern
 * version, sample-data revision and the logical viewport it is laid out at.
 */
export function usePatternThumbnail(pattern: EmailPattern | null, revision: number, enabled: boolean) {
    const id = pattern?.id ?? "";
    return useQuery({
        queryKey: ["email-pattern-preview", id, pattern?.version ?? 0, revision, EMAIL_VIEWPORT],
        queryFn: () => loadPatternPreview(id),
        enabled: enabled && id !== "",
        staleTime: Infinity,
        gcTime: 30 * 60_000,
        retry: 1,
    });
}

export interface PreviewParams {
    tree: EmailTree;
    form_id?: number;
    /** Render against this WooCommerce order (order blocks and tokens). */
    order_id?: number;
    type?: "admin" | "confirmation";
    /** Global layout editor only: render this part as editable, from these drafts. */
    layout?: { header: EmailElement[]; footer: EmailElement[] };
    layout_part?: "header" | "footer";
}

/**
 * The editor canvas render. Renders are keyed by their content (tree, sample
 * source, layout part), so returning to a state already rendered (undo,
 * switching back to a form) is instant and makes no request. A new render
 * aborts the one still in flight, and a late answer for an older state is
 * ignored, so at most one request is ever live.
 */
export function useCanvasRender(params: PreviewParams, delay = 400) {
    const [html, setHtml] = useState("");
    const [pending, setPending] = useState(false);
    const renderer = useRef<LatestRender | null>(null);
    renderer.current ??= new LatestRender(
        (key, signal) =>
            api.post<{ html: string }>("/email-preview", JSON.parse(key) as Record<string, unknown>, signal).then((r) => r.html),
        setHtml,
        setPending,
    );
    const key = JSON.stringify(params);

    useEffect(() => {
        const r = renderer.current!;
        if (r.show(key)) return;
        // Typing settles before a render is asked for; the box itself updates at once.
        const timer = window.setTimeout(() => void r.fetch(key), delay);
        return () => window.clearTimeout(timer);
    }, [key, delay]);

    useEffect(() => () => renderer.current?.dispose(), []);

    return { html, pending };
}

export interface TestSendParams extends PreviewParams {
    to: string;
}

export function useTestSend() {
    return useMutation({
        mutationFn: async (params: TestSendParams) =>
            (await api.post<{ sent: boolean }>("/email-test", params as unknown as Record<string, unknown>)).sent,
    });
}

export interface OriginChoice {
    value: string;
    label: string;
}

/** Starting designs a template without a recorded origin can be reset to. */
export function useTemplateOrigins(enabled: boolean) {
    return useQuery({
        queryKey: ["email-template-origins"],
        enabled,
        staleTime: Infinity,
        queryFn: async () => (await api.get<{ origins: OriginChoice[] }>("/email-templates/origins")).origins,
    });
}

export interface DefaultTreeResult {
    tree: EmailTree;
    origin: TemplateOriginRef;
    label: string;
    /** Why this design: picked, made from it, or the WooCommerce email using the template. */
    reason: "picked" | "recorded" | "woo_assigned" | "none";
}

/**
 * The default design for a template, from its own origin or a picked one
 * (`kind:ref`). Read-only: the editor applies it as an undoable edit.
 */
export function useDefaultTree(id: number, origin: string, enabled: boolean) {
    return useQuery({
        queryKey: ["email-template-default", id, origin],
        enabled,
        retry: false,
        // Rebuilt from the current global layout each time the dialog opens.
        gcTime: 0,
        queryFn: async () =>
            api.get<DefaultTreeResult>(
                `/email-templates/${id}/default${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`,
            ),
    });
}
