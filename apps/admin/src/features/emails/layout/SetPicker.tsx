import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useAddLayoutSet, type EmailLayout } from "./useEmailLayout";

/**
 * Choose which header/footer set is being edited, or add one: from a ready
 * design, blank, or as a copy of the current set. New sets are copies the user
 * owns; nothing is applied to any email until a template (or the default) uses it.
 */
export function SetPicker({
    layout,
    activeId,
    onChange,
}: {
    layout: EmailLayout;
    activeId: string;
    onChange: (id: string) => void;
}) {
    const add = useAddLayoutSet();
    const showToast = useUiStore((s) => s.showToast);
    const [open, setOpen] = useState(false);

    const create = (vars: { preset?: string; from?: string }) => {
        setOpen(false);
        add.mutate(vars, {
            onSuccess: (next) => onChange(next.created),
            onError: () => showToast(__("Could not add the set."), "error"),
        });
    };

    const active = layout.sets.find((s) => s.id === activeId);

    return (
        <div className="ff:relative ff:flex ff:items-center ff:gap-2">
            <Select
                aria-label={__("Header and footer set")}
                className="ff:max-w-56"
                value={activeId}
                options={layout.sets.map((set) => ({
                    value: set.id,
                    label: set.id === layout.default ? sprintf(__("%s (default)"), set.name) : set.name,
                }))}
                onChange={(e) => onChange(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} disabled={add.isPending}>
                <Plus aria-hidden className="ff:h-4 ff:w-4" />
                {__("New set")}
            </Button>
            {open && (
                <div
                    role="menu"
                    className="ff:absolute ff:left-0 ff:top-full ff:z-30 ff:mt-1 ff:flex ff:w-64 ff:flex-col ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:p-1 ff:shadow-lg"
                >
                    {layout.presets.map((preset) => (
                        <MenuItem key={preset.key} onClick={() => create({ preset: preset.key })}>
                            {preset.key === "blank" ? __("Blank set") : sprintf(__("%s design"), preset.label)}
                        </MenuItem>
                    ))}
                    {active && (
                        <MenuItem onClick={() => create({ from: active.id })}>
                            {sprintf(__("Copy of “%s”"), active.name)}
                        </MenuItem>
                    )}
                </div>
            )}
        </div>
    );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="ff:cursor-pointer ff:rounded-md ff:border-0 ff:bg-transparent ff:px-3 ff:py-2 ff:text-left ff:text-sm ff:text-slate-700 ff:hover:bg-slate-100"
        >
            {children}
        </button>
    );
}
