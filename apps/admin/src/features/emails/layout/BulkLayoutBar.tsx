import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useApplyLayout, useEmailLayout, type LayoutAssignBackup } from "./useEmailLayout";

const SHOW_PARTS = "show_parts";

/**
 * Bulk header/footer changes for the templates ticked in the list: give them a
 * set (the default, another, or none) or bring back a hidden header/footer.
 * Only design settings change, never blocks. After applying, a line says how
 * many changed and offers to undo exactly that.
 */
export function BulkLayoutBar({ selected, onClear }: { selected: number[]; onClear: () => void }) {
    const { data: layout } = useEmailLayout();
    const apply = useApplyLayout();
    const showToast = useUiStore((s) => s.showToast);
    const [action, setAction] = useState("");
    const [undo, setUndo] = useState<{ changed: number; previous: LayoutAssignBackup[] } | null>(null);

    // A new selection makes the last result stale.
    useEffect(() => {
        if (selected.length > 0) setUndo(null);
    }, [selected.length]);

    if (!layout?.enabled || (selected.length === 0 && !undo)) return null;

    const run = () => {
        if (action === "") return;
        const vars =
            action === SHOW_PARTS
                ? { ids: selected, show_parts: true }
                : { ids: selected, set: action === "default" ? "" : action };
        apply.mutate(vars, {
            onSuccess: (result) => {
                setUndo({ changed: result.changed, previous: result.previous ?? [] });
                setAction("");
                onClear();
            },
            onError: () => showToast(__("Could not update the templates."), "error"),
        });
    };

    const onUndo = () => {
        if (!undo) return;
        apply.mutate(
            { restore: undo.previous },
            {
                onSuccess: () => setUndo(null),
                onError: () => showToast(__("Could not undo the change."), "error"),
            },
        );
    };

    const defaultName = layout.sets.find((s) => s.id === layout.default)?.name ?? "";

    return (
        <div
            role="region"
            aria-label={__("Bulk header and footer")}
            className="ff:flex ff:flex-wrap ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:border-brand-200 ff:bg-brand-50 ff:px-4 ff:py-2.5 ff:text-sm ff:text-slate-700"
        >
            {selected.length > 0 ? (
                <>
                    <span className="ff:font-medium">{sprintf(__("%d selected"), selected.length)}</span>
                    <Select
                        aria-label={__("Header and footer action")}
                        value={action}
                        options={[
                            { value: "", label: __("Header & footer…") },
                            { value: "default", label: sprintf(__("Use the default set (%s)"), defaultName) },
                            ...layout.sets
                                .filter((s) => s.id !== layout.default)
                                .map((s) => ({ value: s.id, label: sprintf(__("Use “%s”"), s.name) })),
                            { value: "none", label: __("Use no header/footer") },
                            { value: SHOW_PARTS, label: __("Show any hidden header and footer") },
                        ]}
                        onChange={(e) => setAction(e.target.value)}
                    />
                    <Button size="sm" onClick={run} disabled={action === "" || apply.isPending}>
                        {__("Apply")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onClear}>
                        {__("Clear selection")}
                    </Button>
                </>
            ) : (
                undo && (
                    <>
                        <span>
                            {undo.changed === 0
                                ? __("Nothing needed changing.")
                                : sprintf(__("Updated %d templates. Nothing in their blocks changed."), undo.changed)}
                        </span>
                        {undo.changed > 0 && (
                            <Button size="sm" variant="outline" onClick={onUndo} disabled={apply.isPending}>
                                {__("Undo")}
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setUndo(null)}>
                            {__("Dismiss")}
                        </Button>
                    </>
                )
            )}
        </div>
    );
}
