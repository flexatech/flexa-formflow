import { CheckCheck, Filter, Mail, Puzzle, StickyNote, Webhook, type LucideIcon } from "lucide-react";
import { __, sprintf } from "@/lib/i18n";
import { extensionIcon, workflowActionTypes } from "@/lib/extensions";
import type { ExtensionWorkflowAction } from "@/lib/wp";
import type {
    ActionResult,
    ConditionOperator,
    FormOption,
    Workflow,
    WorkflowAction,
    WorkflowCondition,
    WorkflowPatch,
} from "../useWorkflows";

/**
 * The builder's editable copy of a workflow, shared by the List and Visual
 * views: one trigger, at most one condition, then actions. With a condition
 * the flow branches: `actions` run when it is met (Then), `elseActions` when
 * it is not (Otherwise). Without one, `actions` always run and there is no
 * Otherwise (see WorkflowSanitizer / Engine).
 */
export interface Draft {
    title: string;
    status: "active" | "inactive";
    triggerFormId: number;
    /** Null when the workflow has no gate; Free allows exactly one. */
    condition: WorkflowCondition | null;
    actions: WorkflowAction[];
    elseActions: WorkflowAction[];
}

/** Which list an action lives in: Then (`actions`) or Otherwise (`elseActions`). */
export type Branch = "then" | "else";

export const branchKey = (branch: Branch): "actions" | "elseActions" => (branch === "else" ? "elseActions" : "actions");

/**
 * Every edit either view can make to the draft. The page owns the draft and
 * builds these once, so both views change the same state the same way.
 */
export interface DraftOps {
    setTriggerForm: (formId: number) => void;
    addCondition: () => void;
    updateCondition: (patch: Partial<WorkflowCondition>) => void;
    removeCondition: () => void;
    /** Appends the new action to the branch and returns its id. */
    addAction: (type: string, branch: Branch) => string;
    /** Actions are found by id in either branch. */
    updateAction: (actionId: string, configPatch: Record<string, unknown>) => void;
    removeAction: (actionId: string) => void;
    moveAction: (branch: Branch, index: number, delta: number) => void;
    /** Move an action to the end of the other branch. */
    switchBranch: (actionId: string) => void;
}

/** Plain-language operator labels for the single Free condition. */
export const OPERATORS: { value: ConditionOperator; label: () => string; needsValue: boolean }[] = [
    { value: "equals", label: () => __("is"), needsValue: true },
    { value: "not_equals", label: () => __("is not"), needsValue: true },
    { value: "contains", label: () => __("contains"), needsValue: true },
    { value: "not_empty", label: () => __("is filled in"), needsValue: false },
    { value: "is_empty", label: () => __("is empty"), needsValue: false },
];

export const ACTION_META: Record<string, { label: string; icon: LucideIcon; defaults: Record<string, unknown> }> = {
    send_email: {
        label: __("Send email"),
        icon: Mail,
        defaults: { to_mode: "admin", to: "", subject: "", template_id: 0, message: "" },
    },
    webhook: {
        label: __("Send webhook"),
        icon: Webhook,
        defaults: { url: "" },
    },
    set_status: {
        label: __("Set entry status"),
        icon: CheckCheck,
        defaults: { status: "read" },
    },
    add_note: {
        label: __("Add note"),
        icon: StickyNote,
        defaults: { note: "" },
    },
};

export const ACTION_ORDER = ["send_email", "webhook", "set_status", "add_note"];

/** Extension-registered node type (an add-on), or undefined for a built-in. */
export function extActionByType(type: string): ExtensionWorkflowAction | undefined {
    return workflowActionTypes().find((a) => a.type === type);
}

/** Label + icon for any node type, built-in or extension, with a safe fallback. */
export function metaFor(type: string): { label: string; icon: LucideIcon } {
    if (type === "condition") return { label: __("Condition"), icon: Filter };
    const builtin = ACTION_META[type];
    if (builtin) return { label: builtin.label, icon: builtin.icon };
    const ext = extActionByType(type);
    if (ext) return { label: ext.label, icon: extensionIcon(ext.icon) };
    // A step whose add-on is not active (or a type this build does not know):
    // still a node, edited with the generic settings editor.
    return { label: type, icon: Puzzle };
}

/** A plain-language title for an action card, built from its config. */
export function describeAction(action: WorkflowAction): string {
    const cfg = action.config;
    const str = (key: string) => (typeof cfg[key] === "string" ? (cfg[key] as string) : "");
    switch (action.type) {
        case "send_email": {
            const subject = str("subject").trim();
            return subject ? sprintf(__('Send email: "%s"'), subject) : __("Send email");
        }
        case "webhook": {
            const url = str("url").trim();
            return url ? sprintf(__("Send webhook to %s"), hostOf(url)) : __("Send webhook");
        }
        case "set_status":
            return sprintf(__("Mark entry as %s"), str("status") || __("read"));
        case "add_note":
            return __("Add an internal note");
        default:
            return metaFor(action.type).label;
    }
}

/** "Email is filled in", or a prompt when the condition has no field yet. */
export function describeCondition(condition: WorkflowCondition, triggerForm: FormOption | undefined): string {
    const op = OPERATORS.find((o) => o.value === condition.operator) ?? OPERATORS[0];
    if (condition.field === "") return __("Choose a field");
    const field = triggerForm?.fields.find((f) => f.id === condition.field)?.label || condition.field;
    return op.needsValue
        ? sprintf(__('%1$s %2$s "%3$s"'), field, op.label(), condition.value)
        : sprintf(__("%1$s %2$s"), field, op.label());
}

/** Best-effort host for the webhook sentence; falls back to the raw string. */
function hostOf(url: string): string {
    try {
        return new URL(url).host || url;
    } catch {
        return url;
    }
}

function extDefaults(ext: ExtensionWorkflowAction | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of ext?.fields ?? []) {
        if (field.default !== undefined) out[field.key] = field.default;
    }
    return out;
}

let actionCounter = 0;
export function newAction(type: string): WorkflowAction {
    actionCounter += 1;
    const builtin = ACTION_META[type];
    return {
        id: `a_${Date.now().toString(36)}${actionCounter}`,
        type,
        config: builtin ? { ...builtin.defaults } : extDefaults(extActionByType(type)),
    };
}

export interface RunMap {
    condition: ActionResult | null;
    /** Results for the Then (or only) branch, by position. */
    actions: (ActionResult | null)[];
    /** Results for the Otherwise branch, by position. */
    elseActions: (ActionResult | null)[];
    /** The branch that ran; null without a condition. */
    branch: Branch | null;
}

/**
 * Realign the flat run log onto the steps. The engine logs the condition (when
 * present) first, then the actions of the branch it took, in order: Then when
 * the condition was met ("ok"), Otherwise when it was not ("skipped"). The
 * branch that did not run gets no results, which the steps show as "not run".
 */
export function mapRun(log: ActionResult[], draft: Draft): RunMap {
    const hasCondition = draft.condition !== null && log[0]?.type === "condition";
    const condition = hasCondition ? log[0] : null;
    const steps = hasCondition ? log.slice(1) : log;
    const branch: Branch | null = condition ? (condition.status === "ok" ? "then" : "else") : null;
    return {
        condition,
        actions: draft.actions.map((_, i) => (branch !== "else" ? (steps[i] ?? null) : null)),
        elseActions: draft.elseActions.map((_, i) => (branch === "else" ? (steps[i] ?? null) : null)),
        branch,
    };
}

/** The builder's draft of a saved workflow. Both views edit this one object. */
export function draftFromWorkflow(workflow: Workflow): Draft {
    const cond = workflow.condition;
    return {
        title: workflow.title,
        status: workflow.status,
        triggerFormId: workflow.trigger.form_id,
        condition: cond && "field" in cond ? (cond as WorkflowCondition) : null,
        actions: workflow.actions,
        elseActions: workflow.else_actions ?? [],
    };
}

/**
 * What gets saved for a draft. The view (List or Visual), the selection and
 * node positions are not part of it: positions follow the step order.
 */
export function workflowPayload(draft: Draft): WorkflowPatch {
    return {
        title: draft.title,
        status: draft.status,
        config: {
            trigger: { type: "form_submitted", form_id: draft.triggerFormId },
            condition: draft.condition ?? {},
            actions: draft.actions,
            // The Otherwise branch only exists behind a condition.
            else_actions: draft.condition ? draft.elseActions : [],
        },
    };
}
