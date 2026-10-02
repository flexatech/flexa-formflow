import {
    AlignLeft,
    Code,
    Columns3,
    Heading1,
    Image,
    ImagePlus,
    MapPin,
    Minus,
    Menu,
    MousePointerClick,
    MoveVertical,
    Receipt,
    Share2,
    Table,
    Text,
    type LucideIcon,
} from "lucide-react";
import { __ } from "@/lib/i18n";
import type { ConditionSet } from "@/components/custom/SchemaFields";
import { parseLegacyMenu } from "./navigation";

/**
 * TS mirror of the email tree contract (see docs/M2_PLAN.md) and of the PHP
 * render pipeline in src/Emails/. The block set is flexa-mail's minus the Woo
 * blocks, plus `fields_table`. Add a block in both places or nowhere.
 */

export interface TreeSettings {
    backgroundColor?: string;
    contentBackground?: string;
    textColor?: string;
    /** Falls back to textColor when blank. */
    headingColor?: string;
    /** Falls back to brandColor when blank. */
    linkColor?: string;
    brandColor?: string;
    fontFamily?: string;
    width?: number;
    /** Text direction of the whole email; defaults to ltr. */
    direction?: "ltr" | "rtl";
    /** Header/footer set id, or "none"; unset means the default set. */
    layoutSet?: string;
    /** Opt this template out of one part of the global header / footer ("Disabled"). */
    hideGlobalHeader?: boolean;
    hideGlobalFooter?: boolean;
    /**
     * This email's own copy of a global part ("Override for this email"). A
     * snapshot taken when the mode was chosen; later edits to the global set do
     * not reach it.
     */
    headerOverride?: EmailElement[];
    footerOverride?: EmailElement[];
}

export interface EmailElement {
    id: string;
    type: string;
    props: Record<string, unknown>;
    /**
     * Present only on the `columns` layout block: one child list per column.
     * Nesting is one level deep (a column cannot itself hold a `columns` block).
     */
    columns?: EmailElement[][];
    /**
     * Optional form-entry visibility rules. When present with rules, the block
     * is hidden at send time unless the entry matches (see src/Emails/Render/
     * Visibility.php). Absent or empty means the block is always shown.
     */
    visibility?: ConditionSet;
}

/** The block type that holds columns of child blocks. */
export const LAYOUT_TYPE = "columns";

export function isLayout(type: string): boolean {
    return type === LAYOUT_TYPE;
}

/** Where a template's design came from; "Reset to default" rebuilds from it. */
export interface TemplateOriginRef {
    kind: "form" | "woo" | "pack" | "blank";
    ref: string;
}

export interface EmailTree {
    version: number;
    settings: TreeSettings;
    elements: EmailElement[];
    origin?: TemplateOriginRef;
}

/**
 * What the editor preview, the Dynamic Data samples and a test send render
 * with: sample data, a form's latest entry, or a WooCommerce order. At most one
 * of the ids is set. `label` is what the picker shows.
 */
export interface PreviewSource {
    formId: number;
    orderId: number;
    label: string;
}

export function sampleSource(): PreviewSource {
    return { formId: 0, orderId: 0, label: __("Sample data") };
}

export interface EmailTemplate {
    id: number;
    title: string;
    tree: EmailTree;
    created_at: string;
    updated_at: string;
}

/** One dynamic-data source: a token, its label and a live sample value. */
export interface DynamicDataItem {
    token: string;
    label: string;
    sample: string;
}

/** A group of dynamic-data sources (Form fields, Submission, Site, Order data). */
export interface DynamicDataCategory {
    key: string;
    label: string;
    items: DynamicDataItem[];
}

export interface FieldSpec {
    key: string;
    label: string;
    /** `richtext`: visual inline editor; `navitems`: a Navigation block's link list; `image`: Media Library picker. */
    type: "text" | "textarea" | "richtext" | "number" | "color" | "select" | "url" | "switch" | "navitems" | "image";
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    placeholder?: string;
    /** Small hint under the label. */
    help?: string;
    /** `image` fields: the prop a picked image's alt text fills while it is empty. */
    altKey?: string;
    /** Show this field only while another prop of the block has this value. */
    showIf?: { key: string; equals: unknown } | { key: string; in: unknown[] };
}

export interface ElementDef {
    type: string;
    label: string;
    description: string;
    icon: LucideIcon;
    fields: FieldSpec[];
    defaults: Record<string, unknown>;
    /** Offered in the palette only when this plugin is active (the PHP side registers it only then). */
    requires?: "woocommerce";
}

const ALIGN: FieldSpec = {
    key: "align",
    label: __("Alignment"),
    type: "select",
    options: [
        { value: "left", label: __("Left") },
        { value: "center", label: __("Center") },
        { value: "right", label: __("Right") },
    ],
};

export const ELEMENT_TYPES: ElementDef[] = [
    {
        type: "logo",
        label: __("Logo"),
        description: __("Your brand logo, links to the site"),
        icon: Image,
        defaults: {
            image: "{site_logo_url}",
            width: 160,
            align: "center",
            alt: "{site_title}",
            link: "{site_url}",
            color: "",
            paddingTop: 28,
            paddingBottom: 12,
        },
        fields: [
            {
                key: "image",
                label: __("Image"),
                type: "image",
                altKey: "alt",
                placeholder: "https://…/logo.png",
                help: __("{site_logo_url} uses your site logo. Without a logo, the site name shows instead."),
            },
            { key: "width", label: __("Width (px)"), type: "number", min: 40, max: 600 },
            ALIGN,
            { key: "link", label: __("Link"), type: "text" },
            { key: "alt", label: __("Alt text"), type: "text" },
            { key: "color", label: __("Site name color"), type: "color", help: __("Used when the site name stands in for a logo.") },
            { key: "paddingTop", label: __("Space above (px)"), type: "number", min: 0, max: 80 },
            { key: "paddingBottom", label: __("Space below (px)"), type: "number", min: 0, max: 80 },
        ],
    },
    {
        type: "heading",
        label: __("Heading"),
        description: __("Large title text"),
        icon: Heading1,
        defaults: { text: __("Thanks for reaching out!"), align: "left", fontSize: 24, color: "" },
        fields: [
            { key: "text", label: __("Text"), type: "textarea" },
            ALIGN,
            { key: "fontSize", label: __("Font size"), type: "number", min: 12, max: 48 },
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "text",
        label: __("Text"),
        description: __("Paragraph with tokens"),
        icon: Text,
        defaults: { html: __("Hi there,"), align: "left", fontSize: 15, color: "" },
        fields: [
            { key: "html", label: __("Text"), type: "richtext" },
            ALIGN,
            { key: "fontSize", label: __("Font size"), type: "number", min: 10, max: 32 },
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "button",
        label: __("Button"),
        description: __("Call-to-action button"),
        icon: MousePointerClick,
        defaults: {
            text: __("Visit our site"),
            url: "{site_url}",
            align: "center",
            bgColor: "",
            textColor: "#ffffff",
            radius: 6,
            fontSize: 15,
        },
        fields: [
            { key: "text", label: __("Label"), type: "text" },
            { key: "url", label: __("URL"), type: "text" },
            ALIGN,
            { key: "bgColor", label: __("Background"), type: "color" },
            { key: "textColor", label: __("Text color"), type: "color" },
            { key: "radius", label: __("Corner radius"), type: "number", min: 0, max: 30 },
        ],
    },
    {
        type: "image",
        label: __("Image"),
        description: __("Banner or content image"),
        icon: ImagePlus,
        defaults: { url: "", width: 0, align: "center", alt: "", link: "" },
        fields: [
            { key: "url", label: __("Image"), type: "image", altKey: "alt", placeholder: "https://…/banner.jpg" },
            { key: "width", label: __("Width (px, 0 = full)"), type: "number", min: 0, max: 800 },
            ALIGN,
            { key: "link", label: __("Link"), type: "text" },
            { key: "alt", label: __("Alt text"), type: "text" },
        ],
    },
    {
        type: "divider",
        label: __("Divider"),
        description: __("Horizontal line"),
        icon: Minus,
        defaults: { color: "#e6e6e6", thickness: 1, paddingY: 8 },
        fields: [
            { key: "color", label: __("Color"), type: "color" },
            { key: "thickness", label: __("Thickness"), type: "number", min: 1, max: 8 },
            { key: "paddingY", label: __("Vertical padding"), type: "number", min: 0, max: 60 },
        ],
    },
    {
        type: "spacer",
        label: __("Spacer"),
        description: __("Vertical empty space"),
        icon: MoveVertical,
        defaults: { height: 24 },
        fields: [{ key: "height", label: __("Height (px)"), type: "number", min: 4, max: 160 }],
    },
    {
        type: LAYOUT_TYPE,
        label: __("Columns"),
        description: __("A grid row: drop blocks into each column"),
        icon: Columns3,
        defaults: { gap: 16 },
        // Column count is edited with a dedicated control (it resizes the child
        // lists), so it is not a plain prop field here.
        fields: [{ key: "gap", label: __("Gap between columns (px)"), type: "number", min: 0, max: 40 }],
    },
    {
        type: "social",
        label: __("Social links"),
        description: __("Links to your social profiles"),
        icon: Share2,
        defaults: {
            align: "center",
            facebook: "",
            instagram: "",
            x: "",
            tiktok: "",
            youtube: "",
            pinterest: "",
            website: "",
        },
        fields: [
            ALIGN,
            { key: "color", label: __("Link color"), type: "color" },
            { key: "facebook", label: "Facebook", type: "url" },
            { key: "instagram", label: "Instagram", type: "url" },
            { key: "x", label: "X", type: "url" },
            { key: "tiktok", label: "TikTok", type: "url" },
            { key: "youtube", label: "YouTube", type: "url" },
            { key: "pinterest", label: "Pinterest", type: "url" },
            { key: "website", label: __("Website"), type: "url" },
        ],
    },
    {
        type: "navigation",
        label: __("Navigation"),
        description: __("A row of links, like a menu"),
        icon: Menu,
        defaults: {
            items: [
                { id: "nav_home", label: __("Home"), url: "{site_url}" },
                { id: "nav_contact", label: __("Contact"), url: "mailto:{admin_email}" },
            ],
            align: "center",
            gap: 16,
            fontSize: 14,
            color: "",
            separator: "none",
            paddingY: 12,
        },
        fields: [
            { key: "items", label: __("Links"), type: "navitems" },
            ALIGN,
            {
                key: "separator",
                label: __("Separator"),
                type: "select",
                options: [
                    { value: "none", label: __("None") },
                    { value: "dot", label: __("Dot (·)") },
                    { value: "pipe", label: __("Bar (|)") },
                ],
            },
            { key: "gap", label: __("Space between links (px)"), type: "number", min: 0, max: 48 },
            { key: "fontSize", label: __("Text size (px)"), type: "number", min: 10, max: 24 },
            { key: "color", label: __("Link color"), type: "color" },
            { key: "paddingY", label: __("Space above and below (px)"), type: "number", min: 0, max: 60 },
        ],
    },
    {
        type: "fields_table",
        label: __("Submitted fields"),
        description: __("A table of the form's answers"),
        icon: Table,
        defaults: { title: __("Submission"), borderColor: "#e6e6e6" },
        fields: [
            { key: "title", label: __("Title"), type: "text" },
            { key: "borderColor", label: __("Border color"), type: "color" },
        ],
    },
    {
        type: "order_details",
        label: __("Order details"),
        description: __("WooCommerce line items and totals"),
        icon: Receipt,
        requires: "woocommerce",
        defaults: {
            title: __("Order summary"),
            borderColor: "#e6e6e6",
            fontSize: 14,
            headingSize: 14,
            titleColor: "",
            textColor: "",
            backgroundColor: "",
            paddingY: 12,
            paddingX: 40,
            showHeader: false,
            labelProduct: __("Product"),
            labelTotal: __("Price"),
            showImage: false,
            imageSize: "small",
            showLink: false,
            showSku: false,
            showMeta: false,
            showDescription: false,
            showItemPrice: false,
            showRegularPrice: false,
            showNote: false,
            labelNote: __("Note"),
        },
        fields: [
            { key: "title", label: __("Title"), type: "text" },
            { key: "borderColor", label: __("Border color"), type: "color" },
            { key: "titleColor", label: __("Title color"), type: "color" },
            { key: "textColor", label: __("Text color"), type: "color" },
            { key: "backgroundColor", label: __("Background color"), type: "color" },
            { key: "fontSize", label: __("Text size (px)"), type: "number", min: 11, max: 22 },
            { key: "paddingY", label: __("Space above and below (px)"), type: "number", min: 0, max: 80 },
            { key: "paddingX", label: __("Space left and right (px)"), type: "number", min: 0, max: 80 },
            { key: "showImage", label: __("Product image"), type: "switch" },
            {
                key: "imageSize",
                label: __("Image size"),
                type: "select",
                options: [
                    { value: "small", label: __("Small (48px)") },
                    { value: "medium", label: __("Medium (72px)") },
                ],
                showIf: { key: "showImage", equals: true },
            },
            { key: "showLink", label: __("Link product names"), type: "switch" },
            { key: "showSku", label: __("SKU"), type: "switch" },
            { key: "showMeta", label: __("Variations and options"), type: "switch", help: __("Size, color and other choices") },
            { key: "showDescription", label: __("Short description"), type: "switch" },
            { key: "showItemPrice", label: __("Price of one item"), type: "switch" },
            {
                key: "showRegularPrice",
                label: __("Show the regular price when on sale"),
                type: "switch",
                showIf: { key: "showItemPrice", equals: true },
            },
            { key: "showHeader", label: __("Table header row"), type: "switch" },
            { key: "headingSize", label: __("Header text size (px)"), type: "number", min: 11, max: 22, showIf: { key: "showHeader", equals: true } },
            { key: "labelProduct", label: __("Product column title"), type: "text", showIf: { key: "showHeader", equals: true } },
            { key: "labelTotal", label: __("Price column title"), type: "text", showIf: { key: "showHeader", equals: true } },
            { key: "showNote", label: __("Customer note"), type: "switch", help: __("Shown when the customer left one") },
            { key: "labelNote", label: __("Note label"), type: "text", showIf: { key: "showNote", equals: true } },
        ],
    },
    {
        type: "order_address",
        label: __("Addresses"),
        description: __("WooCommerce billing and shipping address"),
        icon: MapPin,
        requires: "woocommerce",
        defaults: {
            mode: "both",
            layout: "columns",
            billingTitle: __("Billing address"),
            shippingTitle: __("Shipping address"),
            showPhone: true,
            showEmail: true,
            borderColor: "#e6e6e6",
            titleColor: "",
            textColor: "",
            backgroundColor: "",
            fontSize: 14,
            paddingY: 12,
            paddingX: 40,
        },
        fields: [
            {
                key: "mode",
                label: __("Show"),
                type: "select",
                options: [
                    { value: "both", label: __("Billing and shipping") },
                    { value: "billing", label: __("Billing address only") },
                    { value: "shipping", label: __("Shipping address only") },
                ],
                help: __("The shipping address only appears when the order is shipped."),
            },
            {
                key: "layout",
                label: __("Layout"),
                type: "select",
                options: [
                    { value: "columns", label: __("Side by side") },
                    { value: "stacked", label: __("One under the other") },
                ],
                help: __("Side by side still stacks on phones."),
                showIf: { key: "mode", equals: "both" },
            },
            { key: "billingTitle", label: __("Billing title"), type: "text", showIf: { key: "mode", in: ["both", "billing"] } },
            { key: "shippingTitle", label: __("Shipping title"), type: "text", showIf: { key: "mode", in: ["both", "shipping"] } },
            { key: "showPhone", label: __("Phone number"), type: "switch" },
            { key: "showEmail", label: __("Email address"), type: "switch", help: __("Under the billing address") },
            { key: "borderColor", label: __("Border color"), type: "color" },
            { key: "titleColor", label: __("Title color"), type: "color" },
            { key: "textColor", label: __("Text color"), type: "color" },
            { key: "backgroundColor", label: __("Background color"), type: "color" },
            { key: "fontSize", label: __("Text size (px)"), type: "number", min: 11, max: 22 },
            { key: "paddingY", label: __("Space above and below (px)"), type: "number", min: 0, max: 80 },
            { key: "paddingX", label: __("Space left and right (px)"), type: "number", min: 0, max: 80 },
        ],
    },
    {
        type: "footer_text",
        label: __("Footer"),
        description: __("Small print at the bottom"),
        icon: AlignLeft,
        defaults: { html: "", align: "center", color: "#8a8a8a" },
        fields: [
            {
                key: "html",
                label: __("Text"),
                type: "richtext",
                placeholder: __("Leave empty to use the site-wide footer from Settings"),
            },
            ALIGN,
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "html",
        label: __("Custom HTML"),
        description: __("Your own markup (email-safe subset)"),
        icon: Code,
        defaults: { code: "" },
        fields: [{ key: "code", label: __("HTML"), type: "textarea" }],
    },
];

/**
 * Props every block accepts. `background` paints a section color behind the
 * block (see Renderer::with_background()), which is how a heading, a text and a
 * button read as one banner.
 */
export const COMMON_FIELDS: FieldSpec[] = [
    {
        key: "background",
        label: __("Section background"),
        type: "color",
        help: __("Fills the full width behind this block. Give neighbouring blocks the same color to make one band."),
    },
];

export function elementDef(type: string): ElementDef | undefined {
    return ELEMENT_TYPES.find((def) => def.type === type);
}

/** The blocks the palette offers on this site (WooCommerce blocks need WooCommerce). */
export function availableElementTypes(): ElementDef[] {
    // wp_localize_script sends booleans as "1" / "", so coerce.
    const hasWoo = Boolean(window.flexaFormFlow?.hasWooCommerce);
    return ELEMENT_TYPES.filter((def) => def.requires !== "woocommerce" || hasWoo);
}

/** Whether a field's `showIf` condition holds for the block's current props. */
export function fieldVisible(field: FieldSpec, props: Record<string, unknown>, defaults: Record<string, unknown>): boolean {
    const rule = field.showIf;
    if (!rule) return true;
    const current = props[rule.key] ?? defaults[rule.key];
    return "in" in rule ? rule.in.includes(current) : current === rule.equals;
}

/**
 * dataTransfer MIME used when dragging a palette block onto the preview canvas.
 * The payload is the block `type`. Custom subtype so the drop target can tell a
 * block drag from any other drag entering the iframe.
 */
export const BLOCK_DRAG_TYPE = "application/x-ff-block";

/**
 * dataTransfer MIME used when dragging an existing block already on the canvas
 * to a new position. The payload is the element `id`.
 */
export const BLOCK_MOVE_TYPE = "application/x-ff-move";

/**
 * dataTransfer MIME used when dragging a curated pattern onto the canvas. The
 * payload is the pattern `id`; the editor resolves it to its blocks and drops
 * the whole group at the target.
 */
export const BLOCK_PATTERN_TYPE = "application/x-ff-pattern";

/**
 * One block inside a curated pattern (served by GET /emails/patterns). It has
 * no id: the editor assigns fresh ids when the pattern is inserted, so the
 * inserted blocks are normal, editable elements.
 */
export interface PatternBlock {
    type: string;
    props: Record<string, unknown>;
    columns?: PatternBlock[][];
}

/** Where a pattern may be offered. */
export type PatternContext = "email" | "global-header" | "global-footer";

/** The pattern shape this build understands (mirrors Registry::SCHEMA_VERSION). */
export const PATTERN_SCHEMA_VERSION = 1;

/** A curated group of blocks a user can insert and edit afterwards. */
export interface EmailPattern {
    /** Stable id, never a translated label. */
    id: string;
    version: number;
    name: string;
    description: string;
    /** Category key (see PatternCategory). */
    category: string;
    keywords: string[];
    contexts: PatternContext[];
    tier: "free" | "pro";
    /** Integration the pattern needs ("" for none). */
    requires: string;
    /** A Pro pattern on a Free site: previewable, not insertable. */
    locked: boolean;
    blocks: PatternBlock[];
}

export interface PatternCategory {
    key: string;
    label: string;
}

const PATTERN_CONTEXTS: PatternContext[] = ["email", "global-header", "global-footer"];

/**
 * Coerce one pattern from the server (or an add-on built for an older shape)
 * into the current one. Returns null for an entry that cannot be used.
 */
export function normalizePattern(raw: unknown): EmailPattern | null {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const name = typeof r.name === "string" ? r.name : "";
    const blocks = Array.isArray(r.blocks) ? normalizeBlocks(r.blocks, true) : [];
    if (id === "" || name === "" || blocks.length === 0) return null;

    const contexts = Array.isArray(r.contexts)
        ? PATTERN_CONTEXTS.filter((c) => (r.contexts as unknown[]).includes(c))
        : [];
    return {
        id,
        version: typeof r.version === "number" && r.version > 0 ? r.version : 1,
        name,
        description: typeof r.description === "string" ? r.description : "",
        category: typeof r.category === "string" && r.category !== "" ? r.category : "other",
        keywords: Array.isArray(r.keywords) ? r.keywords.filter((k): k is string => typeof k === "string") : [],
        contexts: contexts.length > 0 ? contexts : ["email"],
        tier: r.tier === "pro" ? "pro" : "free",
        requires: typeof r.requires === "string" ? r.requires : "",
        locked: r.locked === true,
        blocks,
    };
}

/**
 * An older pattern's menu was a Text block of anchors. Turn it into a
 * Navigation block when it parses cleanly; anything uncertain stays text.
 */
function upgradeLegacyMenu(block: PatternBlock): PatternBlock {
    if (block.type !== "text" || typeof block.props.html !== "string") return block;
    const align = block.props.align === "left" || block.props.align === "right" ? block.props.align : "center";
    const menu = parseLegacyMenu(block.props.html, align);
    if (!menu || !menu.confident) return block;
    const { html: _html, ...rest } = block.props;
    return { type: "navigation", props: { ...rest, ...menu.props } };
}

function normalizeBlocks(raw: unknown[], allowColumns: boolean): PatternBlock[] {
    const out: PatternBlock[] = [];
    for (const item of raw) {
        if (typeof item !== "object" || item === null) continue;
        const b = item as Record<string, unknown>;
        if (typeof b.type !== "string" || b.type === "") continue;
        if (b.type === LAYOUT_TYPE && !allowColumns) continue;
        const block: PatternBlock = {
            type: b.type,
            props: typeof b.props === "object" && b.props !== null && !Array.isArray(b.props) ? { ...(b.props as Record<string, unknown>) } : {},
        };
        if (b.type === LAYOUT_TYPE) {
            const cols = Array.isArray(b.columns) ? b.columns : [];
            block.columns = cols.slice(0, 4).map((col) => (Array.isArray(col) ? normalizeBlocks(col, false) : []));
        }
        out.push(upgradeLegacyMenu(block));
    }
    return out;
}

/** Whether a pattern matches a search query (name, category label, keywords, description). */
export function patternMatches(pattern: EmailPattern, query: string, categoryLabel = ""): boolean {
    const q = query.trim().toLowerCase();
    if (q === "") return true;
    const haystack = [pattern.name, pattern.description, pattern.category, categoryLabel, ...pattern.keywords]
        .join(" ")
        .toLowerCase();
    return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** The patterns allowed in one editing context (mirrors Registry::allows()). */
export function patternsForContext(patterns: EmailPattern[], context: PatternContext): EmailPattern[] {
    return patterns.filter((p) => p.contexts.includes(context));
}

export interface PatternGroup {
    key: string;
    label: string;
    items: EmailPattern[];
}

/**
 * The palette's list: patterns matching `query`, grouped by category in the
 * registry's order, with counts that reflect the filter. Metadata only, so it
 * is cheap to run on every keystroke.
 */
export function groupPatterns(patterns: EmailPattern[], categories: PatternCategory[], query: string): PatternGroup[] {
    const label = new Map(categories.map((c) => [c.key, c.label]));
    const order = categories.map((c) => c.key);
    const byCategory = new Map<string, EmailPattern[]>();
    for (const pattern of patterns) {
        if (!patternMatches(pattern, query, label.get(pattern.category) ?? "")) continue;
        const list = byCategory.get(pattern.category) ?? [];
        list.push(pattern);
        byCategory.set(pattern.category, list);
    }
    const rank = (key: string) => (order.indexOf(key) === -1 ? order.length : order.indexOf(key));
    return Array.from(byCategory, ([key, items]) => ({ key, label: label.get(key) ?? key, items })).sort(
        (a, b) => rank(a.key) - rank(b.key),
    );
}

/**
 * Turn a pattern's id-less blocks into editable elements with fresh ids. Props
 * are deep-copied, so the inserted blocks share nothing with the pattern.
 */
export function materializePattern(blocks: PatternBlock[]): EmailElement[] {
    return blocks.map(materializeBlock);
}

function materializeBlock(block: PatternBlock): EmailElement {
    const element = newElement(block.type);
    element.props = { ...element.props, ...structuredCloneSafe(block.props) };
    if (block.columns) {
        element.columns = block.columns.map((col) => col.map(materializeBlock));
    }
    return element;
}

function structuredCloneSafe<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Where "insert" puts new blocks: right after the selected block, or at the end
 * when nothing is selected. A block selected inside a column inserts after its
 * columns row, because a pattern may itself contain columns and columns do not
 * nest.
 */
export function insertionTarget(elements: EmailElement[], selectedId: string | null): DropTarget {
    if (selectedId) {
        const top = elements.findIndex((el) => el.id === selectedId);
        if (top !== -1) return { colId: null, colIndex: 0, index: top + 1 };
        const parent = elements.findIndex((el) => el.columns?.some((col) => col.some((child) => child.id === selectedId)));
        if (parent !== -1) return { colId: null, colIndex: 0, index: parent + 1 };
    }
    return { colId: null, colIndex: 0, index: elements.length };
}

/**
 * A drop position in the tree. `colId === null` means the top level; otherwise
 * it points inside the column `colIndex` of the layout block `colId`.
 */
export interface DropTarget {
    colId: string | null;
    colIndex: number;
    index: number;
}

/** Insert `element` at `target`, returning a new elements array. */
export function insertInTree(
    elements: EmailElement[],
    target: DropTarget,
    element: EmailElement,
): EmailElement[] {
    if (target.colId === null) {
        const next = [...elements];
        next.splice(clampIndex(target.index, next.length), 0, element);
        return next;
    }
    return elements.map((el) => {
        if (el.id !== target.colId || !el.columns) return el;
        const columns = el.columns.map((col) => [...col]);
        const col = columns[target.colIndex] ?? (columns[target.colIndex] = []);
        col.splice(clampIndex(target.index, col.length), 0, element);
        return { ...el, columns };
    });
}

/** Insert several elements at `target`, keeping their given order. */
export function insertManyInTree(
    elements: EmailElement[],
    target: DropTarget,
    newElements: EmailElement[],
): EmailElement[] {
    let next = elements;
    let index = target.index;
    for (const element of newElements) {
        next = insertInTree(next, { ...target, index }, element);
        index += 1;
    }
    return next;
}

/**
 * Remove the element with `id` from wherever it sits (top level or inside a
 * column). Returns the pruned array, the removed element, and where it came
 * from so a move can adjust the destination index.
 */
export function removeFromTree(
    elements: EmailElement[],
    id: string,
): { elements: EmailElement[]; removed: EmailElement | null; from: DropTarget | null } {
    const topIndex = elements.findIndex((el) => el.id === id);
    if (topIndex !== -1) {
        const next = [...elements];
        const [removed] = next.splice(topIndex, 1);
        return { elements: next, removed, from: { colId: null, colIndex: 0, index: topIndex } };
    }
    let removed: EmailElement | null = null;
    let from: DropTarget | null = null;
    const next = elements.map((el) => {
        if (removed || !el.columns) return el;
        const columns = el.columns.map((col) => [...col]);
        for (let c = 0; c < columns.length; c++) {
            const i = columns[c].findIndex((child) => child.id === id);
            if (i !== -1) {
                [removed] = columns[c].splice(i, 1);
                from = { colId: el.id, colIndex: c, index: i };
                return { ...el, columns };
            }
        }
        return el;
    });
    return { elements: next, removed, from };
}

/** Move an existing element to `target`, compensating for the index shift. */
export function moveInTree(
    elements: EmailElement[],
    id: string,
    target: DropTarget,
): EmailElement[] {
    const { elements: pruned, removed, from } = removeFromTree(elements, id);
    if (!removed) return elements;
    let index = target.index;
    // Removing an earlier sibling from the same container shifts the target up.
    if (from && from.colId === target.colId && from.colIndex === target.colIndex && from.index < target.index) {
        index -= 1;
    }
    return insertInTree(pruned, { ...target, index }, removed);
}

/**
 * Replace the element with `id` wherever it sits (top level or one column
 * deep) by running it through `patch`. Untouched branches keep their identity.
 */
export function updateInTree(
    elements: EmailElement[],
    id: string,
    patch: (el: EmailElement) => EmailElement,
): EmailElement[] {
    return elements.map((el) => {
        if (el.id === id) return patch(el);
        if (el.columns) {
            let changed = false;
            const columns = el.columns.map((col) =>
                col.map((child) => {
                    if (child.id !== id) return child;
                    changed = true;
                    return patch(child);
                }),
            );
            if (changed) return { ...el, columns };
        }
        return el;
    });
}

/** Find an element anywhere in the tree (top level or one column deep). */
export function findInTree(elements: EmailElement[], id: string): EmailElement | null {
    for (const el of elements) {
        if (el.id === id) return el;
        if (el.columns) {
            for (const col of el.columns) {
                const hit = col.find((child) => child.id === id);
                if (hit) return hit;
            }
        }
    }
    return null;
}

function clampIndex(index: number, length: number): number {
    return Math.max(0, Math.min(index, length));
}

/**
 * Merge tags used in a block's text props that are not in `known` (the Dynamic
 * Data list for the current context). Same token grammar as Emails\Tokens.
 */
export function unknownTokens(props: Record<string, unknown>, known: Set<string>): string[] {
    const found = new Set<string>();
    const scan = (value: unknown) => {
        if (typeof value === "string") {
            for (const match of value.matchAll(/\{[a-z0-9_:]+\}/g)) {
                if (!known.has(match[0])) found.add(match[0]);
            }
        } else if (Array.isArray(value)) {
            value.forEach(scan);
        } else if (typeof value === "object" && value !== null) {
            Object.values(value).forEach(scan);
        }
    };
    scan(props);
    return [...found];
}

// Token metadata for the editor is now served by the Dynamic Data endpoint
// (GET /emails/dynamic-data), which carries live sample values as well.

let counter = 0;

export function newElement(type: string): EmailElement {
    const def = elementDef(type);
    counter += 1;
    const element: EmailElement = {
        id: `el_${Date.now().toString(36)}${counter}`,
        type,
        props: { ...(def?.defaults ?? {}) },
    };
    if (isLayout(type)) {
        element.columns = [[], []];
    }
    return element;
}

/** Deep-copy an element (and any column children) with fresh ids. */
export function cloneElementWithIds(source: EmailElement): EmailElement {
    const copy: EmailElement = {
        ...newElement(source.type),
        props: JSON.parse(JSON.stringify(source.props)) as Record<string, unknown>,
    };
    if (source.columns) {
        copy.columns = source.columns.map((col) => col.map(cloneElementWithIds));
    }
    if (source.visibility) {
        copy.visibility = { match: source.visibility.match, rules: source.visibility.rules.map((r) => ({ ...r })) };
    }
    return copy;
}

/** Resize a layout block's column count, preserving existing children. */
export function resizeColumns(element: EmailElement, count: number): EmailElement {
    const current = element.columns ?? [[], []];
    if (count === current.length) return element;
    if (count > current.length) {
        const columns = [...current.map((col) => [...col])];
        while (columns.length < count) columns.push([]);
        return { ...element, columns };
    }
    // Shrinking: fold the dropped columns' children into the last kept column.
    const columns = current.slice(0, count).map((col) => [...col]);
    const overflow = current.slice(count).flat();
    columns[count - 1] = [...columns[count - 1], ...overflow];
    return { ...element, columns };
}

export function emptyTree(): EmailTree {
    return { version: 1, settings: {}, elements: [] };
}
