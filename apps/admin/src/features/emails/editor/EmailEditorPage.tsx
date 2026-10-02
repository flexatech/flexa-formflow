import { ArrowLeft, Blocks, Download, LayoutTemplate, Monitor, RotateCcw, Send, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { AiWritingDialog } from "@/features/ai/AiWritingDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { useUndoable } from "@/lib/useUndoHistory";
import { UndoRedoButtons } from "@/components/custom/UndoRedoButtons";
import { SaveStatus } from "@/components/custom/SaveStatus";
import { MoreMenu } from "@/components/custom/MoreMenu";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import { useForm } from "@/features/forms/useForms";
import { LeftTab, SidePanel } from "./EditorPanels";
import { LayerList } from "./LayerList";
import { PatternPalette } from "./PatternPalette";
import { PreviewPane } from "./PreviewPane";
import { PreviewSourcePicker } from "./PreviewSourcePicker";
import { ResetTemplateDialog } from "./ResetTemplateDialog";
import { TemplateSwitcher } from "./TemplateSwitcher";
import { PropsPanel } from "./PropsPanel";
import { createTreeHandlers } from "./treeHandlers";
import { useEmailLayout } from "../layout/useEmailLayout";
import { overrideKey, partBlocks, partMode, type LayoutPart } from "../layout/partModes";
import { downloadTemplates } from "../templateTransfer";
import { useEmailPatterns, useEmailTemplate, useSaveEmailTemplate, useTestSend } from "../useEmailTemplates";
import {
    emptyTree,
    findInTree,
    sampleSource,
    type EmailElement,
    type EmailTree,
    type PreviewSource,
    type TreeSettings,
} from "../types";

interface Draft {
    title: string;
    tree: EmailTree;
}

/**
 * Full-area takeover (no sidebar). Autosaves the whole draft 800ms after the
 * last change; the tree document is owned by this one screen, so it is always
 * sent whole.
 */
export function EmailEditorPage({ id }: { id: number }) {
    const { data: template, isLoading } = useEmailTemplate(id);
    const save = useSaveEmailTemplate(id);
    const showToast = useUiStore((s) => s.showToast);
    const selectedId = useUiStore((s) => s.selectedElementId);
    const setSelectedElement = useUiStore((s) => s.setSelectedElement);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
    const [leftTab, setLeftTab] = useState<"blocks" | "patterns">("blocks");
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [previewSource, setPreviewSource] = useState<PreviewSource>(sampleSource);
    const previewFormId = previewSource.formId;
    const [testOpen, setTestOpen] = useState(false);
    // Which list the canvas edits: the email's own blocks, or its overridden
    // copy of the global header or footer.
    const [editPart, setEditPart] = useState<"content" | LayoutPart>("content");
    const { data: layout } = useEmailLayout();
    const [aiOpen, setAiOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const lastSaved = useRef("");

    const { data: previewForm } = useForm(previewFormId);
    const { data: library, isLoading: patternsLoading } = useEmailPatterns("email");
    const patterns = library?.patterns ?? [];

    useEffect(() => {
        if (template && draft === null) {
            const initial: Draft = { title: template.title, tree: template.tree ?? emptyTree() };
            setDraft(initial);
            lastSaved.current = JSON.stringify(initial);
        }
    }, [template, draft]);

    // Leaving the editor clears the layer selection.
    useEffect(() => () => setSelectedElement(null), [setSelectedElement]);

    // Undo/redo covers the tree (blocks + design settings); the title is a
    // plain field with the browser's own undo.
    const undo = useUndoable<EmailTree>({
        current: draft?.tree ?? null,
        restore: (tree) => {
            setDraft((prev) => (prev ? { ...prev, tree } : prev));
            // Undoing an add (or redoing a delete) can take the selected block away.
            const lists = [tree.elements, tree.settings.headerOverride ?? [], tree.settings.footerOverride ?? []];
            if (selectedId && !lists.some((list) => findInTree(list, selectedId))) setSelectedElement(null);
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

    // Condition subjects for the visibility panel: the preview form's fields.
    // A template is reusable, so the subjects follow whichever form is picked
    // for preview; the stored rules key off field ids, which are stable.
    const conditionFields = useMemo(() => {
        if (!previewForm || previewFormId === 0) return [];
        return previewForm.config.fields.map((field) => ({
            id: field.id,
            label: field.label || field.id,
            type: field.type,
        }));
    }, [previewForm, previewFormId]);

    if (isLoading || !template || !draft) {
        return <EditorSkeleton />;
    }

    const dirty = JSON.stringify(draft) !== lastSaved.current;

    // Leaving cancels the pending autosave timer, so store the latest change
    // first; on failure, stay so nothing is lost.
    const leave = async (path: string) => {
        if (dirty) {
            const snapshot = JSON.stringify(draft);
            try {
                await save.mutateAsync(draft);
                lastSaved.current = snapshot;
            } catch {
                showToast(__("Could not save your latest change. Try again before leaving."), "error");
                return;
            }
        }
        navigate(path);
    };
    const settings = draft.tree.settings;
    // An undo can take the override away; the canvas then goes back to the content.
    const editingPart = editPart !== "content" && partMode(settings, editPart) === "override" ? editPart : null;
    const elements = editingPart ? (settings[overrideKey(editingPart)] ?? []) : draft.tree.elements;
    const selected = selectedId ? findInTree(elements, selectedId) : null;

    // `key` groups rapid edits to one target (typing in a field) into a single
    // undo step; structural edits pass none and are always their own step.
    const setTree = (next: EmailTree, key?: string) => {
        undo.record(draft.tree, key);
        setDraft((prev) => (prev ? { ...prev, tree: next } : prev));
    };
    const setElements = (next: EmailElement[], key?: string) =>
        editingPart
            ? setTree({ ...draft.tree, settings: { ...settings, [overrideKey(editingPart)]: next } }, key)
            : setTree({ ...draft.tree, elements: next }, key);
    const switchPart = (next: "content" | LayoutPart) => {
        setEditPart(next);
        setSelectedElement(null);
    };
    const overridden = (["header", "footer"] as const).filter((p) => partMode(settings, p) === "override");

    const {
        onAdd,
        onInsertAt,
        onInsertPatternAt,
        onAddPattern,
        onMove,
        onDuplicate,
        onDelete,
        onChangeProps,
        onChangeVisibility,
        onChangeColumnCount,
        onReorder,
        onConvertToNavigation,
    } = createTreeHandlers({ elements, setElements, patterns, selectedId, setSelectedElement });
    const onChangeSettings = (settings: TreeSettings) => setTree({ ...draft.tree, settings }, "settings");

    // A reset swaps in the default design but keeps which header & footer the
    // template uses; it is one undo step.
    const onResetTo = (tree: EmailTree) => {
        const keep = draft.tree.settings;
        const settings: TreeSettings = { ...tree.settings };
        if (keep.layoutSet !== undefined) settings.layoutSet = keep.layoutSet;
        if (keep.hideGlobalHeader !== undefined) settings.hideGlobalHeader = keep.hideGlobalHeader;
        if (keep.hideGlobalFooter !== undefined) settings.hideGlobalFooter = keep.hideGlobalFooter;
        setTree({ ...tree, settings });
        setSelectedElement(null);
        showToast(__("Template reset to its default design. Press Ctrl+Z to undo."));
    };

    return (
        <div className="ff:flex ff:h-[calc(100vh-2rem)] ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Back to emails")}
                    onClick={() => void leave("/emails")}
                >
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <TemplateSwitcher currentId={id} onSwitch={(next) => void leave(`/emails/${next}/edit`)} />
                <input
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                    placeholder={__("Untitled template")}
                    aria-label={__("Template title")}
                    className={cn(
                        "flexa-formflow-bare-input",
                        "ff:min-w-0 ff:flex-1 ff:border-0 ff:bg-transparent ff:text-base ff:font-semibold ff:text-slate-900 ff:outline-none ff:placeholder:text-slate-400",
                    )}
                    spellCheck={false}
                />
                {overridden.length > 0 && (
                    <PartSwitch active={editingPart ?? "content"} parts={overridden} onChange={switchPart} />
                )}
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
                {SHOW_UPCOMING && (
                    <SaveToLibraryButton
                        type="template"
                        kind="email"
                        defaultName={draft.title}
                        getPayload={() => draft.tree as unknown as Record<string, unknown>}
                    />
                )}
                <Button variant="outline" size="sm" onClick={() => setAiOpen(true)}>
                    <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Writing assistant")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
                    <Send aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Send test")}
                </Button>
                <MoreMenu
                    items={[
                        {
                            label: __("Export as JSON"),
                            icon: Download,
                            onSelect: () => downloadTemplates([{ title: draft.title, tree: draft.tree }], draft.title),
                        },
                        { label: __("Reset to default"), icon: RotateCcw, onSelect: () => setResetOpen(true), destructive: true },
                    ]}
                />
            </header>

            <div className="ff:flex ff:min-h-0 ff:flex-1">
                <SidePanel
                    side="left"
                    collapsed={leftCollapsed}
                    onToggle={() => setLeftCollapsed((v) => !v)}
                >
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
                                onAdd={onAdd}
                                onReorder={onReorder}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        ) : (
                            <PatternPalette
                                patterns={patterns}
                                categories={library?.categories ?? []}
                                revision={library?.revision ?? 0}
                                isLoading={patternsLoading}
                                onAdd={onAddPattern}
                            />
                        )}
                    </div>
                </aside>
                </SidePanel>
                <PreviewPane
                    tree={editingPart ? { ...draft.tree, elements } : draft.tree}
                    layout={
                        editingPart && layout
                            ? {
                                  header: editingPart === "header" ? elements : partBlocks(settings, layout, "header"),
                                  footer: editingPart === "footer" ? elements : partBlocks(settings, layout, "footer"),
                              }
                            : undefined
                    }
                    layoutPart={editingPart ?? undefined}
                    source={previewSource}
                    onSourceChange={setPreviewSource}
                    viewport={viewport}
                    selectedId={selectedId}
                    onSelect={setSelectedElement}
                    onInsert={onInsertAt}
                    onInsertPattern={onInsertPatternAt}
                    onMove={onMove}
                    onChangeProps={onChangeProps}
                />
                <SidePanel
                    side="right"
                    collapsed={rightCollapsed}
                    onToggle={() => setRightCollapsed((v) => !v)}
                >
                <aside className="ff:h-full ff:w-72 ff:shrink-0 ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                    <PropsPanel
                        element={selected}
                        settings={draft.tree.settings}
                        formId={previewFormId}
                        orderId={previewSource.orderId}
                        conditionFields={conditionFields}
                        hasPreviewForm={previewFormId > 0}
                        onChangeProps={onChangeProps}
                        onChangeVisibility={onChangeVisibility}
                        onChangeColumnCount={onChangeColumnCount}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onChangeSettings={onChangeSettings}
                        onEditLayoutPart={switchPart}
                        onConvertToNavigation={onConvertToNavigation}
                    />
                </aside>
                </SidePanel>
            </div>

            <TestDialog
                open={testOpen}
                onClose={() => setTestOpen(false)}
                tree={draft.tree}
                source={previewSource}
                onSourceChange={setPreviewSource}
            />

            <AiWritingDialog open={aiOpen} onClose={() => setAiOpen(false)} />

            <ResetTemplateDialog
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                templateId={id}
                onApply={onResetTo}
            />
        </div>
    );
}

/** Switches the canvas between the email's content and its overridden header/footer. */
function PartSwitch({
    active,
    parts,
    onChange,
}: {
    active: "content" | LayoutPart;
    parts: LayoutPart[];
    onChange: (part: "content" | LayoutPart) => void;
}) {
    const label = (part: "content" | LayoutPart) =>
        part === "content" ? __("Content") : part === "header" ? __("Header (this email)") : __("Footer (this email)");
    return (
        <div
            role="group"
            aria-label={__("Part to edit")}
            className="ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5"
        >
            {(["content", ...parts] as const).map((part) => (
                <button
                    key={part}
                    type="button"
                    aria-pressed={active === part}
                    onClick={() => onChange(part)}
                    className={cn(
                        "ff:cursor-pointer ff:rounded ff:border-0 ff:px-2.5 ff:py-1 ff:text-xs ff:font-medium ff:transition-colors",
                        active === part
                            ? "ff:bg-brand-700 ff:text-white"
                            : "ff:bg-transparent ff:text-slate-600 ff:hover:text-slate-900",
                    )}
                >
                    {label(part)}
                </button>
            ))}
        </div>
    );
}

function TestDialog({
    open,
    onClose,
    tree,
    source,
    onSourceChange,
}: {
    open: boolean;
    onClose: () => void;
    tree: EmailTree;
    source: PreviewSource;
    onSourceChange: (source: PreviewSource) => void;
}) {
    const testSend = useTestSend();
    const showToast = useUiStore((s) => s.showToast);
    const [to, setTo] = useState("");

    const onSend = () => {
        testSend.mutate(
            { tree, to, form_id: source.formId || undefined, order_id: source.orderId || undefined },
            {
                onSuccess: (sent) => {
                    showToast(sent ? __("Test email sent.") : __("Could not send. Check your mail setup."), sent ? "success" : "error");
                    if (sent) onClose();
                },
                onError: () => showToast(__("Please enter a valid email address."), "error"),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{__("Send a test email")}</DialogTitle>
                    <DialogDescription>
                        {__("We render this template with sample data, a form's latest entry or a real order, and send it once.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="ff:flex ff:flex-col ff:gap-4 ff:py-2">
                    <div>
                        <Label htmlFor="ff-test-to" className="ff:mb-1.5 ff:block">
                            {__("Send to")}
                        </Label>
                        <Input
                            id="ff-test-to"
                            type="email"
                            value={to}
                            placeholder="you@example.com"
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="ff:mb-1.5 ff:block">
                            {__("Use data from")}
                        </Label>
                        <PreviewSourcePicker value={source} onChange={onSourceChange} className="ff:w-full" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {__("Cancel")}
                    </Button>
                    <Button onClick={onSend} disabled={testSend.isPending || to === ""}>
                        {testSend.isPending ? __("Sending…") : __("Send test")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
