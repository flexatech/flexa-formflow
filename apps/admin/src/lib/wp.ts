/**
 * Bridge to the `flexaFormFlow` global published by Enqueue.php via
 * wp_localize_script.
 */

export type AppTheme = "light" | "dark";

export type OnboardingStatus = "pending" | "in_progress" | "completed" | "dismissed";

export interface OnboardingState {
    version: number;
    status: OnboardingStatus;
    started_at: number | null;
    completed_at: number | null;
    dismissed_at: number | null;
}

export interface PluginGlobal {
    restUrl: string;
    restNonce: string;
    namespace: string;
    version: string;
    pluginUrl: string;
    adminUrl: string;
    locale: string;
    theme: AppTheme;
    /** Whether the current user may change settings (manage_options). */
    canManageSettings: boolean;
    /** Whether WooCommerce is active (the WooCommerce emails tab needs it). */
    hasWooCommerce: boolean;
    /** First-run guide state, localized so the guide renders on first paint. */
    onboarding?: OnboardingState;
}

declare global {
    interface Window {
        flexaFormFlow?: PluginGlobal;
    }
}

export function getPluginGlobal(): PluginGlobal {
    if (!window.flexaFormFlow) {
        throw new Error(
            "flexaFormFlow global missing - make sure Enqueue::enqueue_admin ran before this script.",
        );
    }
    return window.flexaFormFlow;
}
