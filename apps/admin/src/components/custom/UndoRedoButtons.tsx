import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Undo/redo toolbar pair; the tooltips name the platform's shortcut. */
export function UndoRedoButtons({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}) {
    const undoHint = IS_MAC ? "⌘Z" : "Ctrl+Z";
    const redoHint = IS_MAC ? "⇧⌘Z" : "Ctrl+Y";

    return (
        <div className="ff:flex ff:items-center ff:gap-0.5">
            <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label={__("Undo")}
                title={`${__("Undo")} (${undoHint})`}
            >
                <Undo2 aria-hidden className="ff:h-4 ff:w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label={__("Redo")}
                title={`${__("Redo")} (${redoHint})`}
            >
                <Redo2 aria-hidden className="ff:h-4 ff:w-4" />
            </Button>
        </div>
    );
}
