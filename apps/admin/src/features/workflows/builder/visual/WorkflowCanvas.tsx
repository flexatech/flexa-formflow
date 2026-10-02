import { Filter, Maximize, Minus, Plus, Zap } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import { __, sprintf } from "@/lib/i18n";
import type { FormOption, TemplateOption } from "../../useWorkflows";
import {
    describeAction,
    describeCondition,
    metaFor,
    type Branch,
    type Draft,
    type DraftOps,
    type RunMap,
} from "../workflowModel";
import { CanvasEdges, CanvasNode, type CanvasNodeModel } from "./CanvasNode";
import { layoutFlow } from "./layout";
import { NodeInspector } from "./NodeInspector";
import { useCanvasViewport } from "./useCanvasViewport";

/**
 * The Visual view of the workflow builder: the same flow as the List view
 * drawn as nodes on a pannable, zoomable canvas. Trigger, then the condition
 * (if any), which splits into If met and If not met columns, each ending in
 * "Add step"; without a condition the actions follow in one column. It holds
 * no workflow state of its own: it reads the page's draft and edits it through
 * the same DraftOps, and node positions are derived from the order, so
 * nothing extra is saved.
 */
export function WorkflowCanvas({
    draft,
    ops,
    forms,
    templates,
    run,
    testNote,
    hasRun,
    selected,
    onSelect: setSelected,
    onBrowseRecipes,
}: {
    draft: Draft;
    ops: DraftOps;
    forms: FormOption[];
    templates: TemplateOption[];
    run: RunMap | null;
    testNote: string;
    hasRun: boolean;
    /** The selected step's key, owned by the page so List and Visual share it. */
    selected: string | null;
    onSelect: (key: string | null) => void;
    onBrowseRecipes: () => void;
}) {
    const helpId = useId();
    const triggerForm = forms.find((f) => f.id === draft.triggerFormId);

    const layout = useMemo(() => {
        const head: CanvasNodeModel[] = [
            {
                key: "trigger",
                kind: "trigger",
                kicker: __("Trigger"),
                // A form id with no match yet (forms still loading, or deleted) is
                // named by id rather than shown as "any form".
                title: triggerForm
                    ? sprintf(__("%s is submitted"), triggerForm.title || __("Untitled form"))
                    : draft.triggerFormId > 0
                      ? sprintf(__("Form #%d is submitted"), draft.triggerFormId)
                      : __("Any form is submitted"),
                icon: Zap,
                result: null,
                notRun: false,
            },
        ];
        if (draft.condition) {
            const result = run?.condition ?? null;
            head.push({
                key: "condition",
                kind: "condition",
                kicker: __("Condition"),
                title: describeCondition(draft.condition, triggerForm),
                icon: Filter,
                result,
                notRun: false,
                // Name the branch the test took, not just "met / not met".
                statusText: result
                    ? result.status === "ok"
                        ? __("Met: If met ran")
                        : result.status === "skipped"
                          ? draft.elseActions.length > 0
                              ? __("Not met: If not met ran")
                              : __("Not met: nothing ran")
                          : undefined
                    : undefined,
            });
        }

        const column = (branch: Branch): CanvasNodeModel[] => {
            const list = branch === "else" ? draft.elseActions : draft.actions;
            const results = branch === "else" ? run?.elseActions : run?.actions;
            const branched = draft.condition !== null;
            const nodes: CanvasNodeModel[] = list.map((action, i) => {
                const result = results?.[i] ?? null;
                return {
                    key: action.id,
                    kind: "action",
                    kicker: branched
                        ? sprintf(branch === "else" ? __("If not met · Step %d") : __("If met · Step %d"), i + 1)
                        : sprintf(__("Action %d"), i + 1),
                    title: describeAction(action),
                    icon: metaFor(action.type).icon,
                    result,
                    notRun: hasRun && result === null,
                    branch,
                    index: i,
                    count: list.length,
                };
            });
            nodes.push({
                key: branched ? `add:${branch}` : "add",
                kind: "add",
                kicker: __("Add step"),
                title: branched
                    ? branch === "else"
                        ? __("Add a step if not met")
                        : __("Add a step if met")
                    : draft.actions.length === 0
                      ? __("Add your first action")
                      : __("Add a condition or action"),
                icon: Plus,
                result: null,
                notRun: false,
                branch,
            });
            return nodes;
        };

        return layoutFlow(head, column("then"), draft.condition ? column("else") : []);
    }, [draft, triggerForm, run, hasRun]);
    const nodes = layout.nodes;

    const content = { width: layout.width, height: layout.height };
    const viewport = useCanvasViewport(content, () => setSelected(null));
    const { view } = viewport;

    // A step removed (here or in List) closes its panel.
    const selectedNode = nodes.find((n) => n.key === selected) ?? null;
    useEffect(() => {
        if (selected !== null && !nodes.some((n) => n.key === selected)) setSelected(null);
    }, [nodes, selected, setSelected]);

    // Reordering moves the node's DOM element, which drops focus; put it back.
    const refocus = useRef<string | null>(null);
    useEffect(() => {
        if (!refocus.current) return;
        const el = viewport.ref.current?.querySelector<HTMLButtonElement>(`[data-ff-node="${refocus.current}"] button`);
        refocus.current = null;
        el?.focus();
    }, [draft.actions, draft.elseActions, viewport.ref]);

    const move = (node: CanvasNodeModel, delta: number) => {
        refocus.current = node.key;
        ops.moveAction(node.branch ?? "then", node.index ?? 0, delta);
    };

    return (
        // Fills the builder's content row, which is sized to the viewport.
        <div className="ff:flex ff:h-full ff:min-h-0 ff:w-full ff:min-w-0">
            <div
                ref={viewport.ref}
                role="region"
                aria-label={__("Workflow canvas")}
                aria-describedby={helpId}
                tabIndex={0}
                {...viewport.handlers}
                className="ff:relative ff:min-w-0 ff:flex-1 ff:cursor-grab ff:touch-none ff:select-none ff:overflow-hidden ff:bg-slate-50 ff:outline-none ff:active:cursor-grabbing ff:focus-visible:ring-2 ff:focus-visible:ring-inset ff:focus-visible:ring-brand-500"
                style={{
                    backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1.2px)",
                    backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
                    backgroundPosition: `${view.x}px ${view.y}px`,
                }}
            >
                <p id={helpId} className="ff:sr-only">
                    {__(
                        "Drag or scroll to move around. Ctrl or Cmd plus scroll zooms. With the canvas focused, arrow keys move, plus and minus zoom, and 0 fits the whole flow. Select a step to edit it; Alt plus up or down arrow reorders an action.",
                    )}
                </p>

                <div
                    className="ff:absolute ff:left-0 ff:top-0 ff:origin-top-left"
                    style={{
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                        width: layout.width,
                        height: layout.height,
                    }}
                >
                    <CanvasEdges
                        edges={layout.edges}
                        width={layout.width}
                        height={layout.height}
                        taken={run?.branch ?? null}
                    />
                    {nodes.map((node) => (
                        <CanvasNode
                            key={node.key}
                            node={node}
                            selected={node.key === selected}
                            onSelect={() => setSelected(node.key === selected ? null : node.key)}
                            onMove={node.kind === "action" ? (delta) => move(node, delta) : undefined}
                            onRemove={node.kind === "action" ? () => ops.removeAction(node.key) : undefined}
                            onSwitchBranch={
                                node.kind === "action" && draft.condition
                                    ? () => {
                                          refocus.current = node.key;
                                          ops.switchBranch(node.key);
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </div>

                {(testNote !== "" || hasRun) && (
                    <div
                        data-ff-canvas-stop
                        role="status"
                        className={cn(
                            "ff:absolute ff:left-3 ff:right-3 ff:top-3 ff:mx-auto ff:max-w-md ff:rounded-lg ff:border ff:px-3 ff:py-2 ff:text-center ff:text-xs ff:shadow-sm",
                            testNote !== ""
                                ? "ff:border-amber-200 ff:bg-amber-50 ff:text-amber-800"
                                : "ff:border-slate-200 ff:bg-white ff:text-slate-500",
                        )}
                    >
                        {testNote !== ""
                            ? testNote
                            : draft.actions.length === 0
                              ? __("Test run complete. This workflow has no steps to run yet.")
                              : __("Test run complete. Each step shows its result.")}
                    </div>
                )}

                <div
                    data-ff-canvas-stop
                    role="group"
                    aria-label={__("Canvas zoom")}
                    className="ff:absolute ff:bottom-3 ff:left-3 ff:flex ff:items-center ff:gap-0.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:p-0.5 ff:shadow-sm"
                >
                    <ControlButton label={__("Zoom out")} onClick={viewport.zoomOut}>
                        <Minus aria-hidden className="ff:h-4 ff:w-4" />
                    </ControlButton>
                    <span
                        className="ff:w-11 ff:text-center ff:text-xs ff:tabular-nums ff:text-slate-600"
                        aria-live="polite"
                    >
                        {Math.round(view.zoom * 100)}%
                    </span>
                    <ControlButton label={__("Zoom in")} onClick={viewport.zoomIn}>
                        <Plus aria-hidden className="ff:h-4 ff:w-4" />
                    </ControlButton>
                    <span aria-hidden className="ff:mx-0.5 ff:h-5 ff:w-px ff:bg-slate-200" />
                    <ControlButton label={__("Fit view")} onClick={viewport.fit}>
                        <Maximize aria-hidden className="ff:h-4 ff:w-4" />
                    </ControlButton>
                </div>
            </div>

            {selectedNode && (
                <NodeInspector
                    key={selectedNode.key}
                    node={selectedNode}
                    draft={draft}
                    ops={ops}
                    forms={forms}
                    templates={templates}
                    onClose={() => {
                        const key = selectedNode.key;
                        setSelected(null);
                        viewport.ref.current
                            ?.querySelector<HTMLButtonElement>(`[data-ff-node="${key}"] button`)
                            ?.focus();
                    }}
                    onSelect={setSelected}
                    onBrowseRecipes={onBrowseRecipes}
                />
            )}
        </div>
    );
}

function ControlButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className="ff:flex ff:h-7 ff:w-7 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded-md ff:border-0 ff:bg-transparent ff:text-slate-600 ff:hover:bg-slate-100 ff:hover:text-slate-900 ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500"
        >
            {children}
        </button>
    );
}
