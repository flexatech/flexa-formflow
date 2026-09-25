import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@/lib/i18n";
import { fieldTypeMeta, type FormConfig, type FormField } from "../types";

interface InspectorProps {
    config: FormConfig;
    field: FormField | null;
    onChange: (config: FormConfig) => void;
    onFieldChange: (patch: Partial<FormField>) => void;
}

/**
 * Right column: bound to the selected field; with nothing selected it edits
 * the form-level settings (submit label, success message).
 */
export function Inspector({ config, field, onChange, onFieldChange }: InspectorProps) {
    if (!field) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-4">
                <p className="ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                    {__("Form settings")}
                </p>
                <Row label={__("Submit button label")} htmlFor="ff-submit-label">
                    <Input
                        id="ff-submit-label"
                        value={config.settings.submit_label}
                        placeholder={__("Send")}
                        onChange={(e) =>
                            onChange({
                                ...config,
                                settings: { ...config.settings, submit_label: e.target.value },
                            })
                        }
                    />
                </Row>
                <Row label={__("Success message")} htmlFor="ff-success-message">
                    <Textarea
                        id="ff-success-message"
                        value={config.settings.success_message}
                        placeholder={__("Thanks, we got your message.")}
                        onChange={(e) =>
                            onChange({
                                ...config,
                                settings: { ...config.settings, success_message: e.target.value },
                            })
                        }
                    />
                </Row>
                <p className="ff:text-xs ff:text-slate-400">
                    {__("Select a field on the canvas to edit its options.")}
                </p>
            </div>
        );
    }

    const meta = fieldTypeMeta(field.type);
    const isHidden = field.type === "hidden";

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <p className="ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {meta.label()}
            </p>

            <Row label={__("Label")} htmlFor="ff-field-label">
                <Input
                    id="ff-field-label"
                    value={field.label}
                    onChange={(e) => onFieldChange({ label: e.target.value })}
                />
            </Row>

            {!isHidden && !meta.hasOptions ? (
                <Row label={__("Placeholder")} htmlFor="ff-field-placeholder">
                    <Input
                        id="ff-field-placeholder"
                        value={field.placeholder}
                        onChange={(e) => onFieldChange({ placeholder: e.target.value })}
                    />
                </Row>
            ) : null}

            {isHidden ? (
                <Row label={__("Value")} htmlFor="ff-field-value">
                    <Input
                        id="ff-field-value"
                        value={field.placeholder}
                        onChange={(e) => onFieldChange({ placeholder: e.target.value })}
                    />
                </Row>
            ) : null}

            {meta.hasOptions ? (
                <Row label={__("Options (one per line)")} htmlFor="ff-field-options">
                    <Textarea
                        id="ff-field-options"
                        value={field.options.join("\n")}
                        rows={Math.max(3, field.options.length + 1)}
                        onChange={(e) => onFieldChange({ options: e.target.value.split("\n") })}
                        onBlur={(e) =>
                            onFieldChange({
                                options: e.target.value
                                    .split("\n")
                                    .map((o) => o.trim())
                                    .filter(Boolean),
                            })
                        }
                    />
                </Row>
            ) : null}

            {!isHidden ? (
                <>
                    <div className="ff:flex ff:items-center ff:justify-between">
                        <Label htmlFor="ff-field-required" className="ff:text-sm ff:font-medium ff:text-slate-700">
                            {__("Required")}
                        </Label>
                        <Switch
                            id="ff-field-required"
                            checked={field.required}
                            onCheckedChange={(next) => onFieldChange({ required: next })}
                        />
                    </div>
                    <Row label={__("Width")} htmlFor="ff-field-width">
                        <Select
                            id="ff-field-width"
                            value={field.width}
                            options={[
                                { value: "full", label: __("Full width") },
                                { value: "half", label: __("Half width") },
                            ]}
                            onChange={(e) => onFieldChange({ width: e.target.value as "full" | "half" })}
                        />
                    </Row>
                </>
            ) : null}
        </div>
    );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
    return (
        <div>
            <Label htmlFor={htmlFor} className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                {label}
            </Label>
            {children}
        </div>
    );
}
