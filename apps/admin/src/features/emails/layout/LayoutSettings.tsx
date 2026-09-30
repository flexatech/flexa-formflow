import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { __, sprintf } from "@/lib/i18n";
import { useEmailLayout, useSaveEmailLayout, type LayoutScope } from "./useEmailLayout";

/**
 * The layout editor's right panel when no block is selected: the master switch,
 * which emails it covers, and a note on templates whose own logo or footer it
 * replaces.
 */
export function LayoutSettings() {
    const { data: layout } = useEmailLayout();
    const save = useSaveEmailLayout();
    const hasWoo = window.flexaFormFlow?.hasWooCommerce ?? false;

    if (!layout) return null;

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <h3 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Global header & footer")}</h3>
            <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                {__(
                    "Design a header and footer once and wrap it around your emails. Change it here and every email follows.",
                )}
            </p>

            <label className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:rounded-lg ff:border ff:border-slate-200 ff:px-3 ff:py-2.5">
                <span className="ff:text-sm ff:font-medium ff:text-slate-800">{__("Show on emails")}</span>
                <Switch
                    checked={layout.enabled}
                    onCheckedChange={(enabled) => save.mutate({ enabled })}
                    aria-label={__("Show the global header and footer")}
                />
            </label>

            {hasWoo && (
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label className="ff:block">{__("Apply to")}</Label>
                    <Select
                        value={layout.scope}
                        options={[
                            { value: "all", label: __("All emails") },
                            { value: "woocommerce", label: __("WooCommerce emails only") },
                        ]}
                        onChange={(e) => save.mutate({ scope: e.target.value as LayoutScope })}
                    />
                    <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                        {layout.scope === "woocommerce"
                            ? __("Form notifications and confirmations are left as they are.")
                            : __("Form notifications, confirmations, workflows and WooCommerce emails.")}
                    </p>
                </div>
            )}

            {layout.enabled && layout.overlap.length > 0 && (
                <p className="ff:m-0 ff:flex ff:items-start ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-3 ff:py-2.5 ff:text-xs ff:text-slate-600">
                    <Info aria-hidden className="ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
                    <span>
                        {sprintf(
                            __(
                                "%d templates have their own logo or footer. While this is on, the global ones replace them; nothing is deleted.",
                            ),
                            layout.overlap.length,
                        )}
                    </span>
                </p>
            )}

            <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                {__("Select a block to edit it. A template can opt out under its Template design.")}
            </p>
        </div>
    );
}
