import { Copy, Trash2 } from "lucide-react";
import { ColorField } from "@/components/custom/ColorField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { __, sprintf } from "@/lib/i18n";
import { GLOBAL_TOKENS, elementDef, isLayout, type EmailElement, type FieldSpec, type TreeSettings } from "../types";

interface TokenInfo {
    token: string;
    label: string;
}

interface PropsPanelProps {
    element: EmailElement | null;
    settings: TreeSettings;
    fieldTokens: TokenInfo[];
    onChangeProps: (id: string, props: Record<string, unknown>) => void;
    onChangeColumnCount: (id: string, count: number) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onChangeSettings: (settings: TreeSettings) => void;
}

export function PropsPanel({
    element,
    settings,
    fieldTokens,
    onChangeProps,
    onChangeColumnCount,
    onDuplicate,
    onDelete,
    onChangeSettings,
}: PropsPanelProps) {
    if (!element) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-4">
                <h3 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Template design")}</h3>
                <DesignField label={__("Brand color")} value={settings.brandColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, brandColor: v })} />
                <DesignField label={__("Background")} value={settings.backgroundColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, backgroundColor: v })} />
                <DesignField label={__("Content background")} value={settings.contentBackground ?? ""} onChange={(v) => onChangeSettings({ ...settings, contentBackground: v })} />
                <DesignField label={__("Text color")} value={settings.textColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, textColor: v })} />
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label className="ff:block">{__("Content width (px)")}</Label>
                    <Input
                        type="number"
                        min={320}
                        max={800}
                        value={settings.width ?? ""}
                        placeholder={__("Global default")}
                        onChange={(e) =>
                            onChangeSettings({
                                ...settings,
                                width: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                        }
                    />
                </div>
                <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                    {__("Empty fields inherit the global design tokens from Settings.")}
                </p>
                <TokenHint fieldTokens={fieldTokens} />
            </div>
        );
    }

    const def = elementDef(element.type);
    if (!def) {
        return <p className="ff:text-sm ff:text-slate-500">{__("Unknown block.")}</p>;
    }

    const setProp = (key: string, value: unknown) =>
        onChangeProps(element.id, { ...element.props, [key]: value });

    const columnCount = element.columns?.length ?? 2;
    const valign = Array.isArray(element.props.valign) ? (element.props.valign as string[]) : [];
    const setValign = (i: number, value: string) => {
        const next = Array.from({ length: columnCount }, (_, idx) => valign[idx] ?? "top");
        next[i] = value;
        onChangeProps(element.id, { ...element.props, valign: next });
    };
    const valignOptions = [
        { value: "top", label: __("Top") },
        { value: "middle", label: __("Middle") },
        { value: "bottom", label: __("Bottom") },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-2">
                <h3 className="ff:text-sm ff:font-semibold ff:text-slate-900">{def.label}</h3>
                <div className="ff:flex ff:items-center ff:gap-1">
                    <button
                        type="button"
                        onClick={() => onDuplicate(element.id)}
                        title={__("Duplicate")}
                        className="ff:cursor-pointer ff:rounded ff:border-0 ff:bg-transparent ff:p-1 ff:text-slate-400 ff:hover:text-slate-700"
                    >
                        <Copy className="ff:h-4 ff:w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(element.id)}
                        title={__("Delete")}
                        className="ff:cursor-pointer ff:rounded ff:border-0 ff:bg-transparent ff:p-1 ff:text-slate-400 ff:hover:text-red-600"
                    >
                        <Trash2 className="ff:h-4 ff:w-4" />
                    </button>
                </div>
            </div>
            {isLayout(element.type) && (
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label className="ff:block">{__("Number of columns")}</Label>
                    <Select
                        value={String(columnCount)}
                        options={[
                            { value: "2", label: __("2 columns") },
                            { value: "3", label: __("3 columns") },
                        ]}
                        onChange={(e) => onChangeColumnCount(element.id, Number(e.target.value))}
                    />
                </div>
            )}
            {isLayout(element.type) && (
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label className="ff:block">{__("Vertical alignment per column")}</Label>
                    <div className="ff:flex ff:flex-col ff:gap-2">
                        {Array.from({ length: columnCount }, (_, i) => (
                            <div key={i} className="ff:flex ff:items-center ff:gap-2">
                                <span className="ff:w-16 ff:shrink-0 ff:text-xs ff:text-slate-500">
                                    {sprintf(__("Column %d"), i + 1)}
                                </span>
                                <Select
                                    value={valign[i] ?? "top"}
                                    options={valignOptions}
                                    onChange={(e) => setValign(i, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {def.fields.map((field) => (
                <FieldEditor
                    key={field.key}
                    field={field}
                    value={element.props[field.key]}
                    onChange={(v) => setProp(field.key, v)}
                />
            ))}
            <TokenHint fieldTokens={fieldTokens} />
        </div>
    );
}

function FieldEditor({
    field,
    value,
    onChange,
}: {
    field: FieldSpec;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    const str = typeof value === "string" ? value : value == null ? "" : String(value);

    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <Label className="ff:block">{field.label}</Label>
            {field.type === "textarea" && (
                <Textarea
                    value={str}
                    rows={4}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
            {(field.type === "text" || field.type === "url") && (
                <Input value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
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

function DesignField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <Label className="ff:block">{label}</Label>
            <ColorField value={value} placeholder={__("inherit")} onChange={onChange} />
        </div>
    );
}

function TokenHint({ fieldTokens }: { fieldTokens: TokenInfo[] }) {
    const tokens = [...GLOBAL_TOKENS, ...fieldTokens];
    return (
        <details className="ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:p-2">
            <summary className="ff:cursor-pointer ff:text-xs ff:font-medium ff:text-slate-600">
                {__("Available tokens")}
            </summary>
            <ul className="ff:m-0 ff:mt-2 ff:flex ff:list-none ff:flex-col ff:gap-1 ff:p-0">
                {tokens.map((t) => (
                    <li key={t.token} className="ff:flex ff:items-center ff:justify-between ff:gap-2 ff:text-xs">
                        <code className="ff:rounded ff:bg-slate-100 ff:px-1 ff:py-0.5">{t.token}</code>
                        <span className="ff:truncate ff:text-slate-500">{t.label}</span>
                    </li>
                ))}
            </ul>
        </details>
    );
}
