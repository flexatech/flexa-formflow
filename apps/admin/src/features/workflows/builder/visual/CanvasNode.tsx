import { ArrowDown, ArrowLeftRight, ArrowUp, Plus, Trash2, type LucideIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { __, sprintf } from "@/lib/i18n";
import type { ActionResult } from "../../useWorkflows";
import type { Branch } from "../workflowModel";

/** Fixed node size; positions follow from the order (see layoutFlow). */
export const NODE_W = 288;
export const NODE_H = 76;
export const NODE_GAP = 56;
/** Space between the If met and If not met columns. */
export const COLUMN_GAP = 64;

export type NodeKind = "trigger" | "condition" | "action" | "add";

export interface CanvasNodeModel {
    /** "trigger", "condition", "add", "add:then", "add:else", or the action id. */
    key: string;
    kind: NodeKind;
    kicker: string;
    title: string;
    icon: LucideIcon;
    /** The last test run's result for this step, if it ran. */
    result: ActionResult | null;
    /** A test ran but did not reach this step (stopped, or took the other branch). */
    notRun: boolean;
    /** Actions and branch "Add step" nodes: which branch they belong to. */
    branch?: Branch;
    /** Actions only: position within the branch, and the branch's length. */
    index?: number;
    count?: number;
    /** Overrides the generic result words (the condition says which branch ran). */
    statusText?: string;
}

export interface PlacedNode extends CanvasNodeModel {
    x: number;
    y: number;
}

export interface CanvasEdge {
    key: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    dashed: boolean;
    /** Branch edges leaving the condition carry its label. */
    branch?: Branch;
}

/** Colours match the List view's cards: brand trigger, amber condition, slate actions. */
const TONE: Record<NodeKind, { border: string; icon: string }> = {
    trigger: { border: "ff:border-brand-200", icon: "ff:bg-brand-50 ff:text-brand-600" },
    condition: { border: "ff:border-amber-200", icon: "ff:bg-amber-50 ff:text-amber-600" },
    action: { border: "ff:border-slate-200", icon: "ff:bg-slate-100 ff:text-slate-600" },
    add: { border: "ff:border-dashed ff:border-slate-300", icon: "ff:bg-slate-50 ff:text-slate-500" },
};

/** Branch label colours, as in the List view. */
const BRANCH_PILL: Record<Branch, string> = {
    then: "ff:border-emerald-200 ff:bg-emerald-50 ff:text-emerald-700",
    else: "ff:border-rose-200 ff:bg-rose-50 ff:text-rose-700",
};

/** Plain words for a step's test result. */
export function resultLabel(node: Pick<CanvasNodeModel, "kind" | "result" | "notRun" | "statusText">): string {
    if (node.statusText) return node.statusText;
    if (node.notRun) return __("Not run");
    const result = node.result;
    if (!result) return "";
    if (node.kind === "condition") {
        return result.status === "ok" ? __("Condition met") : result.status === "skipped" ? __("Not met") : __("Error");
    }
    return result.status === "ok" ? __("Ran") : result.status === "skipped" ? __("Skipped") : __("Error");
}

const DOT: Record<ActionResult["status"] | "none", string> = {
    ok: "ff:bg-emerald-500",
    error: "ff:bg-red-500",
    skipped: "ff:bg-slate-400",
    none: "ff:bg-slate-300",
};

export function CanvasNode({
    node,
    selected,
    onSelect,
    onMove,
    onRemove,
    onSwitchBranch,
}: {
    node: PlacedNode;
    selected: boolean;
    onSelect: () => void;
    onMove?: (delta: number) => void;
    onRemove?: () => void;
    /** Branch workflows: move this action to the other branch. */
    onSwitchBranch?: () => void;
}) {
    const Icon = node.kind === "add" ? Plus : node.icon;
    const tone = TONE[node.kind];
    const status = resultLabel(node);
    const index = node.index ?? 0;
    const total = node.count ?? 0;
    const isError = node.result?.status === "error";

    // Alt + arrow reorders an action within its branch; Delete is left to the
    // explicit button so a stray key never drops a step.
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (!onMove || !e.altKey) return;
        if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            onMove(-1);
        } else if (e.key === "ArrowDown" && index < total - 1) {
            e.preventDefault();
            onMove(1);
        }
    };

    const label = [node.kicker, node.title, status].filter(Boolean).join(". ");
    const switchLabel =
        node.branch === "else"
            ? sprintf(__("Move %s to If met"), node.title)
            : sprintf(__("Move %s to If not met"), node.title);

    return (
        <div
            data-ff-canvas-stop
            data-ff-node={node.key}
            className="ff:group ff:absolute"
            style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
        >
            <button
                type="button"
                onClick={onSelect}
                onKeyDown={onKeyDown}
                aria-pressed={selected}
                aria-label={label}
                aria-keyshortcuts={onMove ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
                title={node.result?.detail || undefined}
                className={cn(
                    "ff:flex ff:h-full ff:w-full ff:cursor-pointer ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:bg-white ff:px-3 ff:text-left ff:shadow-sm ff:transition-shadow",
                    "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-2",
                    isError ? "ff:border-red-300" : tone.border,
                    selected ? "ff:ring-2 ff:ring-brand-500" : "ff:hover:shadow-md",
                    node.kind === "add" &&
                        "ff:bg-white/80 ff:shadow-none ff:hover:border-brand-300 ff:hover:bg-brand-50",
                )}
            >
                <span
                    className={cn(
                        "ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg",
                        tone.icon,
                    )}
                >
                    <Icon aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <span className="ff:flex ff:min-w-0 ff:flex-1 ff:flex-col">
                    <span className="ff:text-[11px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                        {node.kicker}
                    </span>
                    <span className="ff:truncate ff:text-sm ff:font-semibold ff:text-slate-900">{node.title}</span>
                    {status && (
                        <span className="ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:text-slate-500">
                            <span
                                aria-hidden
                                className={cn(
                                    "ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full",
                                    DOT[node.notRun ? "none" : (node.result?.status ?? "none")],
                                )}
                            />
                            <span className="ff:truncate">{status}</span>
                        </span>
                    )}
                </span>
            </button>

            {node.kind === "action" && onMove && onRemove && (
                <div
                    className={cn(
                        "ff:absolute ff:-top-3 ff:right-2 ff:flex ff:gap-0.5 ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:p-0.5 ff:shadow-sm ff:transition-opacity",
                        selected
                            ? "ff:opacity-100"
                            : "ff:opacity-0 ff:group-hover:opacity-100 ff:group-focus-within:opacity-100",
                    )}
                >
                    <ToolButton
                        icon={ArrowUp}
                        label={sprintf(__("Move %s up"), node.title)}
                        disabled={index === 0}
                        onClick={() => onMove(-1)}
                    />
                    <ToolButton
                        icon={ArrowDown}
                        label={sprintf(__("Move %s down"), node.title)}
                        disabled={index >= total - 1}
                        onClick={() => onMove(1)}
                    />
                    {onSwitchBranch && (
                        <ToolButton icon={ArrowLeftRight} label={switchLabel} onClick={onSwitchBranch} />
                    )}
                    <ToolButton icon={Trash2} label={sprintf(__("Remove %s"), node.title)} danger onClick={onRemove} />
                </div>
            )}
        </div>
    );
}

function ToolButton({
    icon: Icon,
    label,
    onClick,
    disabled,
    danger,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "ff:flex ff:h-6 ff:w-6 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded ff:border-0 ff:bg-transparent",
                "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500",
                "ff:disabled:cursor-not-allowed ff:disabled:opacity-30",
                danger
                    ? "ff:text-red-600 ff:hover:bg-red-50"
                    : "ff:text-slate-500 ff:hover:bg-slate-100 ff:hover:text-slate-800",
            )}
        >
            <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
        </button>
    );
}

/**
 * The connectors, in canvas coordinates: straight down within a column, and
 * an elbow from the condition into each branch, labelled "If met" / "If not
 * met". Links into an "Add step" node are dashed. `taken` highlights the
 * branch the last test run went down.
 */
export function CanvasEdges({
    edges,
    width,
    height,
    taken,
}: {
    edges: CanvasEdge[];
    width: number;
    height: number;
    taken: Branch | null;
}) {
    const path = (e: CanvasEdge) => {
        if (e.from.x === e.to.x) return `M ${e.from.x} ${e.from.y} V ${e.to.y}`;
        const mid = e.from.y + (e.to.y - e.from.y) / 2;
        return `M ${e.from.x} ${e.from.y} V ${mid} H ${e.to.x} V ${e.to.y}`;
    };
    const color = (e: CanvasEdge) => (e.branch && taken === e.branch ? "#10b981" : "#94a3b8");

    return (
        <>
            <svg
                aria-hidden
                width={width}
                height={height}
                className="ff:pointer-events-none ff:absolute ff:left-0 ff:top-0 ff:overflow-visible"
            >
                <defs>
                    {["#94a3b8", "#10b981"].map((fill) => (
                        <marker
                            key={fill}
                            id={`ff-wf-arrow-${fill.slice(1)}`}
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="7"
                            markerHeight="7"
                            orient="auto"
                        >
                            <path d="M0 0 L10 5 L0 10 z" fill={fill} />
                        </marker>
                    ))}
                </defs>
                {edges.map((e) => (
                    <path
                        key={e.key}
                        d={path(e)}
                        fill="none"
                        stroke={color(e)}
                        strokeWidth={e.branch && taken === e.branch ? 2 : 1.5}
                        strokeDasharray={e.dashed ? "4 4" : undefined}
                        markerEnd={`url(#ff-wf-arrow-${color(e).slice(1)})`}
                    />
                ))}
            </svg>
            {edges
                .filter((e) => e.branch)
                .map((e) => (
                    <span
                        key={`${e.key}-label`}
                        aria-hidden
                        className={cn(
                            "ff:absolute ff:-translate-x-1/2 ff:-translate-y-1/2 ff:rounded-full ff:border ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-medium ff:whitespace-nowrap",
                            BRANCH_PILL[e.branch as Branch],
                        )}
                        style={{ left: e.to.x, top: e.to.y - NODE_GAP / 2 + 4 }}
                    >
                        {e.branch === "then" ? __("If met") : __("If not met")}
                    </span>
                ))}
        </>
    );
}
