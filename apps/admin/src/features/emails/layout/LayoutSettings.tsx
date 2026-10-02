import { AlertTriangle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import {
    useDeleteLayoutSet,
    useSaveEmailLayout,
    useUpdateLayoutSet,
    type EmailLayout,
    type LayoutScope,
    type LayoutSet,
} from "./useEmailLayout";

/**
 * The layout editor's right panel when no block is selected: the master switch,
 * which emails it covers, the set being edited (name, default, delete), and a
 * note on templates whose own logo or footer the global ones replace.
 */
export function LayoutSettings({
    layout,
    set,
    onSetChange,
}: {
    layout: EmailLayout;
    set: LayoutSet;
    onSetChange: (id: string) => void;
}) {
    const save = useSaveEmailLayout();
    const hasWoo = window.flexaFormFlow?.hasWooCommerce ?? false;

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <h3 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Global header & footer")}</h3>
            <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                {__(
                    "Design a header and footer once and wrap it around your emails. Change it here and every email follows.",
                )}
            </p>

            {!layout.enabled && (
                <div
                    role="alert"
                    className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-amber-200 ff:bg-amber-50 ff:px-3 ff:py-2.5 ff:text-xs ff:text-amber-800"
                >
                    <p className="ff:m-0 ff:flex ff:items-start ff:gap-2">
                        <AlertTriangle aria-hidden className="ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0 ff:text-amber-500" />
                        <span>{__("The global header and footer are off, so no email uses them yet.")}</span>
                    </p>
                    <Button size="sm" onClick={() => save.mutate({ enabled: true })} disabled={save.isPending}>
                        {__("Turn on")}
                    </Button>
                </div>
            )}

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

            <SetSettings layout={layout} set={set} onSetChange={onSetChange} />

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
                {__("Select a block to edit it. A template picks its set, or opts out, under its Template design.")}
            </p>
        </div>
    );
}

/** The set being edited: rename it, make it the default, or delete it. */
function SetSettings({
    layout,
    set,
    onSetChange,
}: {
    layout: EmailLayout;
    set: LayoutSet;
    onSetChange: (id: string) => void;
}) {
    const save = useSaveEmailLayout();
    const update = useUpdateLayoutSet();
    const remove = useDeleteLayoutSet();
    const showToast = useUiStore((s) => s.showToast);
    const [name, setName] = useState(set.name);
    const [confirming, setConfirming] = useState(false);
    const isDefault = layout.default === set.id;

    useEffect(() => setName(set.name), [set.name]);

    const commitName = () => {
        const next = name.trim();
        if (next === "") setName(set.name);
        else if (next !== set.name) update.mutate({ id: set.id, patch: { name: next } });
    };

    const onDelete = () =>
        remove.mutate(set.id, {
            onSuccess: (next) => onSetChange(next.default),
            onError: () => showToast(__("Could not delete the set."), "error"),
        });

    return (
        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <h4 className="ff:m-0 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-500">
                {__("This set")}
            </h4>
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label htmlFor="ff-set-name">{__("Name")}</Label>
                <Input
                    id="ff-set-name"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
            </div>
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-3">
                <Label className="ff:m-0">{__("Use for emails by default")}</Label>
                <Switch
                    checked={isDefault}
                    disabled={isDefault}
                    onCheckedChange={() => save.mutate({ default: set.id })}
                    aria-label={__("Use this set by default")}
                />
            </div>
            {layout.sets.length > 1 &&
                (confirming ? (
                    <div className="ff:flex ff:flex-col ff:gap-2 ff:text-xs ff:text-slate-600">
                        <p className="ff:m-0">
                            {__("Templates using this set switch to the default one. Delete it?")}
                        </p>
                        <div className="ff:flex ff:gap-2">
                            <Button variant="destructive" size="sm" onClick={onDelete} disabled={remove.isPending}>
                                {__("Delete set")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                                {__("Cancel")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                        {__("Delete this set")}
                    </Button>
                ))}
        </div>
    );
}
