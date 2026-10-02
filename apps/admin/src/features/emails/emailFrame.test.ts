import { describe, expect, it } from "vitest";
import { EMAIL_VIEWPORT, THUMB_ASPECT, emailViewport, fitWidthGeometry, snap, thumbnailGeometry } from "./emailFrame";

const email = (width: number) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@media only screen and (max-width:${width + 20}px){.ff-col{display:block!important}}</style></head>` +
    `<body><table class="ff-container" dir="ltr" width="${width}" cellpadding="0"><tr><td>x</td></tr></table></body></html>`;

describe("email frame viewport", () => {
    it("lays a 600px email out at the fixed desktop viewport, above its phone breakpoint", () => {
        expect(emailViewport(email(600))).toBe(EMAIL_VIEWPORT);
        expect(EMAIL_VIEWPORT).toBeGreaterThan(600 + 20);
        expect(EMAIL_VIEWPORT).toBeLessThanOrEqual(640);
    });

    it("widens for a wider email so its phone rule still cannot fire", () => {
        expect(emailViewport(email(700))).toBeGreaterThan(700 + 20);
    });

    it("falls back to the default viewport for HTML without a container", () => {
        expect(emailViewport("<p>hi</p>")).toBe(EMAIL_VIEWPORT);
    });
});

describe("thumbnail geometry", () => {
    it("does not reflow with the sidebar: the viewport is fixed, only the scale follows the box", () => {
        const html = email(600);
        const narrow = thumbnailGeometry(200, emailViewport(html), 180);
        const wide = thumbnailGeometry(300, emailViewport(html), 180);
        // Same logical layout width in both; the scale is proportional to the box.
        expect(emailViewport(html)).toBe(EMAIL_VIEWPORT);
        expect(wide.scale / narrow.scale).toBeCloseTo(300 / 200, 5);
    });

    it("keeps one aspect ratio for every card", () => {
        for (const height of [80, 360, 1400]) {
            const g = thumbnailGeometry(240, 640, height);
            expect(g.boxHeight).toBeCloseTo(240 / THUMB_ASPECT, 0);
        }
    });

    it("fits a short pattern to the full width and centres it vertically", () => {
        const g = thumbnailGeometry(240, 640, 120);
        expect(g.scale).toBeCloseTo(240 / 640, 5);
        expect(g.left).toBe(0);
        expect(g.top).toBeGreaterThan(0);
        expect(g.top * 2 + 120 * g.scale).toBeCloseTo(g.boxHeight, 0);
    });

    it("never crops a tall pattern: it is scaled to fit the height and centred", () => {
        const g = thumbnailGeometry(240, 640, 1400);
        expect(1400 * g.scale).toBeLessThanOrEqual(g.boxHeight + 0.01);
        expect(640 * g.scale).toBeLessThanOrEqual(240);
        expect(g.left).toBeGreaterThan(0);
        expect(g.top).toBe(0);
    });

    it.each([1, 1.25, 1.5])("places the frame on whole device pixels at DPR %s", (dpr) => {
        const g = thumbnailGeometry(229, 640, 999, dpr);
        for (const v of [g.left, g.top, g.boxHeight]) {
            expect(Math.abs(v * dpr - Math.round(v * dpr))).toBeLessThan(1e-9);
        }
    });
});

describe("fit-width geometry (preview dialog)", () => {
    it("never upscales and keeps the email's layout width", () => {
        const g = fitWidthGeometry(900, 640, 500);
        expect(g.scale).toBe(1);
        expect(g.boxHeight).toBe(500);
    });

    it("scales a narrow dialog down instead of reflowing the email", () => {
        const g = fitWidthGeometry(320, 640, 500);
        expect(g.scale).toBeCloseTo(0.5, 5);
        expect(g.boxHeight).toBe(250);
    });
});

describe("snap", () => {
    it("rounds to the device pixel grid", () => {
        expect(snap(10.3, 1)).toBe(10);
        expect(snap(10.3, 1.5)).toBe(10);
        expect(snap(10.4, 1.5)).toBeCloseTo(16 / 1.5, 9);
        expect(snap(10.3, 2)).toBe(10.5);
    });
});
