import { ColorField } from "@/components/custom/ColorField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@/lib/i18n";
import type { FieldSpec } from "../types";

/** One editable property of a block, rendered from its field spec. */
export function FieldEditor({
    field,
    value,
    onChange,
    onFocusField,
}: {
    field: FieldSpec;
    value: unknown;
    onChange: (value: unknown) => void;
    onFocusField: (el: HTMLInputElement | HTMLTextAreaElement, onChange: (value: string) => void) => void;
}) {
    const str = typeof value === "string" ? value : value == null ? "" : String(value);

    if (field.type === "switch") {
        return (
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-3">
                <div className="ff:flex ff:flex-col">
                    <Label className="ff:m-0">{field.label}</Label>
                    {field.help && <span className="ff:text-[11px] ff:text-slate-400">{field.help}</span>}
                </div>
                <Switch checked={value === true} onCheckedChange={(next) => onChange(next)} aria-label={field.label} />
            </div>
        );
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <Label className="ff:block">{field.label}</Label>
            {field.type === "textarea" && (
                <Textarea
                    value={str}
                    rows={4}
                    placeholder={field.placeholder}
                    onFocus={(e) => onFocusField(e.currentTarget, onChange)}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
            {(field.type === "text" || field.type === "url") && (
                <Input
                    value={str}
                    placeholder={field.placeholder}
                    onFocus={(e) => onFocusField(e.currentTarget, onChange)}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
            {field.type === "number" && (
                <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={typeof value === "number" ? value : str}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
            )}
            {field.type === "color" && (
                <ColorField value={str} placeholder={__("inherit")} onChange={onChange} />
            )}
            {field.type === "select" && (
                <Select value={str} options={field.options ?? []} onChange={(e) => onChange(e.target.value)} />
            )}
        </div>
    );
}
