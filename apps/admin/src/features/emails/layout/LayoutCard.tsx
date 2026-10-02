import { LayoutPanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useEmailLayout, useSaveEmailLayout } from "./useEmailLayout";

/**
 * The Emails screen's entry to the global header & footer: whether it is on,
 * a switch, and the way into its editor.
 */
export function LayoutCard() {
    const { data: layout } = useEmailLayout();
    const save = useSaveEmailLayout();

    if (!layout) return null;

    return (
        <section className="ff:flex ff:items-center ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-5 ff:py-4">
            <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                <LayoutPanelTop aria-hidden className="ff:h-4 ff:w-4" />
            </div>
            <div className="ff:min-w-0 ff:flex-1">
                <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Global header & footer")}</h2>
                <p className="ff:mt-0.5 ff:text-xs ff:text-slate-500">
                    {layout.enabled
                        ? layout.scope === "woocommerce"
                            ? __("On for WooCommerce emails. Edit it once and they all follow.")
                            : __("On for every email. Edit it once and they all follow.")
                        : __("Design a header and footer once and wrap it around your emails.")}
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/emails/layout")}>
                {__("Customize")}
            </Button>
            <Switch
                checked={layout.enabled}
                onCheckedChange={(enabled) => save.mutate({ enabled })}
                aria-label={__("Show the global header and footer")}
            />
        </section>
    );
}
