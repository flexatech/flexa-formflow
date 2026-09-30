import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { __, sprintf } from "@/lib/i18n";
import type { TreeSettings } from "../types";
import { useEmailLayout } from "./useEmailLayout";

/**
 * A template's choice of global header and footer, shown in its design panel
 * only while the layout is on: which set it uses (the default, another, or
 * none) and, independently, whether to hide the header or the footer. A
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

    const known = layout.sets.some((s) => s.id === settings.layoutSet);
    const pick = settings.layoutSet === "none" ? "none" : known ? (settings.layoutSet as string) : "";
    const defaultName = layout.sets.find((s) => s.id === layout.default)?.name ?? "";

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
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label>{__("Header and footer set")}</Label>
                <Select
                    aria-label={__("Header and footer set")}
                    value={pick}
                    options={[
                        { value: "", label: sprintf(__("Default (%s)"), defaultName) },
                        ...layout.sets
                            .filter((s) => s.id !== layout.default)
                            .map((s) => ({ value: s.id, label: s.name })),
                        { value: "none", label: __("None") },
                    ]}
                    onChange={(e) => onChange({ ...settings, layoutSet: e.target.value === "" ? undefined : e.target.value })}
                />
            </div>
            {pick !== "none" && (
                <>
                    {row(__("Hide global header"), Boolean(settings.hideGlobalHeader), "hideGlobalHeader")}
                    {row(__("Hide global footer"), Boolean(settings.hideGlobalFooter), "hideGlobalFooter")}
                </>
            )}
        </div>
    );
}
