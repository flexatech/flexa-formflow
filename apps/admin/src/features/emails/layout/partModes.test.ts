import { describe, expect, it } from "vitest";
import { partBlocks, partMode, withPartMode } from "./partModes";
import { newElement, type EmailElement, type TreeSettings } from "../types";
import type { EmailLayout } from "./useEmailLayout";

function text(html: string): EmailElement {
    const el = newElement("text");
    el.props.html = html;
    return el;
}

const layout = (): EmailLayout => ({
    enabled: true,
    scope: "all",
    default: "main",
    sets: [
        { id: "main", name: "Main", header: [text("MAIN HEADER")], footer: [text("MAIN FOOTER")] },
        { id: "alt", name: "Alt", header: [text("ALT HEADER")], footer: [] },
    ],
    header: [],
    footer: [],
    overlap: [],
    presets: [],
});

describe("partMode", () => {
    it("reads the three states, with older templates as global or disabled", () => {
        expect(partMode({}, "header")).toBe("global");
        expect(partMode({ hideGlobalHeader: true }, "header")).toBe("disabled");
        expect(partMode({ footerOverride: [] }, "footer")).toBe("override");
    });
});

describe("withPartMode", () => {
    it("override snapshots the set's blocks with fresh ids, then stays independent", () => {
        const l = layout();
        const s = withPartMode({}, "header", "override", l);
        expect(partMode(s, "header")).toBe("override");
        expect(s.headerOverride?.[0].props.html).toBe("MAIN HEADER");
        expect(s.headerOverride?.[0].id).not.toBe(l.sets[0].header[0].id);

        // A later edit to the global set does not reach the override.
        l.sets[0].header[0].props.html = "EDITED";
        expect(partBlocks(s, l, "header")[0].props.html).toBe("MAIN HEADER");
        expect(partBlocks({}, l, "header")[0].props.html).toBe("EDITED");
    });

    it("snapshots the email's chosen set", () => {
        const s = withPartMode({ layoutSet: "alt" }, "header", "override", layout());
        expect(s.headerOverride?.[0].props.html).toBe("ALT HEADER");
    });

    it("keeps an existing override when override is chosen again", () => {
        const own: TreeSettings = { headerOverride: [text("MINE")] };
        expect(withPartMode(own, "header", "override", layout()).headerOverride?.[0].props.html).toBe("MINE");
    });

    it("disabled and global clear the snapshot", () => {
        const own: TreeSettings = { headerOverride: [text("MINE")] };
        const off = withPartMode(own, "header", "disabled", layout());
        expect(off).toEqual({ hideGlobalHeader: true });
        expect(partBlocks(off, layout(), "header")).toEqual([]);
        expect(withPartMode(off, "header", "global", layout())).toEqual({});
    });

    it("only touches the part it changes", () => {
        const s = withPartMode({ hideGlobalFooter: true, layoutSet: "alt" }, "header", "disabled", layout());
        expect(s).toEqual({ hideGlobalFooter: true, hideGlobalHeader: true, layoutSet: "alt" });
    });
});
