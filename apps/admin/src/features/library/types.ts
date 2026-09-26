/**
 * Library object model (PRODUCT_DESIGN.md section B). Patterns compose into
 * Templates and Recipes, which are curated into Packs. All four are the same
 * shape to keep the mental model and the code surface small; a Pack adds a
 * contents summary.
 */

export type AssetType = "template" | "pattern" | "recipe" | "pack" | "bundle";

/** Which builder an asset targets. Drives the "For:" facet. */
export type AssetKind = "form" | "email" | "workflow" | "woocommerce";

/** How a user gets the asset. Free installs directly; paid needs a purchase. */
export type Ownership = "free" | "pro" | "paid";

export interface LibraryAsset {
    id: string;
    type: AssetType;
    name: string;
    description: string;
    category: string;
    kind: AssetKind;
    ownership: Ownership;
    /** Display price for paid packs, e.g. "$29". Only set when ownership is "paid". */
    price?: string;
    /** True when the asset's automation needs Pro capabilities to run. */
    requiresPro?: boolean;
    /** True once installed / saved into this site's My Library. */
    installed?: boolean;
    /** True once the entitlement is owned but not yet installed. */
    purchased?: boolean;
    /** True when an installed pack has a newer version available. */
    updateAvailable?: boolean;
}

/** A Pack is a LibraryAsset (type "pack") plus a contents breakdown. */
export interface Pack extends LibraryAsset {
    type: "pack";
    contents: {
        forms: number;
        emails: number;
        workflows: number;
        patterns: number;
    };
    version: string;
    /** Requirement line, e.g. "FormFlow 1.x". */
    compatibility: string;
}

/** One named item in a pack, for the detail / import review list. */
export interface PackItem {
    ref: string;
    name: string;
    requiresPro: boolean;
}

/** One changelog entry, newest first, shown on the update screen. */
export interface PackChangelogEntry {
    version: string;
    notes: string[];
}

/** A Pack plus its named content lists and this site's install eligibility. */
export interface PackDetail extends Pack {
    items: {
        forms: PackItem[];
        emails: PackItem[];
        workflows: PackItem[];
        patterns: PackItem[];
    };
    /** False when the pack needs Pro this site does not have. */
    canInstall: boolean;
    /** True once this site owns the pack (a Free pack is owned by everyone). */
    purchased: boolean;
    changelog: PackChangelogEntry[];
}

/** A catalog bundle: member packs presented at a combined price. */
export interface Bundle {
    id: string;
    type: "bundle";
    name: string;
    description: string;
    category: string;
    kind: AssetKind;
    ownership: Ownership;
    price?: string;
    /** The un-bundled total, for the savings line. */
    listPrice?: string;
    memberCount: number;
    members: { id: string; name: string }[];
}

/** How the user wants to resolve one item in a pack update. */
export type UpdateAction = "take_update" | "keep_mine" | "keep_both";

/** One item's place in a pack update diff. */
export interface PackDiffItem {
    ref: string;
    name: string;
    kind: AssetKind;
    /** new | update | conflict | unchanged | removed. */
    status: string;
    /** The protective default action. */
    action: UpdateAction;
    modified: boolean;
}

/** The full diff between an installed pack and its newest version. */
export interface PackDiff {
    pack: string;
    name: string;
    fromVersion: string;
    toVersion: string;
    changelog: PackChangelogEntry[];
    summary: { new: number; update: number; conflict: number; unchanged: number; removed: number };
    items: PackDiffItem[];
}

/** What an update applied. */
export interface UpdateSummary {
    pack: string;
    applied: { updated: number; kept: number; added: number; unchanged: number };
}

/** What an import created and what it skipped (Pro-only content on Free). */
export interface ImportSummary {
    pack: string;
    created: { forms: number; emails: number; workflows: number; patterns: number };
    skipped: { name: string; reason: string }[];
}

/** The raw My Library row as stored and returned by the server. */
export interface SavedAsset {
    id: number;
    uuid: string;
    type: AssetType;
    name: string;
    kind: AssetKind;
    payload: Record<string, unknown>;
    source: { pack: string; contentId: string; version: string };
    created_at: string;
    updated_at: string;
}

export type LibraryTab = "catalog" | "mine";
export type TypeFacet = "all" | AssetType;
export type OwnershipFacet = "all" | "free" | "pro" | "purchased" | "installed";
