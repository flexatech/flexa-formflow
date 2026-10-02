/**
 * The Navigation block's data model and the conversion of older menus, which
 * were plain Text blocks holding hand-written `<a>` tags, into it. Pure
 * functions (no DOM), shared by the pattern normalizer and the editor.
 */

export interface NavigationItem {
    id: string;
    label: string;
    url: string;
    target?: "_blank" | "_self";
}

export type NavSeparator = "none" | "dot" | "pipe";

export interface NavigationProps {
    items: NavigationItem[];
    align: "left" | "center" | "right";
    gap: number;
    fontSize: number;
    color: string;
    separator: NavSeparator;
}

let counter = 0;
export function newNavItem(label = "", url = ""): NavigationItem {
    counter += 1;
    return { id: `nav_${Date.now().toString(36)}${counter}`, label, url };
}

/** A merge tag on its own or at the start of a URL (`{site_url}`, `{site_url}/shop`). */
const TOKEN_URL = /^\{[a-z0-9_:]+\}/;
const SAFE_URL = /^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+0-9 ()-]+|\/[^\s"'<>]*|#[^\s"'<>]*)$/i;

/**
 * Why a link URL cannot be used, or null when it is fine. Mirrors what the
 * server keeps after esc_url(): web, mail and phone links, site-relative paths,
 * anchors, and merge tags that resolve to one of those.
 */
export function navUrlProblem(url: string): string | null {
    const value = url.trim();
    if (value === "") return "empty";
    if (TOKEN_URL.test(value)) return null;
    return SAFE_URL.test(value) ? null : "invalid";
}

const ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#039;": "'",
    "&nbsp;": " ",
    "&middot;": "·",
    "&#183;": "·",
};

function decode(text: string): string {
    return text.replace(/&(?:amp|lt|gt|quot|nbsp|middot|#39|#039|#183);/g, (m) => ENTITIES[m] ?? m);
}

/** What may sit between two links in a legacy menu: spaces and a separator glyph. */
const BETWEEN = /^(?:\s|&nbsp;|&middot;|&#183;|·|•|\||-|–)*$/;
const ANCHOR = /<a\s+([^>]*)>([^<]*)<\/a>/gi;

export interface LegacyMenu {
    props: NavigationProps;
    /** Every link parsed cleanly; false when some were dropped or looked odd. */
    confident: boolean;
    /** Labels of links left out because their URL was not usable. */
    dropped: string[];
}

/**
 * Read a Text block's HTML as a menu when it is nothing but links joined by
 * separators (`<a href="…">Home</a> &nbsp;·&nbsp; <a …>Contact</a>`). Anything
 * else (prose around the links, nested tags, a single sentence with a link)
 * returns null and the block is left as text.
 */
export function parseLegacyMenu(html: string, align: NavigationProps["align"] = "center"): LegacyMenu | null {
    const source = html.trim();
    const anchors = [...source.matchAll(ANCHOR)];
    if (anchors.length === 0) return null;

    // Everything outside the anchors must be separators only.
    let cursor = 0;
    let gaps = "";
    for (const match of anchors) {
        const between = source.slice(cursor, match.index);
        if (!BETWEEN.test(between)) return null;
        gaps += between;
        cursor = (match.index ?? 0) + match[0].length;
    }
    if (!BETWEEN.test(source.slice(cursor))) return null;

    const items: NavigationItem[] = [];
    const dropped: string[] = [];
    const colors = new Set<string>();
    for (const [, attrs, rawLabel] of anchors) {
        const href = decode(/href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "").trim();
        const label = decode(rawLabel).replace(/\s+/g, " ").trim();
        const color = /color\s*:\s*(#[0-9a-f]{3,6})/i.exec(attrs)?.[1];
        if (color) colors.add(color.toLowerCase());
        if (label === "" || navUrlProblem(href) !== null) {
            dropped.push(label || href);
            continue;
        }
        const item = newNavItem(label, href);
        if (/target\s*=\s*"_blank"/i.test(attrs)) item.target = "_blank";
        items.push(item);
    }
    if (items.length === 0) return null;

    const separator: NavSeparator = /·|&middot;|&#183;|•/.test(gaps) ? "dot" : /\|/.test(gaps) ? "pipe" : "none";
    return {
        props: {
            items,
            align,
            gap: 16,
            fontSize: 14,
            color: colors.size === 1 ? [...colors][0] : "",
            separator,
        },
        confident: dropped.length === 0,
        dropped,
    };
}
