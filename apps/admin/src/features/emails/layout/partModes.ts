import { cloneElementWithIds, type EmailElement, type TreeSettings } from "../types";
import type { EmailLayout } from "./useEmailLayout";

export type LayoutPart = "header" | "footer";

/**
 * How an email treats one part of the global header & footer. Mirrors
 * Emails\LayoutParts::mode() on the server:
 * - `global`: shows the set's part by reference (edits to the set reach it);
 * - `override`: shows the email's own snapshot;
 * - `disabled`: shows nothing.
 */
export type PartMode = "global" | "override" | "disabled";

const HIDE_KEY = { header: "hideGlobalHeader", footer: "hideGlobalFooter" } as const;
const OVERRIDE_KEY = { header: "headerOverride", footer: "footerOverride" } as const;

export function partMode(settings: TreeSettings, part: LayoutPart): PartMode {
    if (settings[HIDE_KEY[part]]) return "disabled";
    return Array.isArray(settings[OVERRIDE_KEY[part]]) ? "override" : "global";
}

export function overrideKey(part: LayoutPart): "headerOverride" | "footerOverride" {
    return OVERRIDE_KEY[part];
}

/** The set an email's global parts come from: its pick, else the default. Null for "none". */
export function setFor(settings: TreeSettings, layout: EmailLayout) {
    if (settings.layoutSet === "none") return null;
    return (
        layout.sets.find((s) => s.id === settings.layoutSet) ?? layout.sets.find((s) => s.id === layout.default) ?? null
    );
}

/** The blocks one part resolves to for these settings (what the email will show). */
export function partBlocks(settings: TreeSettings, layout: EmailLayout, part: LayoutPart): EmailElement[] {
    switch (partMode(settings, part)) {
        case "disabled":
            return [];
        case "override":
            return settings[OVERRIDE_KEY[part]] ?? [];
        default:
            return setFor(settings, layout)?.[part] ?? [];
    }
}

/**
 * Switch one part's mode. Choosing `override` snapshots the blocks the email
 * shows right now (the set's part, with fresh ids) so it starts identical and
 * then stays independent; an existing override is kept as it is.
 */
export function withPartMode(
    settings: TreeSettings,
    part: LayoutPart,
    mode: PartMode,
    layout: EmailLayout | undefined,
): TreeSettings {
    const next: TreeSettings = { ...settings };
    delete next[HIDE_KEY[part]];
    if (mode === "disabled") {
        delete next[OVERRIDE_KEY[part]];
        next[HIDE_KEY[part]] = true;
    } else if (mode === "global") {
        delete next[OVERRIDE_KEY[part]];
    } else if (!Array.isArray(settings[OVERRIDE_KEY[part]])) {
        const source = layout ? (setFor(settings, layout) ?? layout.sets.find((s) => s.id === layout.default)) : undefined;
        next[OVERRIDE_KEY[part]] = (source?.[part] ?? []).map(cloneElementWithIds);
    }
    return next;
}
