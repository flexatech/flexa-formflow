/**
 * Keeps one render per distinct input, at most one request in flight, and
 * never lets an older answer overwrite a newer one. React-free so it can be
 * tested on its own; `useCanvasRender` wraps it.
 */
export type Fetcher = (key: string, signal: AbortSignal) => Promise<string>;

export class LatestRender {
    private cache = new Map<string, string>();
    private controller: AbortController | null = null;
    private latest = "";
    requests = 0;

    constructor(
        private readonly fetcher: Fetcher,
        private readonly onResult: (html: string) => void,
        private readonly onPending: (pending: boolean) => void,
        private readonly size = 20,
    ) {}

    /** The cached render for `key`, if any. Settles the state immediately. */
    show(key: string): boolean {
        this.latest = key;
        const cached = this.cache.get(key);
        if (cached === undefined) return false;
        this.controller?.abort();
        this.onPending(false);
        this.onResult(cached);
        return true;
    }

    /** Fetch `key`, aborting whatever is still in flight. */
    async fetch(key: string): Promise<void> {
        this.latest = key;
        this.controller?.abort();
        const ctl = new AbortController();
        this.controller = ctl;
        this.requests += 1;
        this.onPending(true);
        try {
            const html = await this.fetcher(key, ctl.signal);
            this.remember(key, html);
            if (this.latest === key && !ctl.signal.aborted) this.onResult(html);
        } catch {
            // Aborted or failed: the newer request (or the next edit) takes over.
        } finally {
            if (this.controller === ctl) this.onPending(false);
        }
    }

    dispose(): void {
        this.controller?.abort();
        this.cache.clear();
    }

    private remember(key: string, html: string): void {
        this.cache.delete(key);
        this.cache.set(key, html);
        if (this.cache.size > this.size) this.cache.delete(this.cache.keys().next().value as string);
    }
}
