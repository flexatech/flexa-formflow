import { describe, expect, it } from "vitest";
import css from "./index.css?raw";

// Tailwind runs with `prefix(ff)`, so theme variables are `--ff-*`. A rule that
// reads an unprefixed one (`var(--radius-md)`) resolves to nothing: that bug
// made every field square. Guard the hand-written CSS against it.

describe("admin CSS tokens", () => {
    it("declares the radius tokens", () => {
        expect(css).toMatch(/--radius-field:\s*6px/);
        expect(css).toMatch(/--radius-item:\s*8px/);
        expect(css).toMatch(/--radius-card:\s*12px/);
    });

    it("never reads an unprefixed theme variable", () => {
        const body = css.replace(/@theme\s*\{[\s\S]*?\n\}/, "");
        expect(body.match(/var\(--(radius|color|spacing|font)-[a-z0-9-]+\)/g) ?? []).toEqual([]);
    });

    it("gives the shared field marker the field radius and a visible focus", () => {
        expect(css).toMatch(/\.flexa-formflow-control \{[^}]*border-radius: var\(--ff-radius-field\) !important/);
        expect(css).toMatch(/\.flexa-formflow-control:focus-visible \{[^}]*box-shadow: 0 0 0 2px/);
    });
});
