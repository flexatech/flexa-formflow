import { BookMarked, Filter, Plus, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SchemaFields } from "@/components/custom/SchemaFields";
import { __, sprintf } from "@/lib/i18n";
import { extensionIcon, integrationConnections, workflowActionTypes } from "@/lib/extensions";
import type {
    ActionResult,
    ConditionOperator,
    FormOption,
    TemplateOption,
    WorkflowAction,
    WorkflowCondition,
} from "../useWorkflows";
import { ACTION_META, ACTION_ORDER, OPERATORS, extActionByType } from "./workflowModel";

/*
 * The step editors both builder views render: the List view inside its cards,
 * the Visual view inside the side panel. One implementation per step, so a
 * field edited in either view behaves the same.
 */

/** Which form starts the workflow. */
export function TriggerConfig({
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
        <Field label={__("Form")}>
            <Select
                options={options}
                value={String(formId)}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="ff:w-full"
            />
        </Field>
    );
}

/** The single gate's field, operator and value. */
export function ConditionConfig({
    condition,
    triggerForm,
    onChange,
}: {
    condition: WorkflowCondition;
    triggerForm: FormOption | undefined;
    onChange: (patch: Partial<WorkflowCondition>) => void;
}) {
    const op = OPERATORS.find((o) => o.value === condition.operator) ?? OPERATORS[0];
    const fieldOptions = (triggerForm?.fields ?? []).map((f) => ({ value: f.id, label: f.label }));

    return (
        <div className="ff:flex ff:flex-col ff:gap-3">
            <Field label={__("Field")}>
                {triggerForm ? (
                    <Select
                        options={
                            fieldOptions.length > 0
                                ? fieldOptions
                                : [{ value: "", label: __("No fields on this form") }]
                        }
                        value={condition.field}
                        onChange={(e) => onChange({ field: e.target.value })}
                        className="ff:w-full"
                    />
                ) : (
                    <Input
                        value={condition.field}
                        onChange={(e) => onChange({ field: e.target.value })}
                        placeholder={__("Field ID")}
                    />
                )}
            </Field>
            <Field label={__("Condition")}>
                <Select
                    options={OPERATORS.map((o) => ({ value: o.value, label: o.label() }))}
                    value={condition.operator}
                    onChange={(e) => onChange({ operator: e.target.value as ConditionOperator })}
                    className="ff:w-full"
                />
            </Field>
            {op.needsValue && (
                <Field label={__("Value")}>
                    <Input value={condition.value} onChange={(e) => onChange({ value: e.target.value })} />
                </Field>
            )}
        </div>
    );
}

export function ActionConfig({
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
                        <Textarea
                            className="ff:min-h-20"
                            value={str("message")}
                            onChange={(e) => onChange({ message: e.target.value })}
                            placeholder={__(
                                "Optional intro text above the submission table. Tokens like {form_title} work.",
                            )}
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
                <Textarea
                    className="ff:min-h-16"
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
            <SchemaFields
                fields={ext.fields}
                values={cfg}
                onChange={onChange}
                context={{ formFields: triggerForm?.fields, connections: integrationConnections() }}
            />
        );
    }

    return <GenericActionConfig action={action} onChange={onChange} />;
}

/**
 * Settings for a step with no editor of its own (its add-on is inactive, or a
 * type this build does not know): every plain setting stays editable, nested
 * ones are shown as they are, and nothing is dropped from the saved config.
 */
export function GenericActionConfig({
    action,
    onChange,
}: {
    action: WorkflowAction;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const entries = Object.entries(action.config);
    return (
        <div className="ff:flex ff:flex-col ff:gap-3" data-ff-generic-step={action.type}>
            <p className="ff:m-0 ff:rounded-lg ff:bg-slate-50 ff:p-3 ff:text-xs ff:text-slate-600">
                {sprintf(
                    /* translators: %s: step type, e.g. "slack_message". */
                    __("No editor is available for \"%s\" (its add-on may be inactive). Its settings are kept as they are and can be edited below."),
                    action.type,
                )}
            </p>
            {entries.length === 0 && <p className="ff:m-0 ff:text-xs ff:text-slate-500">{__("This step has no settings.")}</p>}
            {entries.map(([key, value]) =>
                typeof value === "boolean" ? (
                    <label key={key} className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-700">
                        <input
                            type="checkbox"
                            className="flexa-formflow-check"
                            checked={value}
                            onChange={(e) => onChange({ [key]: e.target.checked })}
                        />
                        {key}
                    </label>
                ) : typeof value === "string" || typeof value === "number" ? (
                    <Field key={key} label={key}>
                        <Input
                            type={typeof value === "number" ? "number" : "text"}
                            value={String(value)}
                            onChange={(e) =>
                                onChange({ [key]: typeof value === "number" ? Number(e.target.value) || 0 : e.target.value })
                            }
                        />
                    </Field>
                ) : (
                    <Field key={key} label={key}>
                        <code className="ff:block ff:max-h-32 ff:overflow-auto ff:rounded-md ff:bg-slate-50 ff:p-2 ff:text-[11px] ff:text-slate-600">
                            {JSON.stringify(value)}
                        </code>
                    </Field>
                ),
            )}
        </div>
    );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="ff:flex ff:flex-col ff:gap-1.5">
            <span className="ff:text-xs ff:font-medium ff:text-slate-600">{label}</span>
            {children}
        </label>
    );
}

export function StatusDot({ status }: { status: ActionResult["status"] }) {
    const color = status === "ok" ? "ff:bg-emerald-500" : status === "error" ? "ff:bg-red-500" : "ff:bg-slate-300";
    return <span className={`ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ${color}`} aria-hidden />;
}

/** The per-node result badge shown on the canvas after a test run. */
export function NodeStatus({ result }: { result: ActionResult | null }) {
    if (!result) {
        return null;
    }
    return (
        <span className="ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:text-slate-500">
            <StatusDot status={result.status} />
            {result.detail}
        </span>
    );
}

export function Palette({
    onAdd,
    onAddCondition,
    canAddCondition,
    onBrowseRecipes,
}: {
    onAdd: (type: string) => void;
    onAddCondition: () => void;
    canAddCondition: boolean;
    /** Omitted inside a branch, where recipes (whole workflows) do not apply. */
    onBrowseRecipes?: () => void;
}) {
    const extras = workflowActionTypes();
    return (
        <section className="ff:rounded-xl ff:border ff:border-dashed ff:border-slate-300 ff:bg-white ff:p-4">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-slate-500">
                <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Add a step")}
            </div>

            <div className="ff:flex ff:flex-col ff:gap-3">
                {canAddCondition && (
                    <PaletteGroup label={__("Conditions")}>
                        <PaletteButton icon={Filter} label={__("If… (condition)")} onClick={onAddCondition} />
                    </PaletteGroup>
                )}

                <PaletteGroup label={__("Actions")}>
                    {ACTION_ORDER.map((type) => (
                        <PaletteButton
                            key={type}
                            icon={ACTION_META[type].icon}
                            label={ACTION_META[type].label}
                            onClick={() => onAdd(type)}
                        />
                    ))}
                    {extras.map((ext) => (
                        <PaletteButton
                            key={ext.type}
                            icon={extensionIcon(ext.icon)}
                            label={ext.label}
                            onClick={() => onAdd(ext.type)}
                        />
                    ))}
                </PaletteGroup>

                {onBrowseRecipes && (
                    <PaletteGroup label={__("Recipes")}>
                        <PaletteButton icon={BookMarked} label={__("Browse recipes")} onClick={onBrowseRecipes} />
                    </PaletteGroup>
                )}
            </div>
        </section>
    );
}

function PaletteGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="ff:mb-1.5 ff:text-[11px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {label}
            </p>
            <div className="ff:flex ff:flex-wrap ff:gap-2">{children}</div>
        </div>
    );
}

function PaletteButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ff:flex ff:items-center ff:gap-1.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-3 ff:py-1.5 ff:text-sm ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
        >
            <Icon aria-hidden className="ff:h-4 ff:w-4" />
            {label}
        </button>
    );
}

/**
 * A branch's "Add step": a slim button that opens the action palette in place,
 * so two branches do not each show a full palette all the time.
 */
export function AddStepButton({ onAdd }: { onAdd: (type: string) => void }) {
    const [open, setOpen] = useState(false);
    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={false}
                className="ff:mt-3 ff:flex ff:cursor-pointer ff:items-center ff:justify-center ff:gap-1.5 ff:rounded-lg ff:border ff:border-dashed ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:text-slate-600 ff:transition-colors ff:first:mt-0 ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
            >
                <Plus aria-hidden className="ff:h-4 ff:w-4" />
                {__("Add step")}
            </button>
        );
    }
    return (
        <div className="ff:relative ff:mt-3 ff:first:mt-0">
            <Palette
                onAdd={(type) => {
                    onAdd(type);
                    setOpen(false);
                }}
                onAddCondition={() => undefined}
                canAddCondition={false}
            />
            <button
                type="button"
                aria-label={__("Close")}
                onClick={() => setOpen(false)}
                className="ff:absolute ff:right-2 ff:top-2 ff:flex ff:h-7 ff:w-7 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded-md ff:border-0 ff:bg-transparent ff:text-slate-400 ff:hover:bg-slate-100 ff:hover:text-slate-700"
            >
                <X aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </div>
    );
}
