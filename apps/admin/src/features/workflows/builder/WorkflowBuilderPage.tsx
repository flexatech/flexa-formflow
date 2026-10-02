import { ArrowLeft, History, List, Play, Workflow as WorkflowIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/custom/SaveStatus";
import { UndoRedoButtons } from "@/components/custom/UndoRedoButtons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { __, sprintf } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { useUndoable } from "@/lib/useUndoHistory";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import {
    useSaveWorkflow,
    useTestWorkflow,
    useWorkflow,
    useWorkflowRuns,
    useWorkflows,
    type ActionResult,
    type TestSource,
    type WorkflowAction,
    type WorkflowCondition,
    type WorkflowRun,
} from "../useWorkflows";
import { StatusDot } from "./StepEditors";
import { TestRunPanel } from "./TestRunPanel";
import {
    branchKey,
    draftFromWorkflow,
    mapRun,
    metaFor,
    newAction,
    workflowPayload,
    type Draft,
    type DraftOps,
} from "./workflowModel";
import { ListFlow } from "./ListFlow";
import { WorkflowCanvas } from "./visual/WorkflowCanvas";
import { useViewMode, type BuilderView } from "./visual/useViewMode";

export function WorkflowBuilderPage({ id }: { id: number }) {
    const { data: workflow, isLoading } = useWorkflow(id);
    const { data: index } = useWorkflows();
    const save = useSaveWorkflow(id);
    const test = useTestWorkflow(id);
    const showToast = useUiStore((s) => s.showToast);

    const [draft, setDraftState] = useState<Draft | null>(null);
    // The latest draft, updated as soon as an edit is made, so several edits
    // in one event chain onto each other instead of a stale render's copy.
    const draftRef = useRef<Draft | null>(null);
    const setDraft = (next: Draft) => {
        draftRef.current = next;
        setDraftState(next);
    };
    // What the server has: the draft as last saved (or loaded), serialized.
    const [savedSnapshot, setSavedSnapshot] = useState("");
    const [testLog, setTestLog] = useState<ActionResult[] | null>(null);
    const [testNote, setTestNote] = useState<string>("");
    const [tab, setTab] = useState<"build" | "logs">("build");
    const viewMode = useViewMode();
    // The step being edited, shared by both views: the node whose panel is open
    // in Visual, the highlighted card in List. Switching views keeps it.
    const [selected, setSelected] = useState<string | null>(null);
    // Destination held back by the unsaved-changes guard; null means no prompt.
    const [pendingNav, setPendingNav] = useState<string | null>(null);
    const [confirmRemoveCondition, setConfirmRemoveCondition] = useState(false);
    const [testOpen, setTestOpen] = useState(false);
    const testButtonRef = useRef<HTMLButtonElement>(null);

    // wp-admin's footer space would only add a page scrollbar under this
    // viewport-sized screen (see .flexa-formflow-takeover).
    useEffect(() => {
        document.body.classList.add("flexa-formflow-takeover-open");
        return () => document.body.classList.remove("flexa-formflow-takeover-open");
    }, []);

    useEffect(() => {
        if (workflow && draft === null) {
            const initial = draftFromWorkflow(workflow);
            setDraft(initial);
            setSavedSnapshot(JSON.stringify(initial));
        }
        // setDraft only writes state and a ref.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow, draft]);

    const forms = index?.forms ?? [];
    const templates = index?.templates ?? [];
    const dirty = draft !== null && JSON.stringify(draft) !== savedSnapshot;

    // Undo/redo covers the whole draft, whichever view made the change.
    const undo = useUndoable<Draft>({ current: draft, restore: setDraft });

    const persist = (next: Draft) => {
        const snapshot = JSON.stringify(next);
        return save.mutateAsync(workflowPayload(next)).then((saved) => {
            setSavedSnapshot(snapshot);
            return saved;
        });
    };

    // Autosave, like the form and email editors: the whole draft 800ms after
    // the last change, from either view.
    useEffect(() => {
        if (!draft || !dirty) return;
        const timer = window.setTimeout(() => {
            persist(draft).catch(() => showToast(__("Autosave failed. Your latest change is not stored yet."), "error"));
        }, 800);
        return () => window.clearTimeout(timer);
        // persist and showToast are stable for this purpose; only a new draft restarts the timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft, savedSnapshot]);

    if (isLoading || !draft) {
        return (
            <div className="flexa-formflow-takeover ff:flex ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
                <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5 ff:py-3">
                    <Skeleton className="ff:h-9 ff:w-9 ff:rounded-md" />
                    <Skeleton className="ff:h-5 ff:w-48" />
                    <div className="ff:flex ff:flex-1 ff:justify-end ff:gap-2">
                        <Skeleton className="ff:h-8 ff:w-20 ff:rounded-md" />
                        <Skeleton className="ff:h-8 ff:w-24 ff:rounded-md" />
                    </div>
                </header>
                <div className="ff:mx-auto ff:w-full ff:max-w-2xl ff:px-4 ff:py-8">
                    <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="ff:flex ff:flex-col ff:gap-2">
                                <Skeleton className="ff:h-3 ff:w-28" />
                                <Skeleton className="ff:h-9 ff:w-full ff:rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Route through the unsaved-changes prompt before leaving the builder.
    const guardedNavigate = (to: string) => {
        if (dirty) {
            setPendingNav(to);
        } else {
            navigate(to);
        }
    };

    const leaveWithoutSaving = () => {
        const to = pendingNav;
        setPendingNav(null);
        if (to) navigate(to);
    };

    const saveThenLeave = () => {
        const to = pendingNav;
        persist(draft)
            .then(() => {
                setPendingNav(null);
                if (to) navigate(to);
            })
            .catch((error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
            );
    };

    // The test runs the saved workflow, so unsaved edits are saved first.
    const onTest = async (params: TestSource) => {
        try {
            if (dirty) {
                await persist(draft);
            }
            const result = await test.mutateAsync(params);
            setTestLog(result.log);
            setTestNote(result.ran ? "" : result.note ?? "");
        } catch (error) {
            showToast(error instanceof Error ? error.message : __("Test run failed."), "error");
        }
    };

    const triggerForm = forms.find((f) => f.id === draft.triggerFormId);

    // Every draft edit, shared by the List and Visual views, recorded for
    // undo. Edits with the same `key` close together (typing in one field)
    // merge into one undo step.
    const edit = (change: (d: Draft) => Draft, key?: string) => {
        const current = draftRef.current;
        if (!current) return;
        const next = change(current);
        if (next === current) return;
        undo.record(current, key);
        setDraft(next);
    };
    const ops: DraftOps = {
        setTriggerForm: (formId) => edit((d) => ({ ...d, triggerFormId: formId })),
        addCondition: () => {
            const first = triggerForm?.fields[0];
            edit((d) => ({ ...d, condition: { field: first?.id ?? "", operator: "equals", value: "" } }));
        },
        updateCondition: (patch: Partial<WorkflowCondition>) =>
            edit(
                (d) => ({ ...d, condition: d.condition ? { ...d.condition, ...patch } : d.condition }),
                `condition:${Object.keys(patch).join(",")}`,
            ),
        // Removing the condition also removes the Otherwise branch, so ask first
        // when that branch has steps.
        removeCondition: () => {
            if ((draftRef.current?.elseActions.length ?? 0) > 0) {
                setConfirmRemoveCondition(true);
            } else {
                edit((d) => ({ ...d, condition: null, elseActions: [] }));
            }
        },
        addAction: (type, branch) => {
            const action = newAction(type);
            const key = branchKey(branch);
            edit((d) => ({ ...d, [key]: [...d[key], action] }));
            return action.id;
        },
        updateAction: (actionId, configPatch) => {
            const patch = (list: WorkflowAction[]) =>
                list.map((a) => (a.id === actionId ? { ...a, config: { ...a.config, ...configPatch } } : a));
            edit(
                (d) => ({ ...d, actions: patch(d.actions), elseActions: patch(d.elseActions) }),
                `action:${actionId}:${Object.keys(configPatch).join(",")}`,
            );
        },
        removeAction: (actionId) =>
            edit((d) => ({
                ...d,
                actions: d.actions.filter((a) => a.id !== actionId),
                elseActions: d.elseActions.filter((a) => a.id !== actionId),
            })),
        moveAction: (branch, indexAt, delta) =>
            edit((d) => {
                const key = branchKey(branch);
                const target = indexAt + delta;
                if (target < 0 || target >= d[key].length) return d;
                const list = [...d[key]];
                const [moved] = list.splice(indexAt, 1);
                list.splice(target, 0, moved);
                return { ...d, [key]: list };
            }),
        switchBranch: (actionId) =>
            edit((d) => {
                const inThen = d.actions.find((a) => a.id === actionId);
                const inElse = d.elseActions.find((a) => a.id === actionId);
                if (inThen) {
                    return { ...d, actions: d.actions.filter((a) => a !== inThen), elseActions: [...d.elseActions, inThen] };
                }
                if (inElse) {
                    return { ...d, elseActions: d.elseActions.filter((a) => a !== inElse), actions: [...d.actions, inElse] };
                }
                return d;
            }),
    };

    // Align the flat run log back onto the nodes so each step shows its result.
    const run = testLog ? mapRun(testLog, draft) : null;

    return (
        // Three rows: toolbar, Build/Logs tabs, then the content, which is the
        // only part that scrolls (or pans, on the canvas). The root is exactly
        // the visible viewport below the admin bar (see .flexa-formflow-takeover),
        // and the toolbar + tabs stick under the admin bar, so neither can slide
        // out of view in or out of fullscreen.
        <div className="flexa-formflow-takeover ff:flex ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <div className="flexa-formflow-takeover-chrome ff:z-20 ff:shrink-0 ff:bg-white">
                <header className="ff:flex ff:flex-wrap ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5 ff:py-3">
                    <Button variant="ghost" size="icon" aria-label={__("Back")} onClick={() => guardedNavigate("/workflows")}>
                        <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <Input
                        value={draft.title}
                        onChange={(e) => {
                            const title = e.target.value;
                            edit((d) => ({ ...d, title }), "title");
                        }}
                        className="ff:min-w-40 ff:max-w-xs ff:flex-1 ff:font-medium"
                        placeholder={__("Workflow name")}
                        aria-label={__("Workflow name")}
                    />
                    <div className="ff:flex ff:flex-1 ff:items-center ff:justify-end ff:gap-3">
                        <SaveStatus state={save.isPending ? "saving" : dirty ? "dirty" : "saved"} />
                        <UndoRedoButtons {...undo.controls} />
                        <label className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-600">
                            {draft.status === "active" ? __("Active") : __("Inactive")}
                            <Switch
                                checked={draft.status === "active"}
                                onCheckedChange={(on) => edit((d) => ({ ...d, status: on ? "active" : "inactive" }))}
                            />
                        </label>
                        {SHOW_UPCOMING && (
                            <SaveToLibraryButton
                                type="recipe"
                                kind="workflow"
                                defaultName={draft.title}
                                getPayload={() => ({
                                    trigger: { type: "form_submitted", form_id: draft.triggerFormId },
                                    actions: draft.actions,
                                    // A branched recipe keeps its condition and Otherwise steps.
                                    ...(draft.condition
                                        ? { condition: draft.condition, else_actions: draft.elseActions }
                                        : {}),
                                })}
                            />
                        )}
                        <Button
                            ref={testButtonRef}
                            variant={testOpen ? "default" : "outline"}
                            aria-expanded={testOpen}
                            aria-controls="ff-workflow-test-panel"
                            onClick={() => {
                                setTab("build");
                                setTestOpen((open) => !open);
                            }}
                        >
                            <Play aria-hidden className="ff:h-4 ff:w-4" />
                            {test.isPending ? __("Running…") : __("Run test")}
                        </Button>
                    </div>
                </header>

                {/* Same height on both tabs (the view switch shows on Build only); the
                    tabs sit on the bar's bottom border so the underline meets it. */}
                <div className="ff:flex ff:min-h-12 ff:items-stretch ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5">
                    <div role="tablist" aria-label={__("Workflow")} className="ff:flex ff:items-end ff:gap-1">
                        <TabButton id="build" active={tab === "build"} onClick={() => setTab("build")}>
                            {__("Build")}
                        </TabButton>
                        <TabButton id="logs" active={tab === "logs"} onClick={() => setTab("logs")}>
                            {__("Logs")}
                        </TabButton>
                    </div>
                    {tab === "build" && (
                        <div className="ff:ml-auto ff:flex ff:items-center ff:py-1.5">
                            <ViewToggle view={viewMode.view} narrow={viewMode.narrow} onChange={viewMode.setView} />
                        </div>
                    )}
                </div>
            </div>

            <div
                id={`ff-workflow-panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`ff-workflow-tab-${tab}`}
                className="ff:flex ff:min-h-0 ff:min-w-0 ff:flex-1"
            >
                {tab === "logs" ? (
                    <div className="ff:min-w-0 ff:flex-1 ff:overflow-y-auto">
                        <LogsPanel workflowId={id} active={tab === "logs"} />
                    </div>
                ) : (
                    // The flow and, while testing, the test panel beside it, so the
                    // run can be followed on the steps it ran. Each scrolls on its own.
                    <>
                        <div
                            className={cn(
                                "ff:min-h-0 ff:min-w-0 ff:flex-1",
                                viewMode.view === "visual" ? "ff:flex ff:overflow-hidden" : "ff:overflow-y-auto",
                            )}
                        >
                            {viewMode.view === "visual" ? (
                                <WorkflowCanvas
                                    draft={draft}
                                    ops={ops}
                                    forms={forms}
                                    templates={templates}
                                    run={run}
                                    testNote={testNote}
                                    hasRun={testLog !== null && testNote === ""}
                                    selected={selected}
                                    onSelect={setSelected}
                                    onBrowseRecipes={() => guardedNavigate("/library")}
                                />
                            ) : (
                                <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-xl ff:flex-col ff:items-stretch ff:gap-0 ff:px-4 ff:py-8">
                                    <ListFlow
                                        draft={draft}
                                        ops={ops}
                                        forms={forms}
                                        templates={templates}
                                        run={run}
                                        selected={selected}
                                        onSelect={setSelected}
                                        onBrowseRecipes={() => guardedNavigate("/library")}
                                    />

                                    {testNote !== "" && (
                                        <div className="ff:mt-8 ff:rounded-xl ff:border ff:border-amber-200 ff:bg-amber-50 ff:p-4 ff:text-sm ff:text-amber-800">
                                            {testNote}
                                        </div>
                                    )}
                                    {testLog !== null && testNote === "" && (
                                        <p className="ff:mt-6 ff:text-center ff:text-xs ff:text-slate-400">
                                            {testLog.length === 0
                                                ? __("Test run complete. This workflow has no steps to run yet.")
                                                : __("Test run complete. Each step above shows its result.")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        {testOpen && (
                            <TestRunPanel
                                forms={forms}
                                triggerFormId={draft.triggerFormId}
                                running={test.isPending || save.isPending}
                                onRun={(params) => void onTest(params)}
                                onClose={() => {
                                    setTestOpen(false);
                                    testButtonRef.current?.focus();
                                }}
                                log={testLog}
                                note={testNote}
                            />
                        )}
                    </>
                )}
            </div>

            <Dialog open={confirmRemoveCondition} onOpenChange={(open) => !open && setConfirmRemoveCondition(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Remove the condition?")}</DialogTitle>
                        <DialogDescription>
                            {sprintf(
                                /* translators: %d: number of steps. */
                                __("Without a condition there is no \"If not met\" branch, so its %d step(s) are removed too. The \"If met\" steps stay and will always run."),
                                draft.elseActions.length,
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmRemoveCondition(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                edit((d) => ({ ...d, condition: null, elseActions: [] }));
                                setConfirmRemoveCondition(false);
                            }}
                        >
                            {__("Remove condition and steps")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={pendingNav !== null} onOpenChange={(open) => !open && setPendingNav(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Unsaved changes")}</DialogTitle>
                        <DialogDescription>
                            {__("You have changes that are not saved yet. Leave this workflow anyway?")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPendingNav(null)}>
                            {__("Stay")}
                        </Button>
                        <Button variant="outline" onClick={leaveWithoutSaving}>
                            {__("Leave without saving")}
                        </Button>
                        <Button onClick={saveThenLeave} disabled={save.isPending}>
                            {save.isPending ? __("Saving…") : __("Save and leave")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/** List / Visual switch. Visual needs room, so a narrow screen stays on List. */
function ViewToggle({
    view,
    narrow,
    onChange,
}: {
    view: BuilderView;
    narrow: boolean;
    onChange: (view: BuilderView) => void;
}) {
    const options: { value: BuilderView; label: string; icon: typeof List }[] = [
        { value: "list", label: __("List"), icon: List },
        { value: "visual", label: __("Visual"), icon: WorkflowIcon },
    ];
    return (
        <div
            role="group"
            aria-label={__("Builder view")}
            className="ff:flex ff:shrink-0 ff:items-center ff:gap-0.5 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5"
        >
            {options.map(({ value, label, icon: Icon }) => {
                const disabled = value === "visual" && narrow;
                return (
                    <Button
                        key={value}
                        variant={view === value ? "default" : "ghost"}
                        size="sm"
                        aria-pressed={view === value}
                        disabled={disabled}
                        title={disabled ? __("The visual view needs a wider screen.") : undefined}
                        onClick={() => onChange(value)}
                    >
                        <Icon aria-hidden className="ff:h-4 ff:w-4" />
                        {label}
                    </Button>
                );
            })}
        </div>
    );
}

function TabButton({
    id,
    active,
    onClick,
    children,
}: {
    id: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    // The active underline is this button's own bottom border, overlapping the
    // bar's border by 1px: it always sits right under its label.
    return (
        <button
            type="button"
            role="tab"
            id={`ff-workflow-tab-${id}`}
            aria-selected={active}
            aria-controls={`ff-workflow-panel-${id}`}
            onClick={onClick}
            className={cn(
                "ff:-mb-px ff:cursor-pointer ff:border-x-0 ff:border-t-0 ff:border-b-2 ff:bg-transparent ff:px-3 ff:py-2.5 ff:text-sm ff:font-medium ff:leading-5 ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-inset ff:focus-visible:ring-brand-500",
                active
                    ? "ff:border-brand-600 ff:text-brand-700"
                    : "ff:border-transparent ff:text-slate-500 ff:transition-colors ff:hover:text-slate-800",
            )}
        >
            {children}
        </button>
    );
}

/** Live run history (the Logs tab). Newest first; each run expands to its steps. */
function LogsPanel({ workflowId, active }: { workflowId: number; active: boolean }) {
    const { data, isLoading } = useWorkflowRuns(workflowId, active);
    const runs = data?.items ?? [];

    if (isLoading) {
        return (
            <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-2xl ff:flex-col ff:gap-3 ff:px-4 ff:py-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="ff:flex ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-4 ff:py-3"
                    >
                        <Skeleton className="ff:h-8 ff:w-8 ff:shrink-0 ff:rounded-full" />
                        <Skeleton className="ff:h-4 ff:flex-1" />
                        <Skeleton className="ff:h-3 ff:w-20 ff:shrink-0" />
                    </div>
                ))}
            </div>
        );
    }

    if (runs.length === 0) {
        return (
            <div className="ff:mx-auto ff:w-full ff:max-w-2xl ff:px-4 ff:py-16 ff:text-center">
                <span className="ff:mx-auto ff:mb-3 ff:flex ff:h-11 ff:w-11 ff:items-center ff:justify-center ff:rounded-full ff:bg-slate-100 ff:text-slate-400">
                    <History aria-hidden className="ff:h-5 ff:w-5" />
                </span>
                <p className="ff:text-sm ff:font-medium ff:text-slate-700">{__("No runs yet")}</p>
                <p className="ff:mx-auto ff:mt-1 ff:max-w-sm ff:text-sm ff:text-slate-500">
                    {__("Each time the live form fires this workflow, the run is logged here. Test runs are not recorded.")}
                </p>
            </div>
        );
    }

    return (
        <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-2xl ff:flex-col ff:gap-2 ff:px-4 ff:py-8">
            <p className="ff:mb-1 ff:text-xs ff:text-slate-400">
                {sprintf(__("Showing the %d most recent runs."), runs.length)}
            </p>
            {runs.map((run) => (
                <RunRow key={run.id} run={run} />
            ))}
        </div>
    );
}

const RUN_STATUS: Record<WorkflowRun["status"], { label: () => string; dot: string; text: string }> = {
    ok: { label: () => __("Ran"), dot: "ff:bg-emerald-500", text: "ff:text-emerald-700" },
    skipped: { label: () => __("Skipped"), dot: "ff:bg-slate-400", text: "ff:text-slate-600" },
    error: { label: () => __("Error"), dot: "ff:bg-red-500", text: "ff:text-red-700" },
};

function RunRow({ run }: { run: WorkflowRun }) {
    const [open, setOpen] = useState(false);
    const meta = RUN_STATUS[run.status] ?? RUN_STATUS.ok;
    const steps = run.log.filter((s) => s.type !== "condition");

    return (
        <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="ff:flex ff:w-full ff:cursor-pointer ff:items-center ff:gap-3 ff:bg-transparent ff:px-4 ff:py-3 ff:text-left"
            >
                <span className={`ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ${meta.dot}`} aria-hidden />
                <span className={`ff:text-sm ff:font-medium ${meta.text}`}>{meta.label()}</span>
                <span className="ff:min-w-0 ff:flex-1 ff:truncate ff:text-sm ff:text-slate-500">
                    {formatRunTime(run.created_at)}
                </span>
                <span className="ff:text-xs ff:text-slate-400 ff:tabular-nums">
                    {sprintf(__("%d steps"), steps.length)}
                </span>
            </button>
            {open && (
                <div className="ff:flex ff:flex-col ff:gap-2 ff:border-t ff:border-slate-100 ff:px-4 ff:py-3">
                    {run.log.length === 0 ? (
                        <p className="ff:text-xs ff:text-slate-400">{__("No steps ran.")}</p>
                    ) : (
                        run.log.map((step, i) => (
                            <div key={i} className="ff:flex ff:items-start ff:gap-2">
                                <span className="ff:mt-1">
                                    <StatusDot status={step.status} />
                                </span>
                                <div className="ff:min-w-0 ff:flex-1">
                                    <span className="ff:text-xs ff:font-medium ff:text-slate-600">
                                        {metaFor(step.type).label}
                                    </span>
                                    <p className="ff:text-xs ff:text-slate-500">{step.detail}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </section>
    );
}

/** Format a UTC "YYYY-MM-DD HH:MM:SS" run timestamp in the browser's locale. */
function formatRunTime(mysqlUtc: string): string {
    const iso = mysqlUtc.replace(" ", "T") + "Z";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return mysqlUtc;
    }
    return date.toLocaleString();
}
