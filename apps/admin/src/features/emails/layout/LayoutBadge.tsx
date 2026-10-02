import { cn } from "@/lib/cn";
import type { EmailElement, TreeSettings } from "../types";
import { layoutStatus, type LayoutStatusTone } from "./layoutStatus";
import { useEmailLayout } from "./useEmailLayout";

const TONES: Record<LayoutStatusTone, string> = {
    on: "ff:bg-brand-50 ff:text-brand-700",
    muted: "ff:bg-slate-100 ff:text-slate-500",
    warn: "ff:bg-amber-50 ff:text-amber-700",
};

/**
 * The global header/footer status of one email, as a small badge. Renders
 * nothing while the layout is off, so lists stay clean for people not using it.
 */
export function LayoutBadge({
    settings,
    elements,
    kind,
}: {
    settings: TreeSettings;
    elements: EmailElement[];
    kind: "woo" | "form";
}) {
    const { data: layout } = useEmailLayout();
    if (!layout?.enabled) return null;

    const status = layoutStatus(settings, elements, layout, kind);

    return (
        <span
            title={status.detail}
            className={cn(
                "ff:inline-flex ff:max-w-full ff:items-center ff:truncate ff:rounded ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:font-medium",
                TONES[status.tone],
            )}
        >
            {status.label}
        </span>
    );
}
