import { ArrowDown, ArrowLeftRight, ArrowUp, Filter, Trash2, Zap } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import type { ActionResult, FormOption, TemplateOption, WorkflowAction, WorkflowCondition } from "../useWorkflows";
import { ActionConfig, AddStepButton, ConditionConfig, NodeStatus, Palette, TriggerConfig } from "./StepEditors";
import { describeAction, metaFor, type Branch, type Draft, type DraftOps, type RunMap } from "./workflowModel";

/**
 * The List view of the workflow builder: the flow as a column of editable
 * cards. Without a condition the actions follow the trigger in one chain; with
 * one, the flow splits into an "If met" (Then) and an "If not met" (Otherwise)
 * branch. It edits the page's draft through the same DraftOps as the Visual view.
 */
export function ListFlow({
    draft,
    ops,
    forms,
    templates,
    run,
    selected = null,
    onSelect,
    onBrowseRecipes,
}: {
    draft: Draft;
    ops: DraftOps;
    forms: FormOption[];
    templates: TemplateOption[];
    run: RunMap | null;
    /** The selected step's key ("trigger", "condition" or an action id), shared with the Visual view. */
    selected?: string | null;
    onSelect?: (key: string) => void;
    onBrowseRecipes: () => void;
}) {
    const triggerForm = forms.find((f) => f.id === draft.triggerFormId);
    const frame = (key: string, children: ReactNode) => (
        <StepFrame stepKey={key} selected={selected === key} onSelect={onSelect}>
            {children}
        </StepFrame>
    );

    // Coming from the Visual view with a step selected: bring its card into view.
    const scrolled = useRef(false);
    useEffect(() => {
        if (scrolled.current || !selected) return;
        scrolled.current = true;
        document.querySelector(`[data-ff-step="${CSS.escape(selected)}"]`)?.scrollIntoView({ block: "center" });
    }, [selected]);
    const actionCards = (branch: Branch) => {
        const list = branch === "else" ? draft.elseActions : draft.actions;
        const results = branch === "else" ? run?.elseActions : run?.actions;
        return list.map((action, i) => (
            <div key={action.id} className="ff:flex ff:flex-col ff:items-stretch">
                {i > 0 && <Connector />}
                {frame(
                    action.id,
                    <ActionNode
                    action={action}
                    forms={forms}
                    templates={templates}
                    triggerFormId={draft.triggerFormId}
                    result={results?.[i] ?? null}
                    notRun={run !== null && run.branch !== null && run.branch !== branch}
                    isFirst={i === 0}
                    isLast={i === list.length - 1}
                    onUp={() => ops.moveAction(branch, i, -1)}
                    onDown={() => ops.moveAction(branch, i, 1)}
                    onRemove={() => ops.removeAction(action.id)}
                    onChange={(patch) => ops.updateAction(action.id, patch)}
                    onSwitchBranch={draft.condition ? () => ops.switchBranch(action.id) : undefined}
                    switchLabel={branch === "else" ? __("Move to If met") : __("Move to If not met")}
                    />,
                )}
            </div>
        ));
    };

    return (
        <>
            {frame("trigger", <TriggerNode forms={forms} formId={draft.triggerFormId} onChange={ops.setTriggerForm} />)}

            {draft.condition ? (
                <>
                    <Connector />
                    {frame(
                        "condition",
                        <ConditionNode
                            condition={draft.condition}
                            triggerForm={triggerForm}
                            result={run?.condition ?? null}
                            onChange={ops.updateCondition}
                            onRemove={ops.removeCondition}
                        />,
                    )}
                    <Connector />
                    <BranchSection branch="then" taken={run?.branch ?? null}>
                        {actionCards("then")}
                        <AddStepButton onAdd={(type) => ops.addAction(type, "then")} />
                    </BranchSection>
                    <Connector />
                    <BranchSection branch="else" taken={run?.branch ?? null}>
                        {actionCards("else")}
                        <AddStepButton onAdd={(type) => ops.addAction(type, "else")} />
                    </BranchSection>
                </>
            ) : (
                <>
                    {draft.actions.length > 0 && <Connector />}
                    {actionCards("then")}
                    <Connector />
                    <Palette
                        onAdd={(type) => ops.addAction(type, "then")}
                        onAddCondition={ops.addCondition}
                        canAddCondition
                        onBrowseRecipes={onBrowseRecipes}
                    />
                </>
            )}
        </>
    );
}

/**
 * One step's card in the list. Working in it (a click or keyboard focus)
 * selects the step for both views; the selected card is outlined.
 */
function StepFrame({
    stepKey,
    selected,
    onSelect,
    children,
}: {
    stepKey: string;
    selected: boolean;
    onSelect?: (key: string) => void;
    children: ReactNode;
}) {
    return (
        <div
            data-ff-step={stepKey}
            data-ff-selected={selected || undefined}
            onFocusCapture={() => onSelect?.(stepKey)}
            onPointerDownCapture={() => onSelect?.(stepKey)}
            className={cn("ff:rounded-xl", selected && "ff:ring-2 ff:ring-brand-500 ff:ring-offset-2 ff:ring-offset-slate-50")}
        >
            {children}
        </div>
    );
}

/** Colour and words for each branch, shared with the Visual view. */
export const BRANCH_META: Record<Branch, { label: () => string; hint: () => string; pill: string; frame: string }> = {
    then: {
        label: () => __("If met"),
        hint: () => __("Runs when the condition is true."),
        pill: "ff:border-emerald-200 ff:bg-emerald-50 ff:text-emerald-700",
        frame: "ff:border-emerald-200",
    },
    else: {
        label: () => __("If not met"),
        hint: () => __("Runs when the condition is false."),
        pill: "ff:border-rose-200 ff:bg-rose-50 ff:text-rose-700",
        frame: "ff:border-rose-200",
    },
};

function BranchSection({
    branch,
    taken,
    children,
}: {
    branch: Branch;
    /** The branch the last test took, if any. */
    taken: Branch | null;
    children: React.ReactNode;
}) {
    const meta = BRANCH_META[branch];
    return (
        <section
            aria-label={meta.label()}
            className={cn(
                "ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-dashed ff:bg-slate-50/60 ff:p-3",
                meta.frame,
            )}
        >
            <div className="ff:flex ff:items-center ff:gap-2">
                <span
                    className={cn("ff:rounded-full ff:border ff:px-2 ff:py-0.5 ff:text-xs ff:font-semibold", meta.pill)}
                >
                    {meta.label()}
                </span>
                <span className="ff:text-xs ff:text-slate-500">{meta.hint()}</span>
                {taken === branch && (
                    <span className="ff:ml-auto ff:text-xs ff:font-medium ff:text-emerald-700">
                        {__("Taken in the last test")}
                    </span>
                )}
            </div>
            <div className="ff:flex ff:flex-col ff:items-stretch">{children}</div>
        </section>
    );
}

export function Connector() {
    return <div className="ff:mx-auto ff:h-6 ff:w-px ff:bg-slate-300" />;
}

function TriggerNode({
    forms,
    formId,
    onChange,
}: {
    forms: FormOption[];
    formId: number;
    onChange: (formId: number) => void;
}) {
    return (
        <section className="ff:rounded-xl ff:border ff:border-brand-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                    <Zap aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div>
                    <div className="ff:text-sm ff:font-semibold ff:text-slate-900">
                        {__("When a form is submitted")}
                    </div>
                    <div className="ff:text-xs ff:text-slate-500">{__("The trigger that starts this workflow")}</div>
                </div>
            </div>
            <TriggerConfig forms={forms} formId={formId} onChange={onChange} />
        </section>
    );
}

function ActionNode({
    action,
    forms,
    templates,
    triggerFormId,
    result,
    isFirst,
    isLast,
    onUp,
    onDown,
    onRemove,
    onChange,
    onSwitchBranch,
    switchLabel,
    notRun,
}: {
    action: WorkflowAction;
    forms: FormOption[];
    templates: TemplateOption[];
    triggerFormId: number;
    result: ActionResult | null;
    isFirst: boolean;
    isLast: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
    onChange: (patch: Record<string, unknown>) => void;
    /** Branch workflows only: move this action to the other branch. */
    onSwitchBranch?: () => void;
    switchLabel?: string;
    /** A test ran but took the other branch. */
    notRun?: boolean;
}) {
    const Icon = metaFor(action.type).icon;

    return (
        <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-600">
                    <Icon aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div className="ff:flex ff:min-w-0 ff:flex-1 ff:flex-col">
                    <span className="ff:truncate ff:text-sm ff:font-semibold ff:text-slate-900">
                        {describeAction(action)}
                    </span>
                    <NodeStatus result={result} />
                    {notRun && <span className="ff:text-xs ff:text-slate-400">{__("Not run in the last test")}</span>}
                </div>
                <div className="ff:flex ff:gap-0.5">
                    <Button variant="ghost" size="icon" aria-label={__("Move up")} onClick={onUp} disabled={isFirst}>
                        <ArrowUp aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={__("Move down")} onClick={onDown} disabled={isLast}>
                        <ArrowDown aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    {onSwitchBranch && switchLabel && (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={switchLabel}
                            title={switchLabel}
                            onClick={onSwitchBranch}
                        >
                            <ArrowLeftRight aria-hidden className="ff:h-4 ff:w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={__("Remove action")}
                        className="ff:text-red-600 ff:hover:bg-red-50"
                        onClick={onRemove}
                    >
                        <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                </div>
            </div>
            <ActionConfig
                action={action}
                forms={forms}
                templates={templates}
                triggerFormId={triggerFormId}
                onChange={onChange}
            />
        </section>
    );
}

function ConditionNode({
    condition,
    triggerForm,
    result,
    onChange,
    onRemove,
}: {
    condition: WorkflowCondition;
    triggerForm: FormOption | undefined;
    result: ActionResult | null;
    onChange: (patch: Partial<WorkflowCondition>) => void;
    onRemove: () => void;
}) {
    return (
        <section className="ff:rounded-xl ff:border ff:border-amber-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-amber-50 ff:text-amber-600">
                    <Filter aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div className="ff:min-w-0 ff:flex-1">
                    <div className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("If…")}</div>
                    {result ? (
                        <NodeStatus result={result} />
                    ) : (
                        <div className="ff:text-xs ff:text-slate-500">
                            {__("Splits the flow: the If met steps run when it is true, the If not met steps when it is false.")}
                        </div>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Remove condition")}
                    className="ff:text-red-600 ff:hover:bg-red-50"
                    onClick={onRemove}
                >
                    <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
            </div>
            <ConditionConfig condition={condition} triggerForm={triggerForm} onChange={onChange} />
        </section>
    );
}
