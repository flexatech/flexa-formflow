import { Blocks, ChevronLeft, ChevronRight } from "lucide-react";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/**
 * Wraps a builder side panel with a collapse/expand pill on the edge facing the
 * canvas. Collapsed, the panel shrinks to a thin rail so the preview gets the
 * room; the pill flips its arrow to expand it again.
 */
export function SidePanel({
    side,
    collapsed,
    onToggle,
    children,
}: {
    side: "left" | "right";
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    // The pill sits on the border between the panel and the canvas: the right
    // edge of a left panel, the left edge of a right panel.
    const pillOnRight = side === "left";
    const Icon =
        side === "left"
            ? collapsed
                ? ChevronRight
                : ChevronLeft
            : collapsed
              ? ChevronLeft
              : ChevronRight;

    return (
        <div className="ff:relative ff:shrink-0">
            {collapsed ? (
                <div
                    className={cn(
                        "ff:h-full ff:w-7 ff:bg-white",
                        side === "left" ? "ff:border-r" : "ff:border-l",
                        "ff:border-slate-200",
                    )}
                />
            ) : (
                children
            )}
            <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? __("Expand panel") : __("Collapse panel")}
                aria-expanded={!collapsed}
                className={cn(
                    "ff:absolute ff:top-1/2 ff:z-10 ff:flex ff:h-10 ff:w-5 ff:-translate-y-1/2 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded-full ff:border ff:border-slate-200 ff:bg-white ff:text-slate-500 ff:shadow-sm ff:transition-colors ff:hover:text-slate-800",
                    pillOnRight ? "ff:right-0 ff:translate-x-1/2" : "ff:left-0 ff:-translate-x-1/2",
                )}
            >
                <Icon aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </div>
    );
}

export function LeftTab({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: typeof Blocks;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "ff:flex ff:flex-1 ff:items-center ff:justify-center ff:gap-1.5 ff:rounded-md ff:px-2 ff:py-1.5 ff:text-xs ff:font-medium ff:transition-colors",
                active
                    ? "ff:bg-brand-50 ff:text-brand-700"
                    : "ff:text-slate-600 ff:hover:bg-slate-50 ff:hover:text-slate-900",
            )}
        >
            <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
            {label}
        </button>
    );
}
