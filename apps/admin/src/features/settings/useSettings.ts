import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AiProvider = "anthropic" | "openai" | "gemini";

/** Server sentinel: a key is stored but never sent to the browser. */
export const SECRET_MASK = "__ff_secret__";

export interface PluginSettings {
    delete_data_on_uninstall: boolean;
    brand_color: string;
    background_color: string;
    content_background: string;
    text_color: string;
    footer_text: string;
    font_family: string;
    container_width: number;
    ai_provider: AiProvider;
    ai_model: string;
    /** Masked sentinel ("__ff_secret__") when a key is stored, else "". */
    ai_api_key: string;
    /** CAPTCHA a new form starts with; existing forms keep their own. */
    captcha_default: "none" | "turnstile" | "recaptcha_v2";
    turnstile_site_key: string;
    /** Masked sentinel when stored. Send "" to remove, the mask to keep. */
    turnstile_secret_key: string;
    recaptcha_v2_site_key: string;
    recaptcha_v2_secret_key: string;
}

interface SettingsResponse {
    settings: PluginSettings;
}

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: async () => (await api.get<SettingsResponse>("/settings")).settings,
    });
}

/**
 * Sends only the changed fields; the server sanitizes the partial payload and
 * merges it over the stored option (never send the whole blob back).
 */
export function useSaveSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (partial: Partial<PluginSettings>) =>
            (await api.post<SettingsResponse>("/settings", partial)).settings,
        onSuccess: (settings) => {
            queryClient.setQueryData(["settings"], settings);
            // Provider readiness feeds the form builder and the dashboard.
            void queryClient.invalidateQueries({ queryKey: ["spam-status"] });
            // Brand colour and site identity change what pattern thumbnails show;
            // the library's revision moves with them.
            void queryClient.invalidateQueries({ queryKey: ["email-patterns"] });
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
    });
}
