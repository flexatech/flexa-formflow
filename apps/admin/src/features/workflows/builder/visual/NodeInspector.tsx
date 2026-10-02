import { ArrowDown, ArrowLeftRight, ArrowUp, Plus, Trash2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import type { FormOption, TemplateOption } from "../../useWorkflows";
import { ActionConfig, ConditionConfig, NodeStatus, Palette, TriggerConfig } from "../StepEditors";
import type { Branch, Draft, DraftOps } from "../workflowModel";
import { resultLabel, type CanvasNodeModel } from "./CanvasNode";

/**
 * The side panel for the selected canvas node. It renders the same step
 * editors as the List view, wired to the same draft operations, so both views
 * edit one draft in one way.
 */
export function NodeInspector({
    node,
    draft,
    ops,
    forms,
    templates,
    onClose,
    onSelect,
    onBrowseRecipes,
}: {
    node: CanvasNodeModel;
    draft: Draft;
    ops: DraftOps;
    forms: FormOption[];
    templates: TemplateOption[];
    onClose: () => void;
    onSelect: (key: string | null) => void;
    onBrowseRecipes: () => void;
}) {
    const triggerForm = forms.find((f) => f.id === draft.triggerFormId);
    const Icon = node.kind === "add" ? Plus : node.kind === "trigger" ? Zap : node.icon;
    const branch: Branch = node.branch ?? "then";
    const list = branch === "else" ? draft.elseActions : draft.actions;
    const actionIndex = node.kind === "action" ? list.findIndex((a) => a.id === node.key) : -1;
    const action = actionIndex >= 0 ? list[actionIndex] : null;
    const status = resultLabel(node);

    return (
        <aside
            aria-label={__("Step settings")}
            className="ff:flex ff:w-[22rem] ff:shrink-0 ff:flex-col ff:overflow-hidden ff:border-l ff:border-slate-200 ff:bg-white"
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.stopPropagation();
                    onClose();
                }
            }}
        >
            <div className="ff:flex ff:items-center ff:gap-2 ff:border-b ff:border-slate-100 ff:px-4 ff:py-3">
                <Icon aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-500" />
                <div className="ff:min-w-0 ff:flex-1">
                    <p className="ff:m-0 ff:text-[11px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                        {node.kicker}
                    </p>
                    <h2 className="ff:m-0 ff:truncate ff:text-sm ff:font-semibold ff:text-slate-900">{node.title}</h2>
                </div>
                <Button variant="ghost" size="icon" aria-label={__("Close step settings")} onClick={onClose}>
                    <X aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
            </div>

            <div className="ff:flex ff:min-h-0 ff:flex-1 ff:flex-col ff:gap-4 ff:overflow-y-auto ff:p-4">
                {(node.result || node.notRun) && (
                    <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-3 ff:py-2">
                        <p className="ff:m-0 ff:mb-0.5 ff:text-xs ff:font-medium ff:text-slate-600">
                            {__("Last test run")}: {status}
                        </p>
                        <NodeStatus result={node.result} />
                    </div>
                )}

                {node.kind === "trigger" && (
                    <>
                        <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                            {__("The trigger that starts this workflow")}
                        </p>
                        <TriggerConfig forms={forms} formId={draft.triggerFormId} onChange={ops.setTriggerForm} />
                    </>
                )}

                {node.kind === "condition" && draft.condition && (
                    <>
                        <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                            {__("Splits the flow: the If met steps run when it is true, the If not met steps when it is false.")}
                        </p>
                        <ConditionConfig
                            condition={draft.condition}
                            triggerForm={triggerForm}
                            onChange={ops.updateCondition}
                        />
                        <Button
                            variant="outline"
                            className="ff:self-start ff:text-red-600 ff:hover:bg-red-50"
                            onClick={() => {
                                ops.removeCondition();
                                onSelect(null);
                            }}
                        >
                            <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Remove condition")}
                        </Button>
                    </>
                )}

                {action && (
                    <>
                        <ActionConfig
                            action={action}
                            forms={forms}
                            templates={templates}
                            triggerFormId={draft.triggerFormId}
                            onChange={(patch) => ops.updateAction(action.id, patch)}
                        />
                        <div className="ff:flex ff:flex-wrap ff:gap-2 ff:border-t ff:border-slate-100 ff:pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={actionIndex === 0}
                                onClick={() => ops.moveAction(branch, actionIndex, -1)}
                            >
                                <ArrowUp aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Move up")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={actionIndex === list.length - 1}
                                onClick={() => ops.moveAction(branch, actionIndex, 1)}
                            >
                                <ArrowDown aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Move down")}
                            </Button>
                            {draft.condition && (
                                <Button variant="outline" size="sm" onClick={() => ops.switchBranch(action.id)}>
                                    <ArrowLeftRight aria-hidden className="ff:h-4 ff:w-4" />
                                    {branch === "else" ? __("Move to If met") : __("Move to If not met")}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="ff:ml-auto ff:text-red-600 ff:hover:bg-red-50"
                                onClick={() => {
                                    ops.removeAction(action.id);
                                    onSelect(null);
                                }}
                            >
                                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Remove action")}
                            </Button>
                        </div>
                    </>
                )}

                {node.kind === "add" &&
                    (draft.condition ? (
                        // A branch's "Add step" adds actions to that branch only.
                        <Palette
                            onAdd={(type) => onSelect(ops.addAction(type, branch))}
                            onAddCondition={() => undefined}
                            canAddCondition={false}
                        />
                    ) : (
                        <Palette
                            onAdd={(type) => onSelect(ops.addAction(type, "then"))}
                            onAddCondition={() => {
                                ops.addCondition();
                                onSelect("condition");
                            }}
                            canAddCondition
                            onBrowseRecipes={onBrowseRecipes}
                        />
                    ))}
            </div>
        </aside>
    );
}
