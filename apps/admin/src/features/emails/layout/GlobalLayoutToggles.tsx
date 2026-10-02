import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import type { TreeSettings } from "../types";
import { partMode, withPartMode, type LayoutPart, type PartMode } from "./partModes";
import { useEmailLayout } from "./useEmailLayout";

/**
 * A template's choice of global header and footer, shown in its design panel
 * only while the layout is on: which set it uses (the default, another, or
 * none), then, per part, whether to use the set's part as is, keep its own
 * copy of it, or show nothing. An overridden part is edited in the email
 * editor itself (`onEditPart`).
 */
export function GlobalLayoutToggles({
    settings,
    onChange,
    onEditPart,
}: {
    settings: TreeSettings;
    onChange: (settings: TreeSettings) => void;
    onEditPart?: (part: LayoutPart) => void;
}) {
    const { data: layout } = useEmailLayout();
    if (!layout?.enabled) return null;

    const known = layout.sets.some((s) => s.id === settings.layoutSet);
    const pick = settings.layoutSet === "none" ? "none" : known ? (settings.layoutSet as string) : "";
    const defaultName = layout.sets.find((s) => s.id === layout.default)?.name ?? "";

    const modeOptions = [
        { value: "global", label: __("Use global") },
        { value: "override", label: __("Override for this email") },
        { value: "disabled", label: __("Disabled") },
    ];

    const partRow = (part: LayoutPart, label: string) => {
        const mode = partMode(settings, part);
        const id = `ff-layout-${part}-mode`;
        return (
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Select
                    id={id}
                    value={mode}
                    options={modeOptions}
                    onChange={(e) => onChange(withPartMode(settings, part, e.target.value as PartMode, layout))}
                />
                {mode === "override" && (
                    <div className="ff:flex ff:items-center ff:justify-between ff:gap-2">
                        <span className="ff:text-[11px] ff:text-slate-500">
                            {__("This email keeps its own copy. Global changes no longer reach it.")}
                        </span>
                        {onEditPart && (
                            <Button variant="outline" size="sm" onClick={() => onEditPart(part)}>
                                <Pencil aria-hidden className="ff:h-3.5 ff:w-3.5" />
                                {__("Edit")}
                            </Button>
                        )}
                    </div>
                )}
                {mode === "global" && pick === "none" && (
                    <span className="ff:text-[11px] ff:text-amber-700">
                        {__("No set is chosen above, so nothing shows here.")}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <div className="ff:flex ff:items-center ff:justify-between">
                <h4 className="ff:m-0 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-500">
                    {__("Global header & footer")}
                </h4>
                <a href="#/emails/layout" className="ff:text-xs ff:font-medium ff:text-brand-700">
                    {__("Edit global")}
                </a>
            </div>
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label htmlFor="ff-layout-set">{__("Header and footer set")}</Label>
                <Select
                    id="ff-layout-set"
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
            {partRow("header", __("Header"))}
            {partRow("footer", __("Footer"))}
        </div>
    );
}
