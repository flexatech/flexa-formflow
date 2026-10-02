import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import { captchaReady, useSpamStatus, type CaptchaId } from "@/features/spam/useSpam";
import type { FormConfig } from "../types";

/**
 * The form-level Spam protection section: the always-on built-in layer (no
 * switch), and the optional per-form CAPTCHA. Only the provider id is stored on
 * the form; keys live in Settings. A provider without keys can be picked on a
 * draft (with a warning), but not on a published form, which could then never
 * accept a submission.
 */
export function SpamProtectionSettings({
    config,
    published,
    onChange,
}: {
    config: FormConfig;
    published: boolean;
    onChange: (config: FormConfig) => void;
}) {
    const { data: status } = useSpamStatus();
    const value: CaptchaId = config.settings.captcha ?? "none";
    const ready = captchaReady(value, status);
    const label = status?.providers.find((p) => p.id === value)?.label ?? value;

    const options = [
        { value: "none", label: __("None") },
        ...(status?.providers ?? []).map((p) => ({
            value: p.id,
            label: p.configured ? p.label : sprintf(__("%s (needs keys)"), p.label),
            // A live form must not switch to a provider that cannot verify.
            disabled: published && !p.configured && p.id !== value,
        })),
    ];

    return (
        <section className="ff:flex ff:flex-col ff:gap-3 ff:border-t ff:border-slate-200 ff:pt-4">
            <p className="ff:m-0 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {__("Spam protection")}
            </p>
            <div className="ff:flex ff:items-start ff:gap-2.5 ff:rounded-lg ff:border ff:border-emerald-200 ff:bg-emerald-50 ff:p-3">
                <ShieldCheck aria-hidden className="ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0 ff:text-emerald-700" />
                <div>
                    <p className="ff:m-0 ff:text-sm ff:font-medium ff:text-slate-900">{__("Built-in protection")}</p>
                    <p className="ff:m-0 ff:text-xs ff:text-emerald-800">{__("Always active and invisible to visitors.")}</p>
                </div>
            </div>
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label htmlFor="ff-form-captcha">{__("CAPTCHA (optional)")}</Label>
                <Select
                    id="ff-form-captcha"
                    className="ff:w-full"
                    value={value}
                    options={options}
                    onChange={(e) =>
                        onChange({ ...config, settings: { ...config.settings, captcha: e.target.value as CaptchaId } })
                    }
                />
            </div>
            {!ready && (
                <div role="alert" className="ff:flex ff:items-start ff:gap-2 ff:rounded-md ff:bg-amber-50 ff:p-2.5 ff:text-xs ff:text-amber-800">
                    <AlertTriangle aria-hidden className="ff:mt-0.5 ff:h-3.5 ff:w-3.5 ff:shrink-0" />
                    <span>
                        {published
                            ? sprintf(__("%s has no keys, so this published form rejects every submission."), label)
                            : sprintf(__("%s has no keys yet. You can keep editing, but the form cannot be published until they are added."), label)}{" "}
                        <a href="#/settings" className="ff:font-medium ff:text-amber-900 ff:underline">
                            {__("Add keys in Settings")}
                        </a>
                    </span>
                </div>
            )}
            <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">
                {__("Provider keys are managed in Settings. Secret keys are never stored in the form.")}
            </p>
        </section>
    );
}

