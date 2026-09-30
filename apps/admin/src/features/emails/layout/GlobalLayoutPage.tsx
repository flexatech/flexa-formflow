import { ArrowLeft, Blocks, LayoutTemplate, Monitor, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { SaveStatus } from "@/components/custom/SaveStatus";
import { UndoRedoButtons } from "@/components/custom/UndoRedoButtons";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useUndoable } from "@/lib/useUndoHistory";
import { useFormsList } from "@/features/forms/useForms";
import { LeftTab, SidePanel } from "../editor/EditorPanels";
import { LayerList } from "../editor/LayerList";
import { PatternPalette } from "../editor/PatternPalette";
import { PreviewPane } from "../editor/PreviewPane";
import { PropsPanel } from "../editor/PropsPanel";
import { createTreeHandlers } from "../editor/treeHandlers";
import { useEmailPatterns } from "../useEmailTemplates";
import { findInTree, type EmailElement } from "../types";
import { LayoutSettings } from "./LayoutSettings";
import { useEmailLayout, useSaveEmailLayout } from "./useEmailLayout";

type Part = "header" | "footer";

interface Draft {
    header: EmailElement[];
    footer: EmailElement[];
}

/**
 * Full-area editor for the global header and footer. It is the email editor's
 * canvas, layer list and props panel pointed at one part of the layout at a
 * time; the other part shows read-only around a placeholder for the email's own
 * content. Autosaves both block lists 800ms after the last change.
 */
export function GlobalLayoutPage() {
    const { data: layout, isLoading } = useEmailLayout();
    const save = useSaveEmailLayout();
    const showToast = useUiStore((s) => s.showToast);
    const selectedId = useUiStore((s) => s.selectedElementId);
    const setSelectedElement = useUiStore((s) => s.setSelectedElement);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [part, setPart] = useState<Part>("header");
    const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
    const [leftTab, setLeftTab] = useState<"blocks" | "patterns">("blocks");
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [previewFormId, setPreviewFormId] = useState(0);
    const lastSaved = useRef("");

    const { data: formsData } = useFormsList({ per_page: 100 });
    const forms = formsData?.items ?? [];
    const { data: patterns = [], isLoading: patternsLoading } = useEmailPatterns();

    useEffect(() => {
        if (layout && draft === null) {
            const initial: Draft = { header: layout.header, footer: layout.footer };
            setDraft(initial);
            lastSaved.current = JSON.stringify(initial);
        }
    }, [layout, draft]);

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
        if (snapshot === lastSaved.current) return;
        const timer = window.setTimeout(() => {
            save.mutate(draft, {
                onSuccess: () => {
                    lastSaved.current = snapshot;
                },
                onError: () => showToast(__("Autosave failed. Your latest change is not stored yet."), "error"),
            });
        }, 800);
        return () => window.clearTimeout(timer);
        // save.mutate and showToast are referentially stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    // The visibility panel needs form fields to test against; a global block
    // can hide itself on a form value just like a template's block.
    const conditionFields = useMemo(() => {
        const form = forms.find((f) => f.id === previewFormId);
        if (!form) return [];
        return form.config.fields.map((field) => ({ id: field.id, label: field.label || field.id, type: field.type }));
    }, [forms, previewFormId]);

    if (isLoading || !layout || !draft) {
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

    const switchPart = (next: Part) => {
        setPart(next);
        setSelectedElement(null);
    };

    return (
        <div className="ff:flex ff:h-[calc(100vh-2rem)] ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2.5">
                <Button variant="ghost" size="icon" aria-label={__("Back to emails")} onClick={() => navigate("/emails")}>
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <h1 className="ff:m-0 ff:min-w-0 ff:flex-1 ff:truncate ff:text-base ff:font-semibold ff:text-slate-900">
                    {__("Global header & footer")}
                </h1>
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
                                    isLoading={patternsLoading}
                                    onAdd={handlers.onAddPattern}
                                />
                            )}
                        </div>
                    </aside>
                </SidePanel>
                <PreviewPane
                    tree={{ version: 1, settings: {}, elements }}
                    layout={draft}
                    layoutPart={part}
                    formId={previewFormId}
                    forms={forms}
                    onFormChange={setPreviewFormId}
                    viewport={viewport}
                    selectedId={selectedId}
                    onSelect={setSelectedElement}
                    onInsert={handlers.onInsertAt}
                    onInsertPattern={handlers.onInsertPatternAt}
                    onMove={handlers.onMove}
                />
                <SidePanel side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)}>
                    <aside className="ff:h-full ff:w-72 ff:shrink-0 ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                        {selected ? (
                            <PropsPanel
                                element={selected}
                                settings={{}}
                                formId={previewFormId}
                                conditionFields={conditionFields}
                                hasPreviewForm={previewFormId > 0}
                                onChangeProps={handlers.onChangeProps}
                                onChangeVisibility={handlers.onChangeVisibility}
                                onChangeColumnCount={handlers.onChangeColumnCount}
                                onDuplicate={handlers.onDuplicate}
                                onDelete={handlers.onDelete}
                                onChangeSettings={() => undefined}
                            />
                        ) : (
                            <LayoutSettings />
                        )}
                    </aside>
                </SidePanel>
            </div>
        </div>
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
