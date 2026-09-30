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

/** One named header + footer pair. */
export interface LayoutSet {
    id: string;
    name: string;
    header: EmailElement[];
    footer: EmailElement[];
}

export interface LayoutPreset {
    key: string;
    label: string;
}

export interface EmailLayout {
    enabled: boolean;
    scope: LayoutScope;
    /** Id of the set templates use unless they pick another. */
    default: string;
    sets: LayoutSet[];
    /** The default set's blocks, for callers that only care about it. */
    header: EmailElement[];
    footer: EmailElement[];
    overlap: LayoutOverlapRow[];
    presets: LayoutPreset[];
}

const KEY = ["email-layout"];

export function useEmailLayout() {
    return useQuery({
        queryKey: KEY,
        queryFn: async () => api.get<EmailLayout>("/email-layout"),
    });
}

export type LayoutPatch = Partial<Pick<EmailLayout, "enabled" | "scope" | "default">>;

/** Every response carries the whole layout (sets, overlap list), so the cache always matches the server. */
function useLayoutMutation<V, R extends EmailLayout = EmailLayout>(request: (vars: V) => Promise<R>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: request,
        onSuccess: (layout) => {
            queryClient.setQueryData(KEY, layout);
            // Which set a template uses, or its overlap, may have changed with the sets.
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

/** The switch, scope and default set save on their own. */
export function useSaveEmailLayout() {
    return useLayoutMutation((patch: LayoutPatch) =>
        api.put<EmailLayout>("/email-layout", patch as unknown as Record<string, unknown>),
    );
}

/** Add a set from a preset (`blank`, `classic`, `modern`) or as a copy of `from`. */
export function useAddLayoutSet() {
    return useLayoutMutation((vars: { preset?: string; from?: string; name?: string }) =>
        api.post<EmailLayout & { created: string }>("/email-layout/sets", vars),
    );
}

export type LayoutSetPatch = Partial<Pick<LayoutSet, "name" | "header" | "footer">>;

export function updateLayoutSet(id: string, patch: LayoutSetPatch) {
    return api.put<EmailLayout>(`/email-layout/sets/${id}`, patch as unknown as Record<string, unknown>);
}

export function useUpdateLayoutSet() {
    return useLayoutMutation((vars: { id: string; patch: LayoutSetPatch }) => updateLayoutSet(vars.id, vars.patch));
}

export function useDeleteLayoutSet() {
    return useLayoutMutation((id: string) => api.delete<EmailLayout>(`/email-layout/sets/${id}`));
}

/** What a template's header/footer settings were before a bulk change, for undoing it. */
export interface LayoutAssignBackup {
    id: number;
    layoutSet?: string;
    hideGlobalHeader?: boolean;
    hideGlobalFooter?: boolean;
}

export interface LayoutAssignResult extends EmailLayout {
    changed: number;
    previous?: LayoutAssignBackup[];
}

/**
 * Change many templates at once: `set` is "" (the default set), "none" or a set
 * id; `show_parts` clears their hide-header / hide-footer switches. `restore`
 * puts back what an earlier call reported in `previous`.
 */
export function useApplyLayout() {
    return useLayoutMutation((vars: { ids?: number[]; set?: string; show_parts?: boolean; restore?: LayoutAssignBackup[] }) =>
        api.post<LayoutAssignResult>("/email-layout/apply", vars as unknown as Record<string, unknown>),
    );
}
