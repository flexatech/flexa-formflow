import { Copy, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useSettings } from "@/features/settings/useSettings";
import { SECRET_MASK } from "@/features/settings/useSettings";
import { useGenerateForm, useGenerateText, type TextAction } from "./useAi";

export function AiPage() {
    const { data: settings } = useSettings();
    const hasKey = settings?.ai_api_key === SECRET_MASK;

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:flex-col ff:gap-1">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("AI assistant")}</h1>
                <p className="ff:text-sm ff:text-slate-500">
                    {__("Draft a form from a description, or polish your email and form copy. Uses your own provider API key.")}
                </p>
            </div>

            {settings && !hasKey ? (
                <div className="ff:flex ff:items-center ff:justify-between ff:gap-4 ff:rounded-xl ff:border ff:border-amber-200 ff:bg-amber-50/60 ff:px-5 ff:py-4">
                    <p className="ff:text-sm ff:text-amber-800">
                        {__("Add an AI provider API key in Settings to turn these tools on.")}
                    </p>
                    <Button variant="outline" onClick={() => navigate("/settings")}>
                        {__("Open settings")}
                    </Button>
                </div>
            ) : null}

            <FormGenerator disabled={!hasKey} />
            <WritingAssistant disabled={!hasKey} />
        </div>
    );
}

function FormGenerator({ disabled }: { disabled: boolean }) {
    const generate = useGenerateForm();
    const showToast = useUiStore((s) => s.showToast);
    const [prompt, setPrompt] = useState("");

    const onGenerate = () => {
        generate.mutate(prompt.trim(), {
            onSuccess: (form) => {
                showToast(__("Form drafted. Review and publish it."));
                navigate(`/forms/${form.id}/edit`);
            },
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Could not generate the form."), "error"),
        });
    };

    return (
        <section className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
            <div className="ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                    <Wand2 aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div>
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Generate a form")}</h2>
                    <p className="ff:text-xs ff:text-slate-500">{__("Describe what you need. A draft form opens in the builder.")}</p>
                </div>
            </div>
            <textarea
                className="flexa-formflow-control ff:min-h-24 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={__("e.g. A contact form for a dentist: name, email, phone, preferred appointment date, and a message.")}
                disabled={disabled}
            />
            <div className="ff:flex ff:justify-end">
                <Button onClick={onGenerate} disabled={disabled || generate.isPending || prompt.trim() === ""}>
                    <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                    {generate.isPending ? __("Drafting…") : __("Generate form")}
                </Button>
            </div>
        </section>
    );
}

const ACTIONS: Array<{ action: TextAction; label: string }> = [
    { action: "rewrite", label: __("Improve") },
    { action: "shorten", label: __("Shorten") },
    { action: "tone", label: __("Friendlier") },
    { action: "subject", label: __("Subject ideas") },
];

function WritingAssistant({ disabled }: { disabled: boolean }) {
    const generate = useGenerateText();
    const showToast = useUiStore((s) => s.showToast);
    const [text, setText] = useState("");
    const [result, setResult] = useState("");

    const run = (action: TextAction) => {
        generate.mutate(
            { action, text: text.trim(), tone: action === "tone" ? "warm and friendly" : undefined },
            {
                onSuccess: (out) => setResult(out),
                onError: (error) =>
                    showToast(error instanceof Error ? error.message : __("The assistant could not respond."), "error"),
            },
        );
    };

    const copy = () => {
        void navigator.clipboard?.writeText(result);
        showToast(__("Copied to clipboard."));
    };

    return (
        <section className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
            <div className="ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                    <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div>
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Writing assistant")}</h2>
                    <p className="ff:text-xs ff:text-slate-500">{__("Paste email or form copy, then pick an action.")}</p>
                </div>
            </div>
            <textarea
                className="flexa-formflow-control ff:min-h-24 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={__("Paste your text here. Tokens like {form_title} are preserved.")}
                disabled={disabled}
            />
            <div className="ff:flex ff:flex-wrap ff:gap-2">
                {ACTIONS.map((a) => (
                    <Button
                        key={a.action}
                        variant="outline"
                        onClick={() => run(a.action)}
                        disabled={disabled || generate.isPending || text.trim() === ""}
                    >
                        {a.label}
                    </Button>
                ))}
            </div>
            {result !== "" && (
                <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:p-3">
                    <div className="ff:mb-2 ff:flex ff:items-center ff:justify-between">
                        <span className="ff:text-xs ff:font-medium ff:text-slate-500">{__("Result")}</span>
                        <Button variant="ghost" size="sm" onClick={copy}>
                            <Copy aria-hidden className="ff:h-3.5 ff:w-3.5" />
                            {__("Copy")}
                        </Button>
                    </div>
                    <p className="ff:whitespace-pre-wrap ff:text-sm ff:text-slate-700">{result}</p>
                </div>
            )}
        </section>
    );
}
