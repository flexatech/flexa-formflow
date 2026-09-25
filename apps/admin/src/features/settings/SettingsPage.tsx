import { Palette, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/custom/ColorField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { SECRET_MASK, useSaveSettings, useSettings, type PluginSettings } from "./useSettings";

type Draft = Pick<
    PluginSettings,
    "brand_color" | "delete_data_on_uninstall" | "ai_provider" | "ai_model" | "ai_api_key"
>;

function toDraft(settings: PluginSettings): Draft {
    return {
        brand_color: settings.brand_color,
        delete_data_on_uninstall: settings.delete_data_on_uninstall,
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model,
        ai_api_key: settings.ai_api_key,
    };
}

export function SettingsPage() {
    const { data: settings, isLoading } = useSettings();
    const save = useSaveSettings();
    const showToast = useUiStore((s) => s.showToast);
    const [draft, setDraft] = useState<Draft | null>(null);

    useEffect(() => {
        if (settings && draft === null) {
            setDraft(toDraft(settings));
        }
    }, [settings, draft]);

    if (isLoading || !settings || !draft) {
        return (
            <div className="ff:p-6">
                <div className="ff:h-40 ff:animate-pulse ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white" />
            </div>
        );
    }

    const dirty =
        draft.brand_color !== settings.brand_color ||
        draft.delete_data_on_uninstall !== settings.delete_data_on_uninstall ||
        draft.ai_provider !== settings.ai_provider ||
        draft.ai_model !== settings.ai_model ||
        draft.ai_api_key !== settings.ai_api_key;

    const onSave = () => {
        const partial: Partial<PluginSettings> = {};
        if (draft.brand_color !== settings.brand_color) partial.brand_color = draft.brand_color;
        if (draft.delete_data_on_uninstall !== settings.delete_data_on_uninstall)
            partial.delete_data_on_uninstall = draft.delete_data_on_uninstall;
        if (draft.ai_provider !== settings.ai_provider) partial.ai_provider = draft.ai_provider;
        if (draft.ai_model !== settings.ai_model) partial.ai_model = draft.ai_model;
        if (draft.ai_api_key !== settings.ai_api_key) partial.ai_api_key = draft.ai_api_key;

        save.mutate(partial, {
            onSuccess: (next) => {
                setDraft(toDraft(next));
                showToast(__("Settings saved."));
            },
            onError: (error) => {
                showToast(error instanceof Error ? error.message : __("Could not save settings."), "error");
            },
        });
    };

    const keyStored = settings.ai_api_key === SECRET_MASK;

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Settings")}</h1>
                <Button onClick={onSave} disabled={!dirty || save.isPending}>
                    {save.isPending ? __("Saving…") : __("Save changes")}
                </Button>
            </div>

            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                        <Palette aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-brand-color" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Brand color")}
                        </Label>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("Used as the default accent in your email templates.")}
                        </p>
                    </div>
                    <ColorField
                        id="ff-brand-color"
                        swatchLabel={__("Pick brand color")}
                        value={draft.brand_color}
                        onChange={(brand_color) => setDraft({ ...draft, brand_color })}
                        inputClassName="ff:w-28"
                    />
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-t ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-red-50 ff:text-red-600">
                        <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-delete-data" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Delete data on uninstall")}
                        </Label>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("Remove all plugin data when the plugin is deleted. Forms and entries are kept unless this is on.")}
                        </p>
                    </div>
                    <Switch
                        id="ff-delete-data"
                        checked={draft.delete_data_on_uninstall}
                        onCheckedChange={(next) => setDraft({ ...draft, delete_data_on_uninstall: next })}
                    />
                </div>
            </section>

            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                        <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <h2 className="ff:text-sm ff:font-medium ff:text-slate-900">{__("AI assistant")}</h2>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("Bring your own key. Text you submit is sent to the chosen provider; nothing is sent automatically.")}
                        </p>
                    </div>
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:px-5 ff:py-4">
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-ai-provider" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Provider")}
                        </Label>
                    </div>
                    <Select
                        id="ff-ai-provider"
                        className="ff:w-44"
                        options={[
                            { value: "anthropic", label: "Anthropic (Claude)" },
                            { value: "openai", label: "OpenAI" },
                            { value: "gemini", label: "Google Gemini" },
                        ]}
                        value={draft.ai_provider}
                        onChange={(e) => setDraft({ ...draft, ai_provider: e.target.value as Draft["ai_provider"] })}
                    />
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-t ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-ai-model" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Model")}
                        </Label>
                        <p className="ff:text-xs ff:text-slate-500">{__("Optional. Leave blank for the provider default.")}</p>
                    </div>
                    <Input
                        id="ff-ai-model"
                        value={draft.ai_model}
                        onChange={(e) => setDraft({ ...draft, ai_model: e.target.value })}
                        className="ff:w-56"
                        placeholder={__("Default model")}
                        spellCheck={false}
                    />
                </div>
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-t ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:min-w-0 ff:flex-1">
                        <Label htmlFor="ff-ai-key" className="ff:block ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("API key")}
                        </Label>
                        <p className="ff:text-xs ff:text-slate-500">
                            {keyStored
                                ? __("A key is saved. Enter a new one to replace it.")
                                : __("Stored encrypted. Never shown again after saving.")}
                        </p>
                    </div>
                    <Input
                        id="ff-ai-key"
                        type="password"
                        value={draft.ai_api_key === SECRET_MASK ? "" : draft.ai_api_key}
                        onChange={(e) => setDraft({ ...draft, ai_api_key: e.target.value })}
                        className="ff:w-56"
                        placeholder={keyStored ? "••••••••••••" : "sk-…"}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </section>
        </div>
    );
}
