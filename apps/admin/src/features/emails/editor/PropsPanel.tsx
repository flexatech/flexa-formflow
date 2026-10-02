import { useEffect, useRef, useState } from "react";
import { Copy, Eye, Trash2 } from "lucide-react";
import { ColorField } from "@/components/custom/ColorField";
import { ConditionsBuilder, toConditionSet, type ConditionSet, type SchemaContextField } from "@/components/custom/SchemaFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import { COMMON_FIELDS, elementDef, fieldVisible, isLayout, unknownTokens, type EmailElement, type TreeSettings } from "../types";
import { GlobalLayoutToggles } from "../layout/GlobalLayoutToggles";
import { DynamicDataBrowser } from "./DynamicDataBrowser";
import { FieldEditor } from "./FieldEditor";
import { useDynamicData } from "../useEmailTemplates";
import { parseLegacyMenu } from "../navigation";
import { Button } from "@/components/ui/button";
import type { TokenTarget } from "./tokenTarget";


interface PropsPanelProps {
    element: EmailElement | null;
    settings: TreeSettings;
    formId: number;
    /** The WooCommerce order the preview renders with, if any. */
    orderId?: number;
    conditionFields: SchemaContextField[];
    hasPreviewForm: boolean;
    onChangeProps: (id: string, props: Record<string, unknown>) => void;
    onChangeVisibility: (id: string, visibility: ConditionSet) => void;
    onChangeColumnCount: (id: string, count: number) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onChangeSettings: (settings: TreeSettings) => void;
    /** Replace a Text block holding a row of links with a Navigation block. */
    onConvertToNavigation?: (id: string) => void;
    /** Open an overridden global header/footer on the canvas. */
    onEditLayoutPart?: (part: "header" | "footer") => void;
}

export function PropsPanel({
    element,
    settings,
    formId,
    orderId = 0,
    conditionFields,
    hasPreviewForm,
    onChangeProps,
    onChangeVisibility,
    onChangeColumnCount,
    onDuplicate,
    onDelete,
    onChangeSettings,
    onEditLayoutPart,
    onConvertToNavigation,
}: PropsPanelProps) {
    // The last text field the user focused, so the Dynamic Data browser inserts
    // its token at the cursor there. Cleared when the selected block changes.
    const activeRef = useRef<TokenTarget | null>(null);
    const [hasActive, setHasActive] = useState(false);

    useEffect(() => {
        activeRef.current = null;
        setHasActive(false);
    }, [element?.id]);

    const registerActive = (target: TokenTarget) => {
        activeRef.current = target;
        setHasActive(true);
    };

    const insertToken = (token: string) => activeRef.current?.insert(token);

    const browser = (
        <DynamicDataBrowser formId={formId} orderId={orderId} canInsert={hasActive} onInsert={insertToken} />
    );

    if (!element) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-4">
                <h3 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Template design")}</h3>
                <DesignField label={__("Brand color")} value={settings.brandColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, brandColor: v })} />
                <DesignField label={__("Background")} value={settings.backgroundColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, backgroundColor: v })} />
                <DesignField label={__("Content background")} value={settings.contentBackground ?? ""} onChange={(v) => onChangeSettings({ ...settings, contentBackground: v })} />
                <DesignField label={__("Text color")} value={settings.textColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, textColor: v })} />
                <DesignField label={__("Title color")} value={settings.headingColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, headingColor: v })} />
                <DesignField label={__("Text link color")} value={settings.linkColor ?? ""} onChange={(v) => onChangeSettings({ ...settings, linkColor: v })} />
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label className="ff:block">{__("Direction")}</Label>
                    <Select
                        value={settings.direction ?? "ltr"}
                        options={[
                            { value: "ltr", label: __("Left to right (LTR)") },
                            { value: "rtl", label: __("Right to left (RTL)") },
                        ]}
                        onChange={(e) =>
                            onChangeSettings({
                                ...settings,
                                direction: e.target.value === "rtl" ? "rtl" : "ltr",
                            })
                        }
                    />
                </div>
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
                <GlobalLayoutToggles settings={settings} onChange={onChangeSettings} onEditPart={onEditLayoutPart} />
                {browser}
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
            {def.fields
                .filter((field) => fieldVisible(field, element.props, def.defaults))
                .map((field) => (
                    <FieldEditor
                        key={field.key}
                        field={field}
                        value={element.props[field.key] ?? def.defaults[field.key]}
                        onChange={(v) => setProp(field.key, v)}
                        onFocusField={registerActive}
                        props={element.props}
                        onPatch={(patch) => onChangeProps(element.id, { ...element.props, ...patch })}
                    />
                ))}
            {COMMON_FIELDS.map((field) => (
                <FieldEditor
                    key={field.key}
                    field={field}
                    value={element.props[field.key] ?? ""}
                    onChange={(v) => setProp(field.key, v)}
                    onFocusField={registerActive}
                />
            ))}
            {element.type === "text" && onConvertToNavigation && (
                <LegacyMenuNotice element={element} onConvert={() => onConvertToNavigation(element.id)} />
            )}
            <UnknownTokens props={element.props} formId={formId} />
            <VisibilitySection
                element={element}
                fields={conditionFields}
                hasPreviewForm={hasPreviewForm}
                onChange={(v) => onChangeVisibility(element.id, v)}
            />
            {browser}
        </div>
    );
}

/**
 * Conditional visibility for a single block. Rules key off the preview form's
 * fields and are evaluated against the entry at send time (see
 * src/Emails/Render/Visibility.php). No rules means the block always shows.
 */
function VisibilitySection({
    element,
    fields,
    hasPreviewForm,
    onChange,
}: {
    element: EmailElement;
    fields: SchemaContextField[];
    hasPreviewForm: boolean;
    onChange: (value: ConditionSet) => void;
}) {
    const value = toConditionSet(element.visibility);
    const active = value.rules.length > 0;

    return (
        <section className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50/60 ff:p-3">
            <div className="ff:flex ff:items-center ff:gap-2">
                <Eye aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-500" />
                <h4 className="ff:m-0 ff:text-xs ff:font-semibold ff:text-slate-700">{__("Visibility")}</h4>
                {active && (
                    <span className="ff:ml-auto ff:rounded-full ff:bg-brand-50 ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-medium ff:text-brand-700">
                        {__("Conditional")}
                    </span>
                )}
            </div>
            <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">
                {__("Show this block only when the submission matches. Leave empty to always show it.")}
            </p>
            {!hasPreviewForm && (
                <p className="ff:m-0 ff:text-[11px] ff:text-amber-700">
                    {__("Pick a preview form above to choose fields for conditions.")}
                </p>
            )}
            <ConditionsBuilder value={value} disabled={false} fields={fields} onChange={onChange} />
        </section>
    );
}

/**
 * Flags merge tags this email cannot fill (a typo, a deleted form field, an
 * order tag in a form email). The preview shows them as typed; a real send
 * leaves them empty, so they never reach a reader raw.
 */
function UnknownTokens({ props, formId }: { props: Record<string, unknown>; formId: number }) {
    const { data: categories } = useDynamicData(formId);
    if (!categories) return null;
    const known = new Set(categories.flatMap((c) => c.items.map((i) => i.token)));
    const unknown = unknownTokens(props, known);
    if (unknown.length === 0) return null;
    return (
        <p role="status" className="ff:m-0 ff:rounded-md ff:bg-amber-50 ff:px-2.5 ff:py-2 ff:text-[11px] ff:text-amber-800">
            {sprintf(__("Not available here, left empty when sent: %s"), unknown.join(", "))}
        </p>
    );
}

/**
 * Older menus were Text blocks of hand-written links. When this one parses as
 * a menu, offer to turn it into a Navigation block, but only after the user
 * confirms (and sees any link that cannot be kept). Nothing converts silently.
 */
function LegacyMenuNotice({ element, onConvert }: { element: EmailElement; onConvert: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const menu = typeof element.props.html === "string" ? parseLegacyMenu(element.props.html) : null;
    if (!menu) return null;

    return (
        <div className="ff:flex ff:flex-col ff:gap-2 ff:rounded-item ff:border ff:border-brand-200 ff:bg-brand-50 ff:p-3 ff:text-xs ff:text-slate-700">
            <p className="ff:m-0">
                {sprintf(__("This text is a row of %d links. Edit it more easily as a Navigation block."), menu.props.items.length)}
            </p>
            {confirming ? (
                <>
                    {menu.dropped.length > 0 && (
                        <p className="ff:m-0 ff:text-amber-800" role="alert">
                            {sprintf(__("These links have no usable URL and will be left out: %s"), menu.dropped.join(", "))}
                        </p>
                    )}
                    <div className="ff:flex ff:gap-2">
                        <Button size="sm" onClick={onConvert}>
                            {__("Convert")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                            {__("Cancel")}
                        </Button>
                    </div>
                    <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">{__("You can undo this.")}</p>
                </>
            ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                    {__("Convert to Navigation")}
                </Button>
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
