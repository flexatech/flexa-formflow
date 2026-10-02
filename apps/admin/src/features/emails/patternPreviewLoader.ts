import { api } from "@/lib/api";

/**
 * Batches pattern thumbnail requests. Cards ask for one id each as they scroll
 * into view; ids asked within the same short window go to the server in one
 * POST, and an id already in flight is never asked twice (react-query also
 * dedupes per id on top). Kept outside React so it survives re-renders.
 */
const WINDOW_MS = 40;
const MAX_IDS = 24;

type Waiter = { resolve: (html: string) => void; reject: (error: Error) => void };

const queue = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | undefined;

/** For tests: how many POSTs were sent. */
export const loaderStats = { requests: 0 };

export function loadPatternPreview(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const waiters = queue.get(id) ?? [];
        waiters.push({ resolve, reject });
        queue.set(id, waiters);
        timer ??= setTimeout(flush, WINDOW_MS);
    });
}

async function flush(): Promise<void> {
    timer = undefined;
    const batch = new Map(queue);
    queue.clear();
    const ids = [...batch.keys()];
    for (let i = 0; i < ids.length; i += MAX_IDS) {
        const chunk = ids.slice(i, i + MAX_IDS);
        loaderStats.requests += 1;
        try {
            const res = await api.post<{ html: Record<string, string> }>("/emails/patterns/preview", { ids: chunk });
            for (const id of chunk) {
                const html = res.html?.[id];
                for (const w of batch.get(id) ?? []) {
                    if (typeof html === "string") w.resolve(html);
                    else w.reject(new Error("No preview for " + id));
                }
            }
        } catch (error) {
            for (const id of chunk) for (const w of batch.get(id) ?? []) w.reject(error as Error);
        }
    }
}
