import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useSpamStatus, useTestCaptchaKeys } from "@/features/spam/useSpam";
import { SECRET_MASK, type PluginSettings } from "./useSettings";

type SpamKeys =
    | "captcha_default"
    | "turnstile_site_key"
    | "turnstile_secret_key"
    | "recaptcha_v2_site_key"
    | "recaptcha_v2_secret_key";

type ProviderId = "turnstile" | "recaptcha_v2";

const PROVIDERS: { id: ProviderId; mark: string; label: () => string; hint: () => string; keysUrl: string }[] = [
    {
        id: "turnstile",
        mark: "CF",
        label: () => __("Cloudflare Turnstile"),
        hint: () => __("Privacy-friendly, usually no puzzle to solve"),
        keysUrl: "https://dash.cloudflare.com/?to=/:account/turnstile",
    },
    {
        id: "recaptcha_v2",
        mark: "G",
        label: () => __("Google reCAPTCHA v2"),
        hint: () => __("“I’m not a robot” checkbox"),
        keysUrl: "https://www.google.com/recaptcha/admin/create",
    },
];

/**
 * Settings > Spam protection: the always-on built-in layer, the CAPTCHA new
 * forms start with, and each provider's keys. A saved secret never comes back
 * from the server; it shows as "saved" with explicit Replace and Remove
 * actions, so an untouched field can never wipe it by accident.
 */
export function SpamProtection({
    draft,
    stored,
    onChange,
    dirtyKeys,
}: {
    draft: Pick<PluginSettings, SpamKeys>;
    stored: PluginSettings;
    onChange: (patch: Partial<Pick<PluginSettings, SpamKeys>>) => void;
    dirtyKeys: readonly string[];
}) {
    const { data: status } = useSpamStatus();
    const blocked = status ? status.stats.honeypot + status.stats.timing : 0;

    return (
        <>
            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-700">
                        <ShieldCheck aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <h2 className="ff:text-sm ff:font-medium ff:text-slate-900">{__("Spam protection")}</h2>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("Every form is protected automatically. Add a CAPTCHA to any form for an extra check.")}
                        </p>
                    </div>
                    <StatusChip tone="ok">{__("Active")}</StatusChip>
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:px-5 ff:py-4">
                    <div className="ff:min-w-0 ff:flex-1">
                        <p className="ff:m-0 ff:text-sm ff:font-medium ff:text-slate-900">{__("Built-in protection")}</p>
                        <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                            {__("Invisible checks run on every form and stop most bots without bothering visitors.")}
                            {status && (blocked > 0 || status.stats.rate_limit > 0) && (
                                <>
                                    {" "}
                                    {sprintf(
                                        __("Blocked so far: %1$d automated, %2$d over the rate limit, %3$d failed CAPTCHA."),
                                        blocked,
                                        status.stats.rate_limit,
                                        status.stats.captcha,
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                    <StatusChip tone="ok">{__("Always on")}</StatusChip>
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-t ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-captcha-default" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Default CAPTCHA for new forms")}
                        </Label>
                        <p className="ff:text-xs ff:text-slate-500">{__("Existing forms keep their own choice.")}</p>
                    </div>
                    <Select
                        id="ff-captcha-default"
                        className="ff:w-56"
                        value={draft.captcha_default}
                        options={[
                            { value: "none", label: __("None") },
                            ...PROVIDERS.map((p) => ({ value: p.id, label: p.label() })),
                        ]}
                        onChange={(e) => onChange({ captcha_default: e.target.value as PluginSettings["captcha_default"] })}
                    />
                </div>
                {draft.captcha_default !== "none" && !configured(stored, draft.captcha_default) && (
                    <p className="ff:m-0 ff:flex ff:items-center ff:gap-2 ff:border-t ff:border-slate-100 ff:bg-amber-50 ff:px-5 ff:py-2.5 ff:text-xs ff:text-amber-800">
                        <AlertTriangle aria-hidden className="ff:h-3.5 ff:w-3.5" />
                        {__("New forms will need this provider's keys before they can be published.")}
                    </p>
                )}
            </section>

            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-700">
                        <KeyRound aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <h2 className="ff:text-sm ff:font-medium ff:text-slate-900">{__("CAPTCHA providers")}</h2>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("Keys are stored once here and used by every form that picks the provider. Secret keys are encrypted and never shown again.")}
                        </p>
                    </div>
                </div>
                <div className="ff:grid ff:grid-cols-1 ff:gap-4 ff:p-5 ff:lg:grid-cols-2">
                    {PROVIDERS.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            siteKey={draft[`${provider.id}_site_key`]}
                            secret={draft[`${provider.id}_secret_key`]}
                            storedSecret={stored[`${provider.id}_secret_key`]}
                            isConfigured={configured(stored, provider.id)}
                            unsaved={dirtyKeys.some((k) => k.startsWith(provider.id))}
                            onChange={(patch) => onChange(patch)}
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function configured(settings: PluginSettings, id: ProviderId): boolean {
    return settings[`${id}_site_key`] !== "" && settings[`${id}_secret_key`] === SECRET_MASK;
}

function ProviderCard({
    provider,
    siteKey,
    secret,
    storedSecret,
    isConfigured,
    unsaved,
    onChange,
}: {
    provider: (typeof PROVIDERS)[number];
    siteKey: string;
    secret: string;
    storedSecret: string;
    isConfigured: boolean;
    unsaved: boolean;
    onChange: (patch: Partial<Pick<PluginSettings, SpamKeys>>) => void;
}) {
    const [replacing, setReplacing] = useState(false);
    const test = useTestCaptchaKeys();
    const siteField = `${provider.id}_site_key` as const;
    const secretField = `${provider.id}_secret_key` as const;
    const hasStoredSecret = storedSecret === SECRET_MASK;
    const removing = hasStoredSecret && secret === "";
    // While replacing, an empty box keeps the saved secret (the mask) instead of removing it.
    const typed = secret === SECRET_MASK ? "" : secret;

    return (
        <article className="ff:overflow-hidden ff:rounded-lg ff:border ff:border-slate-200">
            <div className="ff:flex ff:items-center ff:gap-3 ff:p-3">
                <span
                    aria-hidden
                    className="ff:flex ff:h-8 ff:w-8 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-md ff:bg-brand-700 ff:text-xs ff:font-bold ff:text-white"
                >
                    {provider.mark}
                </span>
                <div className="ff:min-w-0 ff:flex-1">
                    <p className="ff:m-0 ff:text-sm ff:font-medium ff:text-slate-900">{provider.label()}</p>
                    <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">{provider.hint()}</p>
                </div>
                {isConfigured ? (
                    <StatusChip tone="ok">{__("Configured")}</StatusChip>
                ) : (
                    <StatusChip tone="warn">{__("Needs keys")}</StatusChip>
                )}
            </div>
            <div className="ff:flex ff:flex-col ff:gap-3 ff:border-t ff:border-slate-200 ff:p-3">
                <div className="ff:flex ff:flex-col ff:gap-1">
                    <Label htmlFor={`ff-${siteField}`}>{__("Site key")}</Label>
                    <Input
                        id={`ff-${siteField}`}
                        value={siteKey}
                        onChange={(e) => onChange({ [siteField]: e.target.value.trim() })}
                        placeholder={__("Paste the site key")}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                <div className="ff:flex ff:flex-col ff:gap-1">
                    <Label htmlFor={`ff-${secretField}`}>{__("Secret key")}</Label>
                    {hasStoredSecret && !replacing && !removing ? (
                        <div className="ff:flex ff:items-center ff:gap-2">
                            <span className="ff:flex-1 ff:text-xs ff:text-slate-600">{__("Saved and hidden")}</span>
                            <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
                                {__("Replace key")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onChange({ [secretField]: "" })}>
                                {__("Remove")}
                            </Button>
                        </div>
                    ) : removing ? (
                        <div className="ff:flex ff:items-center ff:gap-2">
                            <span role="status" className="ff:flex-1 ff:text-xs ff:text-amber-800">
                                {__("The secret key is removed when you save. Forms using this provider will stop accepting submissions.")}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => onChange({ [secretField]: SECRET_MASK })}>
                                {__("Undo")}
                            </Button>
                        </div>
                    ) : (
                        <div className="ff:flex ff:items-center ff:gap-2">
                            <Input
                                id={`ff-${secretField}`}
                                type="password"
                                value={typed}
                                onChange={(e) =>
                                    onChange({ [secretField]: e.target.value.trim() || (hasStoredSecret ? SECRET_MASK : "") })
                                }
                                placeholder={hasStoredSecret ? __("New secret key") : __("Paste the secret key")}
                                autoComplete="new-password"
                                spellCheck={false}
                            />
                            {replacing && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setReplacing(false);
                                        onChange({ [secretField]: SECRET_MASK });
                                    }}
                                >
                                    {__("Cancel")}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <div className="ff:flex ff:flex-wrap ff:items-center ff:gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!isConfigured || unsaved || test.isPending}
                        onClick={() => test.mutate(provider.id)}
                        title={unsaved ? __("Save your changes first") : undefined}
                    >
                        {test.isPending ? __("Testing…") : __("Test keys")}
                    </Button>
                    <a
                        href={provider.keysUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="ff:inline-flex ff:items-center ff:gap-1 ff:text-xs ff:font-medium ff:text-brand-700"
                    >
                        {__("Get keys")}
                        <ExternalLink aria-hidden className="ff:h-3 ff:w-3" />
                    </a>
                    {test.data && (
                        <span
                            role="status"
                            className={cn(
                                "ff:inline-flex ff:items-center ff:gap-1 ff:text-xs",
                                test.data.ok ? "ff:text-emerald-700" : "ff:text-red-700",
                            )}
                        >
                            {test.data.ok ? (
                                <CheckCircle2 aria-hidden className="ff:h-3.5 ff:w-3.5" />
                            ) : (
                                <AlertTriangle aria-hidden className="ff:h-3.5 ff:w-3.5" />
                            )}
                            {test.data.message}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

function StatusChip({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "ff:inline-flex ff:shrink-0 ff:items-center ff:gap-1 ff:rounded-full ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-semibold",
                tone === "ok" ? "ff:bg-emerald-50 ff:text-emerald-700" : "ff:bg-amber-50 ff:text-amber-800",
            )}
        >
            {tone === "ok" ? (
                <CheckCircle2 aria-hidden className="ff:h-3 ff:w-3" />
            ) : (
                <AlertTriangle aria-hidden className="ff:h-3 ff:w-3" />
            )}
            {children}
        </span>
    );
}
