import { MoreVertical, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";

export interface MoreMenuItem {
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
    destructive?: boolean;
}

/** The "⋮" overflow menu for secondary actions in a toolbar. */
export function MoreMenu({ items, label = __("More actions") }: { items: MoreMenuItem[]; label?: string }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const onBlur = () => setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("blur", onBlur);
        rootRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("blur", onBlur);
        };
    }, [open]);

    // Arrow keys move between items, as in a native menu.
    const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"));
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (at + 1) % buttons.length : (at - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
    };

    return (
        <div ref={rootRef} className="ff:relative">
            <Button
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <MoreVertical aria-hidden className="ff:h-4 ff:w-4" />
            </Button>
            {open && (
                <div
                    role="menu"
                    aria-label={label}
                    onKeyDown={onMenuKey}
                    className="ff:absolute ff:right-0 ff:top-full ff:z-40 ff:mt-1 ff:flex ff:w-56 ff:flex-col ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:p-1 ff:shadow-lg"
                >
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    item.onSelect();
                                }}
                                className={cn(
                                    "ff:flex ff:cursor-pointer ff:items-center ff:gap-2 ff:rounded-md ff:border-0 ff:bg-transparent ff:px-2.5 ff:py-2 ff:text-left ff:text-sm ff:outline-none",
                                    item.destructive
                                        ? "ff:text-red-600 ff:hover:bg-red-50 ff:focus:bg-red-50"
                                        : "ff:text-slate-700 ff:hover:bg-slate-100 ff:focus:bg-slate-100",
                                )}
                            >
                                <Icon aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
