import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import type { TreeSettings } from "../types";
import { useEmailLayout } from "./useEmailLayout";

/**
 * A template's opt-out of the global header and footer, shown in its design
 * panel only while the layout is on. Each part is hidden independently, so a
 * template with its own logo can still keep the global footer.
 */
export function GlobalLayoutToggles({
    settings,
    onChange,
}: {
    settings: TreeSettings;
    onChange: (settings: TreeSettings) => void;
}) {
    const { data: layout } = useEmailLayout();
    if (!layout?.enabled) return null;

    const row = (label: string, checked: boolean, key: "hideGlobalHeader" | "hideGlobalFooter") => (
        <div className="ff:flex ff:items-center ff:justify-between ff:gap-3">
            <Label className="ff:m-0">{label}</Label>
            <Switch
                checked={checked}
                onCheckedChange={(next) => onChange({ ...settings, [key]: next ? true : undefined })}
                aria-label={label}
            />
        </div>
    );

    return (
        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <div className="ff:flex ff:items-center ff:justify-between">
                <h4 className="ff:m-0 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-500">
                    {__("Global header & footer")}
                </h4>
                <a href="#/emails/layout" className="ff:text-xs ff:font-medium ff:text-brand-700">
                    {__("Edit")}
                </a>
            </div>
            {row(__("Hide global header"), Boolean(settings.hideGlobalHeader), "hideGlobalHeader")}
            {row(__("Hide global footer"), Boolean(settings.hideGlobalFooter), "hideGlobalFooter")}
        </div>
    );
}
