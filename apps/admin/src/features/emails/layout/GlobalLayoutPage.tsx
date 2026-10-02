import { useState } from "react";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { LayoutSetEditor } from "./LayoutSetEditor";
import { useEmailLayout } from "./useEmailLayout";

/**
 * The global header & footer screen: picks which set is being edited and hands
 * it to the editor. The editor is keyed by set, so switching starts it fresh
 * (its own undo history, selection and autosave).
 */
export function GlobalLayoutPage() {
    const { data: layout, isLoading } = useEmailLayout();
    const [picked, setPicked] = useState<string | null>(null);

    if (isLoading || !layout) {
        return <EditorSkeleton />;
    }

    // A set that was deleted (or never picked) falls back to the default.
    const setId = layout.sets.some((s) => s.id === picked) ? (picked as string) : layout.default;

    return <LayoutSetEditor key={setId} layout={layout} setId={setId} onSetChange={setPicked} />;
}
