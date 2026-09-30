import { __, sprintf } from "@/lib/i18n";
import type { EmailElement, TreeSettings } from "../types";
import type { EmailLayout } from "./useEmailLayout";

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

    if (settings.layoutSet === "none") {
        return {
            label: __("No header/footer"),
            tone: "muted",
            detail: __("This template opted out of the global header and footer."),
        };
    }

    const set = layout.sets.find((s) => s.id === settings.layoutSet) ?? layout.sets.find((s) => s.id === layout.default);
    if (!set) {
        return { label: "—", tone: "muted", detail: "" };
    }

    const hideHeader = Boolean(settings.hideGlobalHeader);
    const hideFooter = Boolean(settings.hideGlobalFooter);
    const has = (type: string) => elements.some((el) => el.type === type);
    const notes: string[] = [];
    if (!hideHeader && set.header.some((el) => el.type === "logo") && has("logo")) {
        notes.push(__("The set's logo replaces this template's own logo."));
    }
    if (!hideFooter && set.footer.some((el) => el.type === "footer_text") && has("footer_text")) {
        notes.push(__("The set's footer replaces this template's own footer."));
    }

    let label = set.name;
    if (hideHeader && hideFooter) label = sprintf(__("%s · hidden"), set.name);
    else if (hideHeader) label = sprintf(__("%s · no header"), set.name);
    else if (hideFooter) label = sprintf(__("%s · no footer"), set.name);

    return {
        label,
        tone: hideHeader || hideFooter ? "warn" : "on",
        detail: [sprintf(__("Uses the “%s” header and footer."), set.name), ...notes].join(" "),
    };
}
