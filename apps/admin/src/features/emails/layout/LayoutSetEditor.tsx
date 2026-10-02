import { ArrowLeft, Blocks, LayoutTemplate, Monitor, Smartphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { SaveStatus } from "@/components/custom/SaveStatus";
import { UndoRedoButtons } from "@/components/custom/UndoRedoButtons";
import { __, sprintf } from "@/lib/i18n";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useUndoable } from "@/lib/useUndoHistory";
import { useForm } from "@/features/forms/useForms";
import { LeftTab, SidePanel } from "../editor/EditorPanels";
import { LayerList } from "../editor/LayerList";
import { PatternPalette } from "../editor/PatternPalette";
import { PreviewPane } from "../editor/PreviewPane";
import { PropsPanel } from "../editor/PropsPanel";
import { createTreeHandlers } from "../editor/treeHandlers";
import { useEmailPatterns } from "../useEmailTemplates";
import { findInTree, sampleSource, type EmailElement, type PreviewSource } from "../types";
import { LayoutSettings } from "./LayoutSettings";
import { SetPicker } from "./SetPicker";
import { updateLayoutSet, useUpdateLayoutSet, type EmailLayout } from "./useEmailLayout";

type Part = "header" | "footer";

interface Draft {
    header: EmailElement[];
    footer: EmailElement[];
}

/**
 * Full-area editor for one header/footer set. It is the email editor's canvas,
 * layer list and props panel pointed at one part of the set at a time; the other
 * part shows read-only around a placeholder for the email's own content.
 * Autosaves both block lists 800ms after the last change, and once more if you
 * switch sets before that. The page remounts it per set, so undo history never
 * crosses from one set to another.
 */
export function LayoutSetEditor({
    layout,
    setId,
    onSetChange,
}: {
    layout: EmailLayout;
    setId: string;
    onSetChange: (id: string) => void;
}) {
    const set = layout.sets.find((s) => s.id === setId) ?? layout.sets[0];
    const save = useUpdateLayoutSet();
    const queryClient = useQueryClient();
    const showToast = useUiStore((s) => s.showToast);
    const selectedId = useUiStore((s) => s.selectedElementId);
    const setSelectedElement = useUiStore((s) => s.setSelectedElement);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [part, setPart] = useState<Part>("header");
    const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
    const [leftTab, setLeftTab] = useState<"blocks" | "patterns">("blocks");
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [previewSource, setPreviewSource] = useState<PreviewSource>(sampleSource);
    const previewFormId = previewSource.formId;
    const lastSaved = useRef("");

    const { data: previewForm } = useForm(previewFormId);
    // Only the patterns made for the part being edited (header or footer).
    const { data: library, isLoading: patternsLoading } = useEmailPatterns(
        part === "header" ? "global-header" : "global-footer",
    );
    const patterns = library?.patterns ?? [];
    // A template picked while the part already has blocks waits for a choice.
    const [pendingPattern, setPendingPattern] = useState<string | null>(null);

    useEffect(() => {
        if (draft === null) {
            const initial: Draft = { header: set.header, footer: set.footer };
            setDraft(initial);
            lastSaved.current = JSON.stringify(initial);
        }
    }, [set, draft]);

    // Switching sets (or leaving) with an edit still waiting for the autosave
    // sends it now, so it is never lost.
    const pending = useRef<Draft | null>(null);
    useEffect(
        () => () => {
            const unsaved = pending.current;
            if (unsaved) {
                void updateLayoutSet(set.id, unsaved).then((next) => queryClient.setQueryData(["email-layout"], next));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [set.id],
    );

    // Leaving the editor clears the layer selection.
    useEffect(() => () => setSelectedElement(null), [setSelectedElement]);

    const undo = useUndoable<Draft>({
        current: draft,
        restore: (next) => {
            setDraft(next);
            if (selectedId && !findInTree(next[part], selectedId)) setSelectedElement(null);
        },
    });

    useEffect(() => {
        if (!draft) return;
        const snapshot = JSON.stringify(draft);
        if (snapshot === lastSaved.current) {
            pending.current = null;
            return;
        }
        pending.current = draft;
        const timer = window.setTimeout(() => {
            save.mutate(
                { id: set.id, patch: draft },
                {
                    onSuccess: () => {
                        lastSaved.current = snapshot;
                        if (pending.current === draft) pending.current = null;
                    },
                    onError: () => showToast(__("Autosave failed. Your latest change is not stored yet."), "error"),
                },
            );
        }, 800);
        return () => window.clearTimeout(timer);
        // save.mutate and showToast are referentially stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    // The visibility panel needs form fields to test against; a global block
    // can hide itself on a form value just like a template's block.
    const conditionFields = useMemo(() => {
        if (!previewForm || previewFormId === 0) return [];
        return previewForm.config.fields.map((field) => ({ id: field.id, label: field.label || field.id, type: field.type }));
    }, [previewForm, previewFormId]);

    if (!draft) {
        return <EditorSkeleton />;
    }

    const dirty = JSON.stringify(draft) !== lastSaved.current;
    const elements = draft[part];
    const selected = selectedId ? findInTree(elements, selectedId) : null;

    const setElements = (next: EmailElement[], key?: string) => {
        undo.record(draft, key);
        setDraft({ ...draft, [part]: next });
    };
    const handlers = createTreeHandlers({ elements, setElements, patterns, selectedId, setSelectedElement });

    // The other region's blocks are a different list: drop the selection and
    // any template choice still waiting for Replace / Insert.
    const switchPart = (next: Part) => {
        setPart(next);
        setSelectedElement(null);
        setPendingPattern(null);
    };

    return (
        <div className="ff:flex ff:h-[calc(100vh-2rem)] ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2.5">
                <Button variant="ghost" size="icon" aria-label={__("Back to emails")} onClick={() => navigate("/emails")}>
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <h1 className="ff:m-0 ff:shrink-0 ff:truncate ff:text-base ff:font-semibold ff:text-slate-900">
                    {__("Global header & footer")}
                </h1>
                <div className="ff:min-w-0 ff:flex-1">
                    <SetPicker layout={layout} activeId={set.id} onChange={onSetChange} />
                </div>
                <div className="ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5">
                    <PartButton active={part === "header"} onClick={() => switchPart("header")}>
                        {__("Header")}
                    </PartButton>
                    <PartButton active={part === "footer"} onClick={() => switchPart("footer")}>
                        {__("Footer")}
                    </PartButton>
                </div>
                <SaveStatus state={save.isPending ? "saving" : dirty ? "dirty" : "saved"} />
                <UndoRedoButtons {...undo.controls} />
                <div className="ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5">
                    <Button
                        variant={viewport === "desktop" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewport("desktop")}
                        aria-label={__("Desktop preview")}
                    >
                        <Monitor className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button
                        variant={viewport === "mobile" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewport("mobile")}
                        aria-label={__("Mobile preview")}
                    >
                        <Smartphone className="ff:h-4 ff:w-4" />
                    </Button>
                </div>
            </header>

            <div className="ff:flex ff:min-h-0 ff:flex-1">
                <SidePanel side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)}>
                    <aside className="ff:flex ff:h-full ff:w-64 ff:shrink-0 ff:flex-col ff:border-r ff:border-slate-200 ff:bg-white">
                        <div className="ff:flex ff:shrink-0 ff:items-center ff:gap-1 ff:border-b ff:border-slate-200 ff:p-2">
                            <LeftTab
                                icon={Blocks}
                                label={__("Blocks")}
                                active={leftTab === "blocks"}
                                onClick={() => setLeftTab("blocks")}
                            />
                            <LeftTab
                                icon={LayoutTemplate}
                                label={__("Patterns")}
                                active={leftTab === "patterns"}
                                onClick={() => setLeftTab("patterns")}
                            />
                        </div>
                        <div className="ff:min-h-0 ff:flex-1">
                            {leftTab === "blocks" ? (
                                <LayerList
                                    elements={elements}
                                    selectedId={selectedId}
                                    onSelect={setSelectedElement}
                                    onAdd={handlers.onAdd}
                                    onReorder={handlers.onReorder}
                                    onDuplicate={handlers.onDuplicate}
                                    onDelete={handlers.onDelete}
                                />
                            ) : (
                                <PatternPalette
                                    patterns={patterns}
                                    categories={library?.categories ?? []}
                                    revision={library?.revision ?? 0}
                                    isLoading={patternsLoading}
                                    note={
                                        part === "header"
                                            ? __("Patterns you can use in the global header: everything except footers.")
                                            : __("Patterns you can use in the global footer: everything except headers.")
                                    }
                                    onAdd={(id) => {
                                        if (elements.length === 0) handlers.onReplaceWithPattern(id);
                                        else setPendingPattern(id);
                                    }}
                                />
                            )}
                        </div>
                    </aside>
                </SidePanel>
                <PreviewPane
                    tree={{ version: 1, settings: {}, elements }}
                    layout={draft}
                    layoutPart={part}
                    source={previewSource}
                    onSourceChange={setPreviewSource}
                    viewport={viewport}
                    selectedId={selectedId}
                    onSelect={setSelectedElement}
                    onInsert={handlers.onInsertAt}
                    onInsertPattern={handlers.onInsertPatternAt}
                    onMove={handlers.onMove}
                    onChangeProps={handlers.onChangeProps}
                />
                <SidePanel side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)}>
                    <aside className="ff:h-full ff:w-72 ff:shrink-0 ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                        {selected ? (
                            <PropsPanel
                                element={selected}
                                settings={{}}
                                formId={previewFormId}
                                orderId={previewSource.orderId}
                                conditionFields={conditionFields}
                                hasPreviewForm={previewFormId > 0}
                                onChangeProps={handlers.onChangeProps}
                                onChangeVisibility={handlers.onChangeVisibility}
                                onChangeColumnCount={handlers.onChangeColumnCount}
                                onDuplicate={handlers.onDuplicate}
                                onDelete={handlers.onDelete}
                                onChangeSettings={() => undefined}
                                onConvertToNavigation={handlers.onConvertToNavigation}
                            />
                        ) : (
                            <LayoutSettings layout={layout} set={set} onSetChange={onSetChange} />
                        )}
                    </aside>
                </SidePanel>
            </div>
            <ApplyTemplateDialog
                open={pendingPattern !== null}
                partLabel={part === "header" ? __("header") : __("footer")}
                onCancel={() => setPendingPattern(null)}
                onReplace={() => {
                    if (pendingPattern) handlers.onReplaceWithPattern(pendingPattern);
                    setPendingPattern(null);
                }}
                onInsert={() => {
                    if (pendingPattern) handlers.onAddPattern(pendingPattern);
                    setPendingPattern(null);
                }}
            />
        </div>
    );
}

/**
 * Applying a template to a part that already has blocks never overwrites them
 * silently: replace them, add the template's blocks next to them, or cancel.
 */
function ApplyTemplateDialog({
    open,
    partLabel,
    onCancel,
    onReplace,
    onInsert,
}: {
    open: boolean;
    partLabel: string;
    onCancel: () => void;
    onReplace: () => void;
    onInsert: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{__("Apply this template?")}</DialogTitle>
                    <DialogDescription>
                        {sprintf(
                            __("The %s already has blocks. Replace them with the template, or insert the template's blocks after the selected block (or at the end)."),
                            partLabel,
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        {__("Cancel")}
                    </Button>
                    <Button variant="outline" onClick={onInsert}>
                        {__("Insert blocks")}
                    </Button>
                    <Button onClick={onReplace}>{__("Replace current")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PartButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "ff:cursor-pointer ff:rounded ff:border-0 ff:px-3 ff:py-1 ff:text-sm ff:font-medium ff:transition-colors",
                active ? "ff:bg-brand-600 ff:text-white" : "ff:bg-transparent ff:text-slate-600 ff:hover:text-slate-900",
            )}
        >
            {children}
        </button>
    );
}
