import { Info, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { __, sprintf } from "@/lib/i18n";
import { useEntriesList } from "@/features/entries/useEntries";
import type { EntryRow } from "@/features/forms/types";
import type { ActionResult, FormFieldOption, FormOption, TestSource } from "../useWorkflows";
import { Field, StatusDot } from "./StepEditors";
import { metaFor } from "./workflowModel";

type Source = TestSource["source"];
type Values = Record<string, string | string[]>;

/**
 * The test panel, docked on the right of the builder so the flow stays in
 * view (in List or Visual) while testing. Choose what a run uses: the latest
 * entry, a chosen entry, or values typed here (never saved), run it, and the
 * result shows below and on each step. It stays open to tweak values and run
 * again; typed values are how to try each branch without a real submission.
 */
export function TestRunPanel({
    forms,
    triggerFormId,
    running,
    onRun,
    onClose,
    log,
    note,
}: {
    forms: FormOption[];
    triggerFormId: number;
    running: boolean;
    onRun: (params: TestSource) => void;
    onClose: () => void;
    /** The last run's steps, or null before the first run. */
    log: ActionResult[] | null;
    /** Why the last run did not run (no entries), if so. */
    note: string;
}) {
    const ref = useRef<HTMLElement>(null);

    // Land keyboard users in the panel when it opens.
    useEffect(() => {
        ref.current?.querySelector<HTMLElement>("input:not([disabled]), select, textarea")?.focus();
    }, []);

    return (
        <aside
            ref={ref}
            id="ff-workflow-test-panel"
            aria-label={__("Test run")}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.stopPropagation();
                    onClose();
                }
            }}
            // As tall as the builder's content row; its body scrolls on its own.
            className="ff:flex ff:h-full ff:min-h-0 ff:w-[22rem] ff:shrink-0 ff:flex-col ff:border-l ff:border-slate-200 ff:bg-white"
        >
            <TestRunForm
                forms={forms}
                triggerFormId={triggerFormId}
                running={running}
                onRun={onRun}
                onClose={onClose}
                log={log}
                note={note}
            />
        </aside>
    );
}

function TestRunForm({
    forms,
    triggerFormId,
    running,
    onRun,
    onClose,
    log,
    note,
}: {
    forms: FormOption[];
    triggerFormId: number;
    running: boolean;
    onRun: (params: TestSource) => void;
    onClose: () => void;
    log: ActionResult[] | null;
    note: string;
}) {
    // "Any form" workflows test against a form picked here.
    const [pickedFormId, setPickedFormId] = useState(triggerFormId > 0 ? triggerFormId : (forms[0]?.id ?? 0));
    const formId = triggerFormId > 0 ? triggerFormId : pickedFormId;
    const form = forms.find((f) => f.id === formId);

    const { data, isLoading } = useEntriesList({ form_id: formId || undefined, per_page: 20 });
    const entries = data?.items ?? [];
    const latest = entries[0];

    const [source, setSource] = useState<Source>("latest");
    const [entryId, setEntryId] = useState(0);
    const [values, setValues] = useState<Values>({});

    // With no entries there is nothing "latest" to use: start on typed values.
    useEffect(() => {
        if (!isLoading && entries.length === 0 && source !== "values") setSource("values");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, entries.length]);

    useEffect(() => {
        setEntryId(entries[0]?.id ?? 0);
        // Only when the list itself changes (another form picked).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const fill = (entry: EntryRow | undefined) => setValues(entry ? valuesFrom(entry, form?.fields ?? []) : {});

    const run = () => {
        // "Any form": the latest shown is the picked form's, so name it exactly.
        if (source === "latest")
            onRun(triggerFormId === 0 && latest ? { source: "entry", entry_id: latest.id } : { source: "latest" });
        else if (source === "entry") onRun({ source: "entry", entry_id: entryId });
        else onRun({ source: "values", form_id: formId, values });
    };

    const entryOptions = useMemo(
        () => entries.map((e) => ({ value: String(e.id), label: entryLabel(e, form?.fields ?? []) })),
        [entries, form],
    );

    return (
        <>
            <div className="ff:flex ff:items-start ff:gap-2 ff:border-b ff:border-slate-100 ff:px-4 ff:py-3">
                <div className="ff:min-w-0 ff:flex-1">
                    <h2 className="ff:m-0 ff:text-sm ff:font-semibold ff:text-slate-900">{__("Run a test")}</h2>
                    <p className="ff:m-0 ff:text-xs ff:text-slate-500">{__("Choose the data this test run uses.")}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label={__("Close test panel")} onClick={onClose}>
                    <X aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
            </div>

            <div className="ff:flex ff:min-h-0 ff:flex-1 ff:flex-col ff:gap-4 ff:overflow-y-auto ff:p-4">
                {triggerFormId === 0 && (
                    <Field label={__("Form")}>
                        <Select
                            options={forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") }))}
                            value={String(pickedFormId)}
                            onChange={(e) => {
                                setPickedFormId(Number(e.target.value));
                                setValues({});
                            }}
                            className="ff:w-full"
                        />
                    </Field>
                )}

                <fieldset className="ff:m-0 ff:flex ff:flex-col ff:gap-2 ff:border-0 ff:p-0">
                    <legend className="ff:mb-1.5 ff:text-xs ff:font-medium ff:text-slate-600">{__("Test with")}</legend>
                    <SourceOption
                        value="latest"
                        current={source}
                        onChange={setSource}
                        disabled={!latest}
                        label={__("The latest entry")}
                        hint={
                            isLoading
                                ? __("Loading…")
                                : latest
                                  ? entryLabel(latest, form?.fields ?? [])
                                  : __("No entries yet.")
                        }
                    />
                    <SourceOption
                        value="entry"
                        current={source}
                        onChange={setSource}
                        disabled={entries.length === 0}
                        label={__("A chosen entry")}
                        hint={__("One of the 20 most recent.")}
                    />
                    {source === "entry" && entries.length > 0 && (
                        <Select
                            aria-label={__("Entry")}
                            options={entryOptions}
                            value={String(entryId)}
                            onChange={(e) => setEntryId(Number(e.target.value))}
                            className="ff:ml-6 ff:w-[calc(100%-1.5rem)]"
                        />
                    )}
                    <SourceOption
                        value="values"
                        current={source}
                        onChange={setSource}
                        label={__("Test values")}
                        hint={__("Type the answers yourself. Nothing is saved.")}
                    />
                </fieldset>

                {source === "values" &&
                    (form ? (
                        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
                            <div className="ff:flex ff:items-center ff:justify-between ff:gap-2">
                                <span className="ff:text-xs ff:font-medium ff:text-slate-600">
                                    {sprintf(__("Answers for %s"), form.title || __("Untitled form"))}
                                </span>
                                {latest && (
                                    <Button variant="ghost" size="sm" onClick={() => fill(latest)}>
                                        {__("Fill from the latest entry")}
                                    </Button>
                                )}
                            </div>
                            {form.fields.length === 0 && (
                                <p className="ff:m-0 ff:text-xs ff:text-slate-500">{__("This form has no fields.")}</p>
                            )}
                            {form.fields.map((field) => (
                                <ValueInput
                                    key={field.id}
                                    field={field}
                                    value={values[field.id] ?? (field.type === "checkbox" ? [] : "")}
                                    onChange={(value) => setValues((v) => ({ ...v, [field.id]: value }))}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="ff:m-0 ff:text-sm ff:text-slate-500">
                            {__("Create a form first to enter test values.")}
                        </p>
                    ))}

                <p className="ff:m-0 ff:flex ff:gap-2 ff:rounded-lg ff:bg-slate-50 ff:p-3 ff:text-xs ff:text-slate-600">
                    <Info aria-hidden className="ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
                    {source === "values"
                        ? __(
                              "Email and webhook steps really send. Status and note steps only report what they would do, since there is no saved entry.",
                          )
                        : __(
                              "Every step really runs: emails and webhooks send, and the entry's status and notes change.",
                          )}
                </p>

                <RunResult log={log} note={note} running={running} />
            </div>

            {/* Right padding keeps the button clear of the floating fullscreen toggle. */}
            <div className="ff:border-t ff:border-slate-100 ff:py-3 ff:pl-3 ff:pr-16">
                <Button
                    className="ff:w-full"
                    onClick={run}
                    disabled={running || (source === "values" && !form) || (source === "entry" && entryId === 0)}
                >
                    <Play aria-hidden className="ff:h-4 ff:w-4" />
                    {running ? __("Running…") : log ? __("Run again") : __("Run test")}
                </Button>
            </div>
        </>
    );
}

/** The last run, step by step, in the order the engine ran them. */
function RunResult({ log, note, running }: { log: ActionResult[] | null; note: string; running: boolean }) {
    if (note !== "") {
        return (
            <div
                role="status"
                className="ff:rounded-lg ff:border ff:border-amber-200 ff:bg-amber-50 ff:p-3 ff:text-xs ff:text-amber-800"
            >
                {note}
            </div>
        );
    }
    if (!log) return null;
    return (
        <section
            aria-label={__("Last result")}
            className={cn("ff:flex ff:flex-col ff:gap-2", running && "ff:opacity-50")}
        >
            <h3 className="ff:m-0 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {__("Last result")}
            </h3>
            {log.length === 0 ? (
                <p className="ff:m-0 ff:text-xs ff:text-slate-500">{__("This workflow has no steps to run yet.")}</p>
            ) : (
                <ol role="status" className="ff:m-0 ff:flex ff:list-none ff:flex-col ff:gap-2 ff:p-0">
                    {log.map((step, i) => (
                        <li
                            key={i}
                            className="ff:m-0 ff:flex ff:items-start ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:px-3 ff:py-2"
                        >
                            <span className="ff:mt-1.5 ff:flex">
                                <StatusDot status={step.status} />
                            </span>
                            <span className="ff:flex ff:min-w-0 ff:flex-col">
                                <span className="ff:text-xs ff:font-medium ff:text-slate-700">
                                    {metaFor(step.type).label}
                                </span>
                                <span className="ff:text-xs ff:break-words ff:text-slate-500">{step.detail}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

function SourceOption({
    value,
    current,
    onChange,
    label,
    hint,
    disabled,
}: {
    value: Source;
    current: Source;
    onChange: (value: Source) => void;
    label: string;
    hint: string;
    disabled?: boolean;
}) {
    return (
        <label
            className={cn(
                "ff:flex ff:items-start ff:gap-2.5 ff:rounded-lg ff:border ff:px-3 ff:py-2",
                current === value ? "ff:border-brand-300 ff:bg-brand-50/50" : "ff:border-slate-200",
                disabled ? "ff:cursor-not-allowed ff:opacity-50" : "ff:cursor-pointer",
            )}
        >
            <input
                type="radio"
                name="ff-test-source"
                className="ff:mt-0.5"
                checked={current === value}
                disabled={disabled}
                onChange={() => onChange(value)}
            />
            <span className="ff:flex ff:min-w-0 ff:flex-col">
                <span className="ff:text-sm ff:font-medium ff:text-slate-800">{label}</span>
                <span className="ff:truncate ff:text-xs ff:text-slate-500">{hint}</span>
            </span>
        </label>
    );
}

/** One test answer, shaped like the field it answers. */
function ValueInput({
    field,
    value,
    onChange,
}: {
    field: FormFieldOption;
    value: string | string[];
    onChange: (value: string | string[]) => void;
}) {
    const options = field.options ?? [];
    const str = Array.isArray(value) ? value.join(", ") : value;

    if (field.type === "checkbox") {
        const picked = Array.isArray(value) ? value : value ? [value] : [];
        return (
            <fieldset className="ff:m-0 ff:border-0 ff:p-0">
                <legend className="ff:mb-1.5 ff:text-xs ff:font-medium ff:text-slate-600">{field.label}</legend>
                <div className="ff:flex ff:flex-wrap ff:gap-x-4 ff:gap-y-1">
                    {options.map((option) => (
                        <label key={option} className="ff:flex ff:items-center ff:gap-1.5 ff:text-sm ff:text-slate-700">
                            <input
                                type="checkbox"
                                checked={picked.includes(option)}
                                onChange={(e) =>
                                    onChange(
                                        e.target.checked ? [...picked, option] : picked.filter((p) => p !== option),
                                    )
                                }
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </fieldset>
        );
    }

    if ((field.type === "select" || field.type === "radio") && options.length > 0) {
        return (
            <Field label={field.label}>
                <Select
                    options={[{ value: "", label: __("No answer") }, ...options.map((o) => ({ value: o, label: o }))]}
                    value={str}
                    onChange={(e) => onChange(e.target.value)}
                    className="ff:w-full"
                />
            </Field>
        );
    }

    if (field.type === "textarea") {
        return (
            <Field label={field.label}>
                <Textarea
                    className="ff:min-h-16"
                    value={str}
                    onChange={(e) => onChange(e.target.value)}
                />
            </Field>
        );
    }

    const type = field.type === "email" || field.type === "number" || field.type === "date" ? field.type : "text";
    return (
        <Field label={field.type === "hidden" ? sprintf(__("%s (hidden)"), field.label) : field.label}>
            <Input type={type} value={str} onChange={(e) => onChange(e.target.value)} />
        </Field>
    );
}

/** "#12 · Mai Tran · mai@example.com", from the entry's first two answers. */
function entryLabel(entry: EntryRow, fields: FormFieldOption[]): string {
    const answers = fields
        .map((f) => entry.data[f.id])
        .map((v) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .filter((v) => v !== "")
        .slice(0, 2);
    return [sprintf(__("#%d"), entry.id), ...answers].join(" · ");
}

function valuesFrom(entry: EntryRow, fields: FormFieldOption[]): Values {
    const out: Values = {};
    for (const field of fields) {
        const raw = entry.data[field.id];
        if (Array.isArray(raw)) out[field.id] = raw.map(String);
        else if (typeof raw === "string" || typeof raw === "number") out[field.id] = String(raw);
    }
    return out;
}
