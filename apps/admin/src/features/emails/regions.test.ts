import { describe, expect, it } from "vitest";
import { groupPatterns, newElement, normalizePattern, patternsForContext, type EmailElement, type EmailPattern } from "./types";
import { createTreeHandlers } from "./editor/treeHandlers";

const cats = [
    { key: "header", label: "Header" },
    { key: "intro", label: "Intro" },
    { key: "banner", label: "Banner" },
    { key: "footer", label: "Footer" },
];

const make = (id: string, category: string, contexts: string[], name = id): EmailPattern =>
    normalizePattern({ id, name, category, contexts, keywords: [], blocks: [{ type: "text", props: { html: id } }] }) as EmailPattern;

const library = [
    make("h1", "header", ["email", "global-header"]),
    make("i1", "intro", ["email", "global-header", "global-footer"], "Friendly greeting"),
    make("b1", "banner", ["email", "global-header", "global-footer"], "Dark spotlight"),
    make("b2", "banner", ["email"], "Email-only banner"),
    make("f1", "footer", ["email", "global-footer"]),
];

describe("region filter", () => {
    it("the global header gets everything but footers, the footer everything but headers", () => {
        const header = groupPatterns(patternsForContext(library, "global-header"), cats, "");
        const footer = groupPatterns(patternsForContext(library, "global-footer"), cats, "");
        expect(header.map((g) => g.key)).toEqual(["header", "intro", "banner"]);
        expect(footer.map((g) => g.key)).toEqual(["intro", "banner", "footer"]);
        // An email-only pattern is not assumed to fit a global region.
        expect(header.flatMap((g) => g.items.map((p) => p.id))).not.toContain("b2");
    });

    it("counts and search reflect the filtered set", () => {
        const footer = patternsForContext(library, "global-footer");
        const all = groupPatterns(footer, cats, "");
        expect(all.find((g) => g.key === "banner")?.items).toHaveLength(1);
        const found = groupPatterns(footer, cats, "dark");
        expect(found).toHaveLength(1);
        expect(found[0].items.map((p) => p.id)).toEqual(["b1"]);
        expect(groupPatterns(footer, cats, "nothing-like-this")).toEqual([]);
    });
});

describe("editing a global region", () => {
    it("insert, reorder, delete and undo work on the region's own list", () => {
        let region: EmailElement[] = [newElement("logo")];
        const history: EmailElement[][] = [];
        const handlers = (selectedId: string | null = null) =>
            createTreeHandlers({
                elements: region,
                setElements: (next) => {
                    history.push(region);
                    region = next;
                },
                patterns: library,
                selectedId,
                setSelectedElement: () => undefined,
            });

        handlers(region[0].id).onAddPattern("i1");
        expect(region.map((e) => e.props.html ?? e.type)).toEqual(["logo", "i1"]);
        handlers().onReorder([region[1], region[0]]);
        expect(region[0].props.html).toBe("i1");
        handlers().onDelete(region[0].id);
        expect(region.map((e) => e.type)).toEqual(["logo"]);
        // Undo walks back through delete, reorder and insert.
        region = history.pop()!;
        region = history.pop()!;
        region = history.pop()!;
        expect(region.map((e) => e.type)).toEqual(["logo"]);
        expect(history).toHaveLength(0);
    });

    it("replace swaps the whole region in one step", () => {
        let region: EmailElement[] = [newElement("logo"), newElement("divider")];
        let steps = 0;
        createTreeHandlers({
            elements: region,
            setElements: (next) => {
                steps += 1;
                region = next;
            },
            patterns: library,
            selectedId: null,
            setSelectedElement: () => undefined,
        }).onReplaceWithPattern("h1");
        expect(region.map((e) => e.props.html)).toEqual(["h1"]);
        expect(steps).toBe(1);
    });
});
