import { describe, expect, it } from "vitest";
import { navUrlProblem, parseLegacyMenu } from "./navigation";
import { normalizePattern } from "./types";

const LEGACY_HEADER =
    '<a href="{site_url}" style="text-decoration:none;">Home</a> &nbsp;·&nbsp; <a href="mailto:{admin_email}" style="text-decoration:none;">Contact</a>';

describe("parseLegacyMenu", () => {
    it("reads the 1.2 pattern menu: &nbsp; separators, merge tags and mailto", () => {
        const menu = parseLegacyMenu(LEGACY_HEADER, "right");
        expect(menu?.confident).toBe(true);
        expect(menu?.props.separator).toBe("dot");
        expect(menu?.props.align).toBe("right");
        expect(menu?.props.items.map((i) => [i.label, i.url])).toEqual([
            ["Home", "{site_url}"],
            ["Contact", "mailto:{admin_email}"],
        ]);
    });

    it("decodes special characters in labels and URLs", () => {
        const menu = parseLegacyMenu('<a href="https://x.test/?a=1&amp;b=2">Tips &amp; tricks</a> | <a href="/faq">FAQ &quot;new&quot;</a>');
        expect(menu?.props.items.map((i) => [i.label, i.url])).toEqual([
            ["Tips & tricks", "https://x.test/?a=1&b=2"],
            ['FAQ "new"', "/faq"],
        ]);
        expect(menu?.props.separator).toBe("pipe");
    });

    it("keeps target and a shared color", () => {
        const menu = parseLegacyMenu('<a href="https://a.test" target="_blank" style="color:#E4E7EC">A</a> <a href="https://b.test" style="color:#e4e7ec">B</a>');
        expect(menu?.props.items[0].target).toBe("_blank");
        expect(menu?.props.color).toBe("#e4e7ec");
        expect(menu?.props.separator).toBe("none");
    });

    it("drops an unsafe URL and marks the parse as not confident", () => {
        const menu = parseLegacyMenu('<a href="javascript:alert(1)">Evil</a> · <a href="https://ok.test">OK</a>');
        expect(menu?.confident).toBe(false);
        expect(menu?.dropped).toEqual(["Evil"]);
        expect(menu?.props.items.map((i) => i.label)).toEqual(["OK"]);
    });

    it("leaves anything that is not just links as text", () => {
        expect(parseLegacyMenu("Questions? Write to <a href=\"mailto:a@b.test\">us</a>.")).toBeNull();
        expect(parseLegacyMenu('<a href="/a"><strong>Bold</strong></a>')).toBeNull();
        expect(parseLegacyMenu("Plain text")).toBeNull();
        expect(parseLegacyMenu('<a href="javascript:x">Only bad</a>')).toBeNull();
    });
});

describe("navUrlProblem", () => {
    it("accepts web, mail, phone, relative, anchors and merge tags", () => {
        for (const url of ["https://a.test", "http://a.test/x?y=1", "mailto:a@b.test", "tel:+1 555 0100", "/contact", "#top", "{site_url}", "{site_url}/shop"]) {
            expect(navUrlProblem(url)).toBeNull();
        }
    });
    it("rejects empty and unsafe URLs", () => {
        expect(navUrlProblem("  ")).toBe("empty");
        for (const url of ["javascript:alert(1)", "data:text/html,x", "www.example.com", 'https://a.test/"onclick'] ) {
            expect(navUrlProblem(url)).toBe("invalid");
        }
    });
});

describe("normalizePattern legacy menus", () => {
    it("upgrades a confident text menu inside columns to a Navigation block", () => {
        const p = normalizePattern({
            id: "old-header",
            name: "Old header",
            blocks: [{ type: "columns", columns: [[{ type: "logo" }], [{ type: "text", props: { html: LEGACY_HEADER, align: "right", fontSize: 13 } }]] }],
        });
        const nav = p?.blocks[0].columns?.[1][0];
        expect(nav?.type).toBe("navigation");
        expect(nav?.props.html).toBeUndefined();
        expect(nav?.props.align).toBe("right");
    });

    it("keeps an uncertain menu as text", () => {
        const p = normalizePattern({
            id: "x",
            name: "X",
            blocks: [{ type: "text", props: { html: '<a href="javascript:x">A</a> <a href="/b">B</a>' } }],
        });
        expect(p?.blocks[0].type).toBe("text");
    });
});
