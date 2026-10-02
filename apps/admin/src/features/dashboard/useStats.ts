import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Stats {
    forms: number;
    entries: number;
    unread: number;
    entries_last_7_days: number;
    /** Published forms whose CAPTCHA has no keys; they reject every submission. */
    captcha_warnings?: { id: number; title: string; provider: string }[];
}

export function useStats() {
    return useQuery({
        queryKey: ["stats"],
        queryFn: async () => api.get<Stats>("/stats"),
    });
}
