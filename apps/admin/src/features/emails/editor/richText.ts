/**
 * The inline HTML a rich-text block may hold: the same small set the email
 * renderer keeps (see BaseElement::rich_text()). Used to clean what the
 * contentEditable editor produces and anything loaded into it, so the editor
 * never injects markup the email would not keep.
 */
const KEEP = new Set(["A", "STRONG", "B", "EM", "I", "U", "BR", "SPAN"]);
const RENAME: Record<string, string> = { B: "strong", I: "em" };
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/|#|\{[a-z0-9_:]+\})/i;

/** Clean inline HTML: allowed tags only, links with a safe href, no other attributes. */
export function sanitizeInline(html: string): string {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    return serialize(doc.body);
}

function serialize(node: Node): string {
    let out = "";
    node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            out += escapeText(child.textContent ?? "");
            return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        const el = child as HTMLElement;
        const inner = serialize(el);
        // Block wrappers a contentEditable adds on Enter become line breaks.
        if (el.tagName === "DIV" || el.tagName === "P") {
            out += (out !== "" ? "<br>" : "") + inner;
            return;
        }
        if (!KEEP.has(el.tagName)) {
            out += inner; // unwrap, keep the text
            return;
        }
        if (el.tagName === "BR") {
            out += "<br>";
            return;
        }
        if (el.tagName === "SPAN") {
            out += inner; // spans carry only styling the editor added
            return;
        }
        const tag = RENAME[el.tagName] ?? el.tagName.toLowerCase();
        if (tag === "a") {
            const href = (el.getAttribute("href") ?? "").trim();
            if (!SAFE_HREF.test(href)) {
                out += inner;
                return;
            }
            const target = el.getAttribute("target") === "_blank" ? ' target="_blank"' : "";
            out += `<a href="${escapeAttr(href)}"${target}>${inner}</a>`;
            return;
        }
        out += `<${tag}>${inner}</${tag}>`;
    });
    return out;
}

function escapeText(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
}

function escapeAttr(text: string): string {
    return escapeText(text).replace(/"/g, "&quot;");
}

/** Stored text uses newlines for line breaks (the renderer runs nl2br); show them as <br>. */
export function toEditable(value: string): string {
    return sanitizeInline(value.replace(/\r?\n/g, "<br>"));
}

/** Whether a value has markup beyond what the visual editor can show faithfully. */
export function hasUnsupportedMarkup(value: string): boolean {
    const tags = value.match(/<\/?([a-z0-9]+)/gi) ?? [];
    return tags.some((t) => !/^<\/?(a|strong|b|em|i|u|br|span)$/i.test(t));
}
