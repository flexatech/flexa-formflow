import { useEffect, useState } from "react";
import { CheckCircle2, CircleSlash, FlaskConical, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useTestSubmission, type TestStep } from "@/features/spam/useSpam";
import type { FormConfig, FormField } from "../types";

const STEP_LABELS: Record<string, () => string> = {
    form: () => __("Form status"),
    builtin: () => __("Built-in protection"),
    rate_limit: () => __("Rate limit"),
    captcha: () => __("CAPTCHA"),
    fields: () => __("Field validation"),
    entry: () => __("Entry"),
    emails: () => __("Notification emails"),
    workflows: () => __("Workflows"),
};

const STATUS_TEXT: Record<TestStep["status"], () => string> = {
    pass: () => __("Passed"),
    fail: () => __("Failed"),
    skip: () => __("Skipped"),
};

/** A plausible answer per field type, so a test run can start with one click. */
function sampleValue(field: FormField): string {
    switch (field.type) {
        case "email":
            return "jane@example.com";
        case "number":
            return "42";
        case "date":
            return new Date().toISOString().slice(0, 10);
        case "select":
        case "radio":
        case "checkbox":
            return field.options[0] ?? "";
        case "hidden":
            return field.placeholder;
        default:
            return field.label ? `${__("Sample")} ${field.label.toLowerCase()}` : __("Sample answer");
    }
}

/**
 * "Run test": sample answers go through the real submit pipeline as a dry run
 * and every step reports pass, fail or skip with a reason. Nothing is saved,
 * sent or run; the live CAPTCHA check is the one step it cannot perform.
 */
export function TestSubmissionDialog({
    open,
    onOpenChange,
    formId,
    config,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formId: number;
    config: FormConfig;
}) {
    const test = useTestSubmission(formId);
    const fields = config.fields.filter((f) => f.type !== "hidden");
    const [values, setValues] = useState<Record<string, string>>({});

    // Fresh sample answers each time the dialog opens.
    useEffect(() => {
        if (open) {
            setValues(Object.fromEntries(config.fields.map((f) => [f.id, sampleValue(f)])));
            test.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const run = () => {
        const payload: Record<string, unknown> = {};
        for (const field of config.fields) {
            const value = values[field.id] ?? "";
            payload[field.id] = field.type === "checkbox" ? value.split(",").map((v) => v.trim()).filter(Boolean) : value;
        }
        test.mutate({ config, fields: payload });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="ff:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{__("Run a test submission")}</DialogTitle>
                    <DialogDescription>
                        {__("Checks these answers against every step of the live pipeline. No entry is saved, no email is sent and no workflow runs.")}
                    </DialogDescription>
                </DialogHeader>

                <div className="ff:grid ff:max-h-[45vh] ff:grid-cols-1 ff:gap-3 ff:overflow-y-auto ff:sm:grid-cols-2">
                    {fields.length === 0 && (
                        <p className="ff:m-0 ff:text-sm ff:text-slate-500">{__("Add a field to the form to test it.")}</p>
                    )}
                    {fields.map((field) => (
                        <div key={field.id} className="ff:flex ff:flex-col ff:gap-1">
                            <Label htmlFor={`ff-test-${field.id}`}>
                                {field.label || field.id}
                                {field.required && <span className="ff:text-red-600"> *</span>}
                            </Label>
                            <Input
                                id={`ff-test-${field.id}`}
                                value={values[field.id] ?? ""}
                                onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
                                placeholder={field.type === "checkbox" ? __("Comma-separated choices") : ""}
                            />
                        </div>
                    ))}
                </div>

                {test.data && (
                    <ol className="ff:m-0 ff:flex ff:list-none ff:flex-col ff:gap-1.5 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3" aria-label={__("Test results")}>
                        {test.data.steps.map((step, i) => (
                            <StepRow key={`${step.step}-${i}`} step={step} />
                        ))}
                    </ol>
                )}
                {test.isError && (
                    <p role="alert" className="ff:m-0 ff:text-sm ff:text-red-600">
                        {test.error instanceof Error ? test.error.message : __("The test could not run.")}
                    </p>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {__("Close")}
                    </Button>
                    <Button onClick={run} disabled={test.isPending}>
                        <FlaskConical aria-hidden className="ff:h-4 ff:w-4" />
                        {test.isPending ? __("Running…") : __("Run test")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StepRow({ step }: { step: TestStep }) {
    const Icon = step.status === "pass" ? CheckCircle2 : step.status === "fail" ? XCircle : CircleSlash;
    return (
        <li className="ff:flex ff:items-start ff:gap-2 ff:text-sm">
            <Icon
                aria-hidden
                className={cn(
                    "ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0",
                    step.status === "pass" && "ff:text-emerald-600",
                    step.status === "fail" && "ff:text-red-600",
                    step.status === "skip" && "ff:text-slate-400",
                )}
            />
            <div className="ff:min-w-0">
                <span className="ff:font-medium ff:text-slate-900">{(STEP_LABELS[step.step] ?? (() => step.step))()}</span>
                <span className="ff:text-slate-500"> · {STATUS_TEXT[step.status]()}</span>
                {step.detail && <p className="ff:m-0 ff:text-xs ff:text-slate-600">{step.detail}</p>}
            </div>
        </li>
    );
}
