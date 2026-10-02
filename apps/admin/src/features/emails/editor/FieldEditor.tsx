import { ImagePlus, X } from "lucide-react";
import { ColorField } from "@/components/custom/ColorField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@/lib/i18n";
import { canUseMediaLibrary, openMediaPicker } from "@/lib/media";
import { useUiStore } from "@/lib/store";
import type { FieldSpec } from "../types";
import type { NavigationItem } from "../navigation";
import { NavigationItemsEditor } from "./NavigationItemsEditor";
import { RichTextField } from "./RichTextField";
import { inputTarget, type TokenTarget } from "./tokenTarget";

/** One editable property of a block, rendered from its field spec. */
export function FieldEditor({
    field,
    value,
    onChange,
    onFocusField,
    props,
    onPatch,
}: {
    field: FieldSpec;
    value: unknown;
    onChange: (value: unknown) => void;
    /** The field the Dynamic Data browser should insert into next. */
    onFocusField: (target: TokenTarget) => void;
    /** The block's current props; `image` fields read their alt text from here. */
    props?: Record<string, unknown>;
    /** Change several props in one step (an image and its alt text). */
    onPatch?: (patch: Record<string, unknown>) => void;
}) {
    const str = typeof value === "string" ? value : value == null ? "" : String(value);

    if (field.type === "image") {
        return (
            <ImageField
                field={field}
                value={str}
                onChange={onChange}
                onFocusField={onFocusField}
                alt={field.altKey ? String(props?.[field.altKey] ?? "") : ""}
                onPatch={onPatch ?? ((patch) => onChange(patch[field.key]))}
            />
        );
    }

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

    if (field.type === "navitems") {
        return (
            <NavigationItemsEditor
                items={Array.isArray(value) ? (value as NavigationItem[]) : []}
                onChange={onChange}
                onFocusField={onFocusField}
            />
        );
    }

    if (field.type === "richtext") {
        return (
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <Label className="ff:block">{field.label}</Label>
                <RichTextField
                    label={field.label}
                    value={str}
                    placeholder={field.placeholder}
                    onChange={onChange}
                    onFocusField={onFocusField}
                />
                {field.help && <span className="ff:text-[11px] ff:text-slate-400">{field.help}</span>}
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
                    onFocus={(e) => onFocusField(inputTarget(e.currentTarget, onChange))}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
            {(field.type === "text" || field.type === "url") && (
                <Input
                    value={str}
                    placeholder={field.placeholder}
                    onFocus={(e) => onFocusField(inputTarget(e.currentTarget, onChange))}
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
            {field.help && <span className="ff:text-[11px] ff:text-slate-400">{field.help}</span>}
        </div>
    );
}

/**
 * An image prop: pick or upload from the Media Library, or paste any URL. A
 * picked image also fills the block's alt text while that is still empty.
 */
function ImageField({
    field,
    value,
    alt,
    onChange,
    onPatch,
    onFocusField,
}: {
    field: FieldSpec;
    value: string;
    alt: string;
    onChange: (value: unknown) => void;
    onPatch: (patch: Record<string, unknown>) => void;
    onFocusField: (target: TokenTarget) => void;
}) {
    const showToast = useUiStore((s) => s.showToast);
    const hasLibrary = canUseMediaLibrary();

    const choose = () => {
        const opened = openMediaPicker({
            title: __("Choose an image"),
            buttonText: __("Use this image"),
            onSelect: (image) => {
                const patch: Record<string, unknown> = { [field.key]: image.url };
                if (field.altKey && alt.trim() === "" && image.alt !== "") {
                    patch[field.altKey] = image.alt;
                }
                onPatch(patch);
                if (image.mime === "image/svg+xml") {
                    showToast(__("Many email apps (Gmail, Outlook) do not show SVG images. Use PNG or JPG instead."), "error");
                }
            },
        });
        if (!opened) showToast(__("The Media Library is not available on this page."), "error");
    };

    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <Label className="ff:block">{field.label}</Label>
            {value !== "" && (
                <div className="ff:relative ff:flex ff:items-center ff:justify-center ff:overflow-hidden ff:rounded-md ff:border ff:border-slate-200 ff:bg-slate-50 ff:p-2">
                    <img src={value} alt="" className="ff:max-h-28 ff:max-w-full ff:object-contain" />
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        aria-label={__("Remove image")}
                        title={__("Remove image")}
                        className="ff:absolute ff:right-1 ff:top-1 ff:cursor-pointer ff:rounded ff:border-0 ff:bg-white/90 ff:p-1 ff:text-slate-500 ff:shadow-sm ff:hover:text-red-600"
                    >
                        <X aria-hidden className="ff:h-3.5 ff:w-3.5" />
                    </button>
                </div>
            )}
            {hasLibrary && (
                <Button type="button" variant="outline" size="sm" onClick={choose}>
                    <ImagePlus aria-hidden className="ff:h-4 ff:w-4" />
                    {value === "" ? __("Choose image") : __("Replace image")}
                </Button>
            )}
            <Input
                value={value}
                placeholder={field.placeholder ?? "https://"}
                aria-label={__("Image URL")}
                onFocus={(e) => onFocusField(inputTarget(e.currentTarget, (v) => onChange(v)))}
                onChange={(e) => onChange(e.target.value)}
            />
            <span className="ff:text-[11px] ff:text-slate-400">
                {hasLibrary ? __("Or paste an image URL from anywhere.") : __("Paste an image URL.")}
            </span>
        </div>
    );
}
