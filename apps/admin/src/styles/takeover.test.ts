import { describe, expect, it } from "vitest";
import css from "./index.css?raw";

// The workflow builder's three-row layout (toolbar, Build/Logs tabs, content)
// relies on these rules; the browser checks cover the rendering, this guards
// the rules themselves against a quiet edit.

const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at === -1 ? "" : css.slice(at, css.indexOf("}", at));
};

describe("full-area editor layout", () => {
    it("sizes the screen to the viewport below the admin toolbar, dvh with a vh fallback", () => {
        const takeover = rule(".flexa-formflow-takeover");
        expect(takeover).toContain("--ff-takeover-top: var(--wp-admin--admin-bar--height, 0px)");
        expect(takeover).toMatch(/height: calc\(100vh - var\(--ff-takeover-top\)\);\s*height: calc\(100dvh - var\(--ff-takeover-top\)\)/);
    });

    it("drops the toolbar offset in fullscreen", () => {
        expect(rule("body.flexa-formflow-fs-lock .flexa-formflow-takeover")).toContain("--ff-takeover-top: 0px");
    });

    it("pins the toolbar and tabs with an offset, never a negative margin or transform", () => {
        const chrome = rule(".flexa-formflow-takeover-chrome");
        expect(chrome).toContain("position: sticky");
        expect(chrome).toContain("top: var(--ff-takeover-top)");
        expect(chrome).not.toMatch(/margin|transform|translate/);
    });

    it("locks page scrolling only while fullscreen is on", () => {
        expect(rule("body.flexa-formflow-fs-lock")).toContain("overflow: hidden");
    });
});
