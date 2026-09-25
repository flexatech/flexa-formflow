import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CheckCheck,
    Mail,
    Play,
    Plus,
    StickyNote,
    Trash2,
    Webhook,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LockedNote, SchemaFields } from "@/components/custom/SchemaFields";
import { __ } from "@/lib/i18n";
import { extensionIcon, integrationConnections, workflowActionTypes } from "@/lib/extensions";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import type { ExtensionWorkflowAction } from "@/lib/wp";
import {
    useSaveWorkflow,
    useTestWorkflow,
    useWorkflow,
    useWorkflows,
    type ActionResult,
    type FormOption,
    type TemplateOption,
    type WorkflowAction,
} from "../useWorkflows";

interface Draft {
    title: string;
    status: "active" | "inactive";
    triggerFormId: number;
    actions: WorkflowAction[];
}

const ACTION_META: Record<string, { label: string; icon: LucideIcon; defaults: Record<string, unknown> }> = {
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

const ACTION_ORDER = ["send_email", "webhook", "set_status", "add_note"];

/** Extension-registered node type (the Pro plugin), or undefined for a built-in. */
function extActionByType(type: string): ExtensionWorkflowAction | undefined {
    return workflowActionTypes().find((a) => a.type === type);
}

/** Label + icon for any node type, built-in or extension, with a safe fallback. */
function metaFor(type: string): { label: string; icon: LucideIcon } {
    const builtin = ACTION_META[type];
    if (builtin) return { label: builtin.label, icon: builtin.icon };
    const ext = extActionByType(type);
    if (ext) return { label: ext.label, icon: extensionIcon(ext.icon) };
    return { label: type, icon: Mail };
}

function extDefaults(ext: ExtensionWorkflowAction | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of ext?.fields ?? []) {
        if (field.default !== undefined) out[field.key] = field.default;
    }
    return out;
}

let actionCounter = 0;
function newAction(type: string): WorkflowAction {
    actionCounter += 1;
    const builtin = ACTION_META[type];
    return {
        id: `a_${Date.now().toString(36)}${actionCounter}`,
        type,
        config: builtin ? { ...builtin.defaults } : extDefaults(extActionByType(type)),
    };
}

export function WorkflowBuilderPage({ id }: { id: number }) {
    const { data: workflow, isLoading } = useWorkflow(id);
    const { data: index } = useWorkflows();
    const save = useSaveWorkflow(id);
    const test = useTestWorkflow(id);
    const showToast = useUiStore((s) => s.showToast);

    const [draft, setDraft] = useState<Draft | null>(null);
    const [testLog, setTestLog] = useState<ActionResult[] | null>(null);
    const [testNote, setTestNote] = useState<string>("");

    useEffect(() => {
        if (workflow && draft === null) {
            setDraft({
                title: workflow.title,
                status: workflow.status,
                triggerFormId: workflow.trigger.form_id,
                actions: workflow.actions,
            });
        }
    }, [workflow, draft]);

    const forms = index?.forms ?? [];
    const templates = index?.templates ?? [];

    const dirty = useMemo(() => {
        if (!workflow || !draft) return false;
        return (
            draft.title !== workflow.title ||
            draft.status !== workflow.status ||
            draft.triggerFormId !== workflow.trigger.form_id ||
            JSON.stringify(draft.actions) !== JSON.stringify(workflow.actions)
        );
    }, [workflow, draft]);

    if (isLoading || !draft) {
        return (
            <div className="ff:flex ff:flex-1 ff:items-center ff:justify-center ff:p-10">
                <div className="ff:h-64 ff:w-full ff:max-w-xl ff:animate-pulse ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white" />
            </div>
        );
    }

    const persist = (next: Draft) =>
        save.mutateAsync({
            title: next.title,
            status: next.status,
            config: {
                trigger: { type: "form_submitted", form_id: next.triggerFormId },
                actions: next.actions,
            },
        });

    const onSave = () => {
        persist(draft)
            .then(() => showToast(__("Workflow saved.")))
            .catch((error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
            );
    };

    const onTest = async () => {
        try {
            if (dirty) {
                await persist(draft);
            }
            const result = await test.mutateAsync();
            setTestLog(result.log);
            setTestNote(result.ran ? "" : result.note ?? "");
        } catch (error) {
            showToast(error instanceof Error ? error.message : __("Test run failed."), "error");
        }
    };

    const updateAction = (actionId: string, configPatch: Record<string, unknown>) =>
        setDraft({
            ...draft,
            actions: draft.actions.map((a) =>
                a.id === actionId ? { ...a, config: { ...a.config, ...configPatch } } : a,
            ),
        });

    const removeAction = (actionId: string) =>
        setDraft({ ...draft, actions: draft.actions.filter((a) => a.id !== actionId) });

    const moveAction = (indexAt: number, delta: number) => {
        const target = indexAt + delta;
        if (target < 0 || target >= draft.actions.length) return;
        const actions = [...draft.actions];
        const [moved] = actions.splice(indexAt, 1);
        actions.splice(target, 0, moved);
        setDraft({ ...draft, actions });
    };

    const addAction = (type: string) => setDraft({ ...draft, actions: [...draft.actions, newAction(type)] });

    return (
        <div className="ff:flex ff:min-h-screen ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:sticky ff:top-8 ff:z-10 ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5 ff:py-3">
                <Button variant="ghost" size="icon" aria-label={__("Back")} onClick={() => navigate("/workflows")}>
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="ff:max-w-xs ff:font-medium"
                    placeholder={__("Workflow name")}
                />
                <div className="ff:flex ff:flex-1 ff:items-center ff:justify-end ff:gap-3">
                    <label className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-600">
                        {draft.status === "active" ? __("Active") : __("Inactive")}
                        <Switch
                            checked={draft.status === "active"}
                            onCheckedChange={(on) => setDraft({ ...draft, status: on ? "active" : "inactive" })}
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
                            })}
                        />
                    )}
                    <Button variant="outline" onClick={onTest} disabled={test.isPending || save.isPending}>
                        <Play aria-hidden className="ff:h-4 ff:w-4" />
                        {test.isPending ? __("Running…") : __("Run test")}
                    </Button>
                    <Button onClick={onSave} disabled={!dirty || save.isPending}>
                        {save.isPending ? __("Saving…") : __("Save")}
                    </Button>
                </div>
            </header>

            <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-xl ff:flex-col ff:items-stretch ff:gap-0 ff:px-4 ff:py-8">
                <TriggerNode
                    forms={forms}
                    formId={draft.triggerFormId}
                    onChange={(formId) => setDraft({ ...draft, triggerFormId: formId })}
                />

                {draft.actions.map((action, i) => (
                    <div key={action.id} className="ff:flex ff:flex-col ff:items-stretch">
                        <Connector />
                        <ActionNode
                            action={action}
                            forms={forms}
                            templates={templates}
                            triggerFormId={draft.triggerFormId}
                            isFirst={i === 0}
                            isLast={i === draft.actions.length - 1}
                            onUp={() => moveAction(i, -1)}
                            onDown={() => moveAction(i, 1)}
                            onRemove={() => removeAction(action.id)}
                            onChange={(patch) => updateAction(action.id, patch)}
                        />
                    </div>
                ))}

                <Connector />
                <AddAction onAdd={addAction} />

                {testLog !== null && (
                    <div className="ff:mt-8 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4">
                        <h3 className="ff:mb-3 ff:text-sm ff:font-semibold ff:text-slate-900">{__("Test run")}</h3>
                        {testNote !== "" ? (
                            <p className="ff:text-sm ff:text-slate-500">{testNote}</p>
                        ) : testLog.length === 0 ? (
                            <p className="ff:text-sm ff:text-slate-500">{__("No actions to run.")}</p>
                        ) : (
                            <ul className="ff:flex ff:flex-col ff:gap-2">
                                {testLog.map((entry, i) => (
                                    <li key={i} className="ff:flex ff:items-center ff:gap-2 ff:text-sm">
                                        <StatusDot status={entry.status} />
                                        <span className="ff:font-medium ff:text-slate-700">
                                            {metaFor(entry.type).label}
                                        </span>
                                        <span className="ff:text-slate-500">{entry.detail}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Connector() {
    return <div className="ff:mx-auto ff:h-6 ff:w-px ff:bg-slate-300" />;
}

function StatusDot({ status }: { status: ActionResult["status"] }) {
    const color =
        status === "ok" ? "ff:bg-emerald-500" : status === "error" ? "ff:bg-red-500" : "ff:bg-slate-300";
    return <span className={`ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ${color}`} aria-hidden />;
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
    const options = [
        { value: "0", label: __("Any form") },
        ...forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") })),
    ];
    return (
        <section className="ff:rounded-xl ff:border ff:border-brand-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                    <Zap aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div>
                    <div className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("When a form is submitted")}</div>
                    <div className="ff:text-xs ff:text-slate-500">{__("The trigger that starts this workflow")}</div>
                </div>
            </div>
            <label className="ff:mb-1.5 ff:block ff:text-xs ff:font-medium ff:text-slate-600">{__("Form")}</label>
            <Select
                options={options}
                value={String(formId)}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="ff:w-full"
            />
        </section>
    );
}

function ActionNode({
    action,
    forms,
    templates,
    triggerFormId,
    isFirst,
    isLast,
    onUp,
    onDown,
    onRemove,
    onChange,
}: {
    action: WorkflowAction;
    forms: FormOption[];
    templates: TemplateOption[];
    triggerFormId: number;
    isFirst: boolean;
    isLast: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const meta = metaFor(action.type);
    const Icon = meta.icon;

    return (
        <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-600">
                    <Icon aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div className="ff:flex-1 ff:text-sm ff:font-semibold ff:text-slate-900">
                    {meta.label}
                </div>
                <div className="ff:flex ff:gap-0.5">
                    <Button variant="ghost" size="icon" aria-label={__("Move up")} onClick={onUp} disabled={isFirst}>
                        <ArrowUp aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={__("Move down")} onClick={onDown} disabled={isLast}>
                        <ArrowDown aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
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

function ActionConfig({
    action,
    forms,
    templates,
    triggerFormId,
    onChange,
}: {
    action: WorkflowAction;
    forms: FormOption[];
    templates: TemplateOption[];
    triggerFormId: number;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const cfg = action.config;
    const str = (key: string) => (typeof cfg[key] === "string" ? (cfg[key] as string) : "");
    const num = (key: string) => (typeof cfg[key] === "number" ? (cfg[key] as number) : 0);

    if (action.type === "send_email") {
        const toMode = str("to_mode") || "admin";
        const triggerForm = forms.find((f) => f.id === triggerFormId);
        const emailFields = (triggerForm?.fields ?? []).filter((fld) => fld.type === "email" || fld.type === "text");
        const templateOptions = [
            { value: "0", label: __("Default design") },
            ...templates.map((t) => ({ value: String(t.id), label: t.title })),
        ];
        return (
            <div className="ff:flex ff:flex-col ff:gap-3">
                <Field label={__("Send to")}>
                    <Select
                        options={[
                            { value: "admin", label: __("Site admin") },
                            { value: "field", label: __("A form field") },
                            { value: "fixed", label: __("A fixed address") },
                        ]}
                        value={toMode}
                        onChange={(e) => onChange({ to_mode: e.target.value })}
                        className="ff:w-full"
                    />
                </Field>
                {toMode === "field" &&
                    (triggerFormId > 0 ? (
                        <Field label={__("Email field")}>
                            <Select
                                options={
                                    emailFields.length > 0
                                        ? emailFields.map((f) => ({ value: f.id, label: f.label }))
                                        : [{ value: "", label: __("No suitable fields") }]
                                }
                                value={str("to")}
                                onChange={(e) => onChange({ to: e.target.value })}
                                className="ff:w-full"
                            />
                        </Field>
                    ) : (
                        <Field label={__("Field ID")}>
                            <Input value={str("to")} onChange={(e) => onChange({ to: e.target.value })} />
                        </Field>
                    ))}
                {toMode === "fixed" && (
                    <Field label={__("Email address")}>
                        <Input
                            type="email"
                            value={str("to")}
                            onChange={(e) => onChange({ to: e.target.value })}
                            placeholder="name@example.com"
                        />
                    </Field>
                )}
                <Field label={__("Subject")}>
                    <Input
                        value={str("subject")}
                        onChange={(e) => onChange({ subject: e.target.value })}
                        placeholder={__("Leave blank for a default subject")}
                    />
                </Field>
                <Field label={__("Template")}>
                    <Select
                        options={templateOptions}
                        value={String(num("template_id"))}
                        onChange={(e) => onChange({ template_id: parseInt(e.target.value, 10) })}
                        className="ff:w-full"
                    />
                </Field>
                {num("template_id") === 0 && (
                    <Field label={__("Message")}>
                        <textarea
                            className="flexa-formflow-control ff:min-h-20 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                            value={str("message")}
                            onChange={(e) => onChange({ message: e.target.value })}
                            placeholder={__("Optional intro text above the submission table. Tokens like {form_title} work.")}
                        />
                    </Field>
                )}
            </div>
        );
    }

    if (action.type === "webhook") {
        return (
            <Field label={__("POST URL")}>
                <Input
                    type="url"
                    value={str("url")}
                    onChange={(e) => onChange({ url: e.target.value })}
                    placeholder="https://example.com/hook"
                    spellCheck={false}
                />
            </Field>
        );
    }

    if (action.type === "set_status") {
        return (
            <Field label={__("Mark entry as")}>
                <Select
                    options={[
                        { value: "read", label: __("Read") },
                        { value: "unread", label: __("Unread") },
                    ]}
                    value={str("status") || "read"}
                    onChange={(e) => onChange({ status: e.target.value })}
                    className="ff:w-full"
                />
            </Field>
        );
    }

    if (action.type === "add_note") {
        return (
            <Field label={__("Note")}>
                <textarea
                    className="flexa-formflow-control ff:min-h-16 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                    value={str("note")}
                    onChange={(e) => onChange({ note: e.target.value })}
                    placeholder={__("Internal note. Tokens like {field:ID} work.")}
                />
            </Field>
        );
    }

    const ext = extActionByType(action.type);
    if (ext) {
        const triggerForm = forms.find((f) => f.id === triggerFormId);
        return (
            <div className="ff:flex ff:flex-col">
                {ext.locked && <LockedNote note={ext.lockedNote} />}
                <SchemaFields
                    fields={ext.fields}
                    values={cfg}
                    onChange={onChange}
                    context={{ formFields: triggerForm?.fields, connections: integrationConnections() }}
                    disabled={ext.locked}
                />
            </div>
        );
    }

    return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="ff:flex ff:flex-col ff:gap-1.5">
            <span className="ff:text-xs ff:font-medium ff:text-slate-600">{label}</span>
            {children}
        </label>
    );
}

function AddAction({ onAdd }: { onAdd: (type: string) => void }) {
    const extras = workflowActionTypes();
    return (
        <section className="ff:rounded-xl ff:border ff:border-dashed ff:border-slate-300 ff:bg-white ff:p-4">
            <div className="ff:mb-2 ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-slate-500">
                <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Add an action")}
            </div>
            <div className="ff:flex ff:flex-wrap ff:gap-2">
                {ACTION_ORDER.map((type) => {
                    const meta = ACTION_META[type];
                    const Icon = meta.icon;
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onAdd(type)}
                            className="ff:flex ff:items-center ff:gap-1.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-3 ff:py-1.5 ff:text-sm ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
                        >
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            {meta.label}
                        </button>
                    );
                })}
                {extras.map((ext) => {
                    const Icon = extensionIcon(ext.icon);
                    return (
                        <button
                            key={ext.type}
                            type="button"
                            onClick={() => onAdd(ext.type)}
                            className="ff:flex ff:items-center ff:gap-1.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-3 ff:py-1.5 ff:text-sm ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
                        >
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            {ext.label}
                            {ext.group === "pro" && (
                                <span className="ff:rounded ff:bg-violet-100 ff:px-1 ff:py-0.5 ff:text-[10px] ff:font-semibold ff:text-violet-700">
                                    {__("Pro")}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
