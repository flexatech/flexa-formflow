import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type SaveState = "saving" | "dirty" | "saved";

/**
 * Autosave indicator. All three states share one grid cell and only the
 * current one is visible, so the badge is always as wide as its longest label
 * in the active language: the text changes, the width never does, and nothing
 * beside it moves. Each state is right-aligned in that cell, so the spare
 * width sits on the left, blending into the title's empty space instead of
 * opening a gap before the toolbar buttons.
 */
export function SaveStatus({ state }: { state: SaveState }) {
    const labels: Record<SaveState, string> = {
        saving: __("Saving…"),
        dirty: __("Unsaved changes"),
        saved: __("Saved"),
    };

    return (
        <span className="ff:grid ff:shrink-0 ff:whitespace-nowrap ff:text-xs ff:font-medium" role="status">
            {(Object.keys(labels) as SaveState[]).map((key) => (
                <span
                    key={key}
                    aria-hidden={key !== state}
                    className={cn(
                        "ff:[grid-area:1/1] ff:flex ff:items-center ff:gap-1.5 ff:justify-self-end",
                        key === "saved" ? "ff:text-emerald-600" : "ff:text-amber-600",
                        key !== state && "ff:invisible",
                    )}
                >
                    <span
                        className={cn(
                            "ff:h-1.5 ff:w-1.5 ff:shrink-0 ff:rounded-full",
                            key === "saved" ? "ff:bg-emerald-500" : "ff:animate-pulse ff:bg-amber-500",
                        )}
                    />
                    {labels[key]}
                </span>
            ))}
        </span>
    );
}
