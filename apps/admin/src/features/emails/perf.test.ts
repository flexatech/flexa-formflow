import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));

import { loadPatternPreview, loaderStats } from "./patternPreviewLoader";
import { LatestRender } from "./latestRender";

describe("pattern thumbnail loader", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        post.mockReset();
        loaderStats.requests = 0;
        post.mockImplementation(async (_path: string, body: { ids: string[] }) => ({
            html: Object.fromEntries(body.ids.map((id) => [id, `<p>${id}</p>`])),
        }));
    });
    afterEach(() => vi.useRealTimers());

    it("batches ids asked together into one request", async () => {
        const all = Promise.all(["a", "b", "c"].map(loadPatternPreview));
        await vi.advanceTimersByTimeAsync(50);
        expect(await all).toEqual(["<p>a</p>", "<p>b</p>", "<p>c</p>"]);
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1]).toEqual({ ids: ["a", "b", "c"] });
    });

    it("asks for a duplicated id only once", async () => {
        const all = Promise.all([loadPatternPreview("a"), loadPatternPreview("a")]);
        await vi.advanceTimersByTimeAsync(50);
        expect(await all).toEqual(["<p>a</p>", "<p>a</p>"]);
        expect(post.mock.calls[0][1]).toEqual({ ids: ["a"] });
    });

    it("splits a large batch into chunks of 24", async () => {
        const ids = Array.from({ length: 30 }, (_, i) => `p${i}`);
        const all = Promise.all(ids.map(loadPatternPreview));
        await vi.advanceTimersByTimeAsync(50);
        await all;
        expect(loaderStats.requests).toBe(2);
    });
});

describe("LatestRender", () => {
    function setup() {
        const resolvers = new Map<string, (html: string) => void>();
        const signals = new Map<string, AbortSignal>();
        const shown: string[] = [];
        const r = new LatestRender(
            (key, signal) =>
                new Promise<string>((resolve, reject) => {
                    resolvers.set(key, resolve);
                    signals.set(key, signal);
                    signal.addEventListener("abort", () => reject(new Error("aborted")));
                }),
            (html) => shown.push(html),
            () => undefined,
        );
        return { r, resolvers, signals, shown };
    }

    it("aborts the older request and ignores a late answer", async () => {
        const { r, resolvers, signals, shown } = setup();
        const first = r.fetch("form-0");
        const second = r.fetch("form-7");
        expect(signals.get("form-0")?.aborted).toBe(true);
        resolvers.get("form-0")?.("old");
        resolvers.get("form-7")?.("new");
        await Promise.all([first, second]);
        expect(shown).toEqual(["new"]);
    });

    it("serves a state rendered before without a request", async () => {
        const { r, resolvers, shown } = setup();
        const p = r.fetch("tree-1");
        resolvers.get("tree-1")?.("one");
        await p;
        expect(r.show("tree-1")).toBe(true);
        expect(r.requests).toBe(1);
        expect(shown).toEqual(["one", "one"]);
        expect(r.show("tree-2")).toBe(false);
    });
});
