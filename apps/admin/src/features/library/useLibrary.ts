import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { __ } from "@/lib/i18n";
import type {
    AssetKind,
    AssetType,
    ImportSummary,
    LibraryAsset,
    Pack,
    PackDetail,
    SavedAsset,
} from "./types";

interface CatalogResponse {
    items: LibraryAsset[];
}

interface PackResponse {
    pack: PackDetail;
}

interface ImportResponse {
    summary: ImportSummary;
}

interface MineResponse {
    items: SavedAsset[];
}

interface SaveResponse {
    asset: SavedAsset;
}

/** The discoverable Flexa Library catalog (templates, patterns, recipes, packs). */
export function useCatalog() {
    return useQuery<LibraryAsset[]>({
        queryKey: ["library", "catalog"],
        queryFn: async () => (await api.get<CatalogResponse>("/library/catalog")).items,
        staleTime: 5 * 60_000,
    });
}

/** Packs derived from the catalog, for the Dashboard row and the pack detail page. */
export function usePacks() {
    const query = useCatalog();
    return {
        ...query,
        data: (query.data ?? []).filter((a): a is Pack => a.type === "pack"),
    };
}

/** Full pack detail (named contents + install eligibility) for the pack page. */
export function usePackDetail(id: string) {
    return useQuery<PackDetail>({
        queryKey: ["library", "pack", id],
        queryFn: async () => (await api.get<PackResponse>(`/library/packs/${id}`)).pack,
        staleTime: 60_000,
    });
}

/** Import a pack: materializes its contents, then refreshes the catalog + My Library. */
export function useImportPack(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => (await api.post<ImportResponse>(`/library/packs/${id}/import`, {})).summary,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library"] });
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

/** My Library: the user's saved reusable assets, mapped to the card display shape. */
export function useMyLibrary() {
    return useQuery<{ display: LibraryAsset; raw: SavedAsset }[]>({
        queryKey: ["library", "mine"],
        queryFn: async () => {
            const items = (await api.get<MineResponse>("/library/mine")).items;
            return items.map((raw) => ({ raw, display: savedToDisplay(raw) }));
        },
        staleTime: 30_000,
    });
}

export interface SaveToLibraryInput {
    type: AssetType;
    name: string;
    kind: AssetKind;
    payload: Record<string, unknown>;
}

/** Save-as-pattern/template/recipe. The builder sends the payload it already holds. */
export function useSaveToLibrary() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: SaveToLibraryInput) =>
            (await api.post<SaveResponse>("/library/mine", input as unknown as Record<string, unknown>)).asset,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library", "mine"] });
        },
    });
}

export function useDeleteLibraryAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/library/mine/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library", "mine"] });
        },
    });
}

const TYPE_NOUN: Record<AssetType, () => string> = {
    template: () => __("Saved template"),
    pattern: () => __("Saved pattern"),
    recipe: () => __("Saved recipe"),
    pack: () => __("Saved pack"),
};

/** A saved asset has no marketing copy, so present it as an installed, free item. */
function savedToDisplay(raw: SavedAsset): LibraryAsset {
    return {
        id: `mine-${raw.id}`,
        type: raw.type,
        name: raw.name,
        description: raw.source.pack
            ? __("From a pack. Yours to edit and reuse.")
            : TYPE_NOUN[raw.type](),
        category: __("Saved"),
        kind: raw.kind,
        ownership: "free",
        installed: true,
    };
}
