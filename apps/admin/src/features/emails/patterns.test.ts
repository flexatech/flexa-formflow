import { describe, expect, it } from "vitest";
import {
    findInTree,
    insertManyInTree,
    insertionTarget,
    materializePattern,
    newElement,
    normalizePattern,
    patternMatches,
    unknownTokens,
    type EmailElement,
    type EmailPattern,
} from "./types";
import { createTreeHandlers } from "./editor/treeHandlers";

const pattern = (over: Partial<EmailPattern> = {}): EmailPattern =>
    normalizePattern({
        id: "banner-dark",
        name: "Dark spotlight",
        description: "Light text on a dark band",
        category: "banner",
        keywords: ["launch", "spotlight"],
        contexts: ["email"],
        blocks: [
            { type: "heading", props: { text: "Hi", background: "#14213a" } },
            { type: "columns", props: { gap: 8 }, columns: [[{ type: "text", props: { html: "A" } }], []] },
        ],
        ...over,
    }) as EmailPattern;

describe("normalizePattern", () => {
    it("fills defaults for an older or add-on shape", () => {
        const p = normalizePattern({ id: "x", name: "X", blocks: [{ type: "text" }] });
        expect(p).toMatchObject({ category: "other", contexts: ["email"], tier: "free", version: 1, locked: false });
        expect(p?.blocks[0].props).toEqual({});
    });

    it("drops unusable entries and nested columns", () => {
        expect(normalizePattern({ id: "x", name: "X", blocks: [] })).toBeNull();
        expect(normalizePattern(null)).toBeNull();
        const p = normalizePattern({
            id: "c",
            name: "C",
            blocks: [{ type: "columns", columns: [[{ type: "columns" }, { type: "text" }]] }],
        });
        expect(p?.blocks[0].columns?.[0].map((b) => b.type)).toEqual(["text"]);
    });

    it("keeps only known contexts", () => {
        expect(normalizePattern({ id: "h", name: "H", contexts: ["global-header", "nope"], blocks: [{ type: "logo" }] })?.contexts).toEqual([
            "global-header",
        ]);
    });
});

describe("patternMatches", () => {
    it("searches name, category label, keywords and description", () => {
        const p = pattern();
        expect(patternMatches(p, "")).toBe(true);
        expect(patternMatches(p, "dark")).toBe(true);
        expect(patternMatches(p, "LAUNCH")).toBe(true);
        expect(patternMatches(p, "hero", "Banner")).toBe(false);
        expect(patternMatches(p, "ban", "Banner")).toBe(true);
        expect(patternMatches(p, "dark band")).toBe(true);
        expect(patternMatches(p, "footer")).toBe(false);
    });
});

describe("materializePattern", () => {
    it("creates independent, editable blocks with fresh ids", () => {
        const p = pattern();
        const a = materializePattern(p.blocks);
        const b = materializePattern(p.blocks);
        expect(a[0].id).not.toBe(b[0].id);
        expect(a[1].columns?.[0][0].id).toBeTruthy();
        // Editing an inserted block never reaches the pattern (snapshot semantics).
        a[0].props.text = "Changed";
        expect(p.blocks[0].props.text).toBe("Hi");
        expect(b[0].props.text).toBe("Hi");
    });
});

describe("insertionTarget", () => {
    const tree = (): EmailElement[] => {
        const cols = newElement("columns");
        cols.columns = [[newElement("text")], []];
        return [newElement("heading"), cols, newElement("button")];
    };

    it("inserts after the selected block, or at the end", () => {
        const els = tree();
        expect(insertionTarget(els, null)).toEqual({ colId: null, colIndex: 0, index: 3 });
        expect(insertionTarget(els, els[0].id)).toEqual({ colId: null, colIndex: 0, index: 1 });
    });

    it("inserts after the columns row when a block inside a column is selected", () => {
        const els = tree();
        const inner = els[1].columns![0][0].id;
        expect(insertionTarget(els, inner)).toEqual({ colId: null, colIndex: 0, index: 2 });
    });
});

describe("pattern insert, undo and editing", () => {
    function harness(selectedId: string | null, locked = false) {
        let elements: EmailElement[] = [newElement("heading"), newElement("button")];
        const history: EmailElement[][] = [];
        let selected = selectedId === "first" ? elements[0].id : selectedId;
        const handlers = () =>
            createTreeHandlers({
                elements,
                setElements: (next) => {
                    history.push(elements);
                    elements = next;
                },
                patterns: [pattern({ locked })],
                selectedId: selected,
                setSelectedElement: (id) => {
                    selected = id;
                },
            });
        return {
            handlers,
            get elements() {
                return elements;
            },
            undo: () => {
                elements = history.pop() ?? elements;
            },
        };
    }

    it("inserts the whole pattern after the selection as one undo step", () => {
        const h = harness("first");
        h.handlers().onAddPattern("banner-dark");
        expect(h.elements.map((e) => e.type)).toEqual(["heading", "heading", "columns", "button"]);
        h.undo();
        expect(h.elements.map((e) => e.type)).toEqual(["heading", "button"]);
    });

    it("lets inserted blocks be duplicated, moved and deleted like any block", () => {
        const h = harness(null);
        h.handlers().onAddPattern("banner-dark");
        const inserted = h.elements[2];
        h.handlers().onDuplicate(inserted.id);
        expect(h.elements.filter((e) => e.type === "heading")).toHaveLength(3);
        h.handlers().onMove(inserted.id, { colId: null, colIndex: 0, index: 0 });
        expect(h.elements[0].id).toBe(inserted.id);
        h.handlers().onDelete(inserted.id);
        expect(findInTree(h.elements, inserted.id)).toBeNull();
    });

    it("never inserts a locked (Pro) pattern", () => {
        const h = harness(null, true);
        h.handlers().onAddPattern("banner-dark");
        expect(h.elements).toHaveLength(2);
    });

    it("drops a pattern aimed inside a column after that columns row", () => {
        const cols = newElement("columns");
        let elements: EmailElement[] = [cols];
        createTreeHandlers({
            elements,
            setElements: (next) => {
                elements = next;
            },
            patterns: [pattern()],
            selectedId: null,
            setSelectedElement: () => undefined,
        }).onInsertPatternAt("banner-dark", { colId: cols.id, colIndex: 0, index: 0 });
        expect(elements.map((e) => e.type)).toEqual(["columns", "heading", "columns"]);
        expect(elements[0].columns?.[0]).toHaveLength(0);
    });
});

describe("unknownTokens", () => {
    it("flags tags the context cannot fill", () => {
        const known = new Set(["{site_title}", "{field:name}"]);
        expect(unknownTokens({ html: "Hi {field:name} at {site_title}", alt: "{order_total}" }, known)).toEqual(["{order_total}"]);
        expect(unknownTokens({ nested: { a: ["{typo}"] } }, known)).toEqual(["{typo}"]);
    });
});

describe("insertManyInTree", () => {
    it("keeps the given order", () => {
        const base = [newElement("text")];
        const items = [newElement("heading"), newElement("button")];
        const next = insertManyInTree(base, { colId: null, colIndex: 0, index: 0 }, items);
        expect(next.map((e) => e.type)).toEqual(["heading", "button", "text"]);
    });
});
