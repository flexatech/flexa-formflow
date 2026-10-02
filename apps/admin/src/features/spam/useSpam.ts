import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FormConfig } from "@/features/forms/types";

/** A form's CAPTCHA choice. Mirrors Spam\Captcha\Registry ids. */
export type CaptchaId = "none" | "turnstile" | "recaptcha_v2";

export interface CaptchaProviderStatus {
    id: Exclude<CaptchaId, "none">;
    label: string;
    /** Both keys are saved. */
    configured: boolean;
}

export interface SpamStatus {
    providers: CaptchaProviderStatus[];
    default: CaptchaId;
    stats: Record<"honeypot" | "timing" | "rate_limit" | "captcha", number>;
    /** Published forms whose CAPTCHA has no keys. */
    warnings: { id: number; title: string; provider: string }[];
}

export function useSpamStatus() {
    return useQuery({
        queryKey: ["spam-status"],
        queryFn: () => api.get<SpamStatus>("/spam/status"),
        staleTime: 30_000,
    });
}

/** `none`, or a provider with both keys saved. */
export function captchaReady(id: CaptchaId, status: SpamStatus | undefined): boolean {
    if (id === "none") return true;
    return status?.providers.find((p) => p.id === id)?.configured ?? false;
}

export interface ProviderTestResult {
    ok: boolean;
    code: string;
    message: string;
}

/** Ask the provider about the saved keys; no submission is made. */
export function useTestCaptchaKeys() {
    return useMutation({
        mutationFn: (provider: string) => api.post<ProviderTestResult>("/spam/captcha/test", { provider }),
    });
}

export interface TestStep {
    step: string;
    status: "pass" | "fail" | "skip";
    detail: string;
}

/** Dry run of the submit pipeline on sample answers: no entry, email or workflow. */
export function useTestSubmission(formId: number) {
    return useMutation({
        mutationFn: (vars: { config: FormConfig; fields: Record<string, unknown> }) =>
            api.post<{ steps: TestStep[] }>(`/forms/${formId}/test-submission`, vars as unknown as Record<string, unknown>),
    });
}
