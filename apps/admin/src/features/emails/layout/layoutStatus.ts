import { __, sprintf } from "@/lib/i18n";
import type { EmailElement, TreeSettings } from "../types";
import type { EmailLayout } from "./useEmailLayout";
import { partBlocks, partMode, setFor, type PartMode } from "./partModes";

export type LayoutStatusTone = "on" | "muted" | "warn";

export interface LayoutStatus {
    /** Short text for the badge. */
    label: string;
    tone: LayoutStatusTone;
    /** Longer explanation, for the badge's tooltip. */
    detail: string;
}

/**
 * What the global header/footer does for one email: which set it gets, whether
 * the template hides a part, and whether the set replaces its own logo or
 * footer. `settings` is the template's design settings ({} for the built-in
 * default design of a WooCommerce email); `kind` says which scope it falls under.
 */
export function layoutStatus(
    settings: TreeSettings,
    elements: EmailElement[],
    layout: EmailLayout,
    kind: "woo" | "form",
): LayoutStatus {
    if (layout.scope === "woocommerce" && kind === "form") {
        return {
            label: __("Not applied"),
            tone: "muted",
            detail: __("The global header and footer are set to WooCommerce emails only."),
        };
    }

    const header = partMode(settings, "header");
    const footer = partMode(settings, "footer");
    const set = setFor(settings, layout);
    const usesSet = (header === "global" || footer === "global") && set !== null;

    if (!usesSet && header !== "override" && footer !== "override") {
        return {
            label: __("No header/footer"),
            tone: "muted",
            detail: __("This template opted out of the global header and footer."),
        };
    }

    const has = (type: string) => elements.some((el) => el.type === type);
    const notes: string[] = [];
    if (partBlocks(settings, layout, "header").some((el) => el.type === "logo") && has("logo")) {
        notes.push(__("The header's logo replaces this template's own logo."));
    }
    if (partBlocks(settings, layout, "footer").some((el) => el.type === "footer_text") && has("footer_text")) {
        notes.push(__("The footer replaces this template's own footer."));
    }

    const describe = (mode: PartMode, part: "header" | "footer") => {
        if (mode === "override") return part === "header" ? __("own header") : __("own footer");
        if (mode === "disabled" || !set) return part === "header" ? __("no header") : __("no footer");
        return "";
    };
    const extras = [describe(header, "header"), describe(footer, "footer")].filter(Boolean);
    const base = usesSet && set ? set.name : __("Custom");
    const label = extras.length > 0 ? sprintf(__("%1$s · %2$s"), base, extras.join(", ")) : base;

    const details: string[] = [];
    if (usesSet && set) details.push(sprintf(__("Uses the “%s” header and footer."), set.name));
    if (header === "override") details.push(__("The header is this email's own copy."));
    if (footer === "override") details.push(__("The footer is this email's own copy."));
    if (header === "disabled") details.push(__("The header is turned off for this email."));
    if (footer === "disabled") details.push(__("The footer is turned off for this email."));

    return {
        label,
        tone: header === "global" && footer === "global" ? "on" : "warn",
        detail: [...details, ...notes].join(" "),
    };
}
