import {
    AlignLeft,
    AtSign,
    Calendar,
    CheckSquare,
    CircleDot,
    EyeOff,
    Hash,
    List,
    Type,
    type LucideIcon,
} from "lucide-react";
import { __ } from "@/lib/i18n";

/**
 * TS mirror of the form `config` JSON contract (see docs/M1_PLAN.md) and of
 * the PHP registry in Domain/Forms/FieldTypes.php. Add a field type in both
 * places or nowhere.
 */

export type FieldType =
    | "text"
    | "email"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "number"
    | "date"
    | "hidden";

/** Field width within the flex-wrap row. Adjacent fields flow into columns. */
export type FieldWidth = "full" | "half" | "third" | "two_thirds";

/** Tablet/mobile width; `inherit` keeps the width of the larger breakpoint. */
export type ResponsiveWidth = FieldWidth | "inherit";

/** Width choices for the inspector Select, in display order. */
export const WIDTH_OPTIONS: Array<{ value: FieldWidth; label: () => string }> = [
    { value: "full", label: () => __("Full width") },
    { value: "half", label: () => __("Half (1/2)") },
    { value: "third", label: () => __("Third (1/3)") },
    { value: "two_thirds", label: () => __("Two thirds (2/3)") },
];

/** Tablet/mobile width choices: the desktop set plus an inherit default. */
export const RESPONSIVE_WIDTH_OPTIONS: Array<{ value: ResponsiveWidth; label: () => string }> = [
    { value: "inherit", label: () => __("Inherit") },
    ...WIDTH_OPTIONS,
];

/** Short badge shown on a field card; empty for full width. */
export function widthLabel(width: FieldWidth): string {
    switch (width) {
        case "half":
            return __("1/2");
        case "third":
            return __("1/3");
        case "two_thirds":
            return __("2/3");
        default:
            return "";
    }
}

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    placeholder: string;
    options: string[];
    /** Desktop / base width. */
    width: FieldWidth;
    /** Width at tablet (<=1024px); `inherit` (default) keeps the desktop width. */
    widthTablet?: ResponsiveWidth;
    /** Width at mobile (<=640px); `inherit` (default) keeps the tablet/desktop width. */
    widthMobile?: ResponsiveWidth;
}

export interface FormConfig {
    fields: FormField[];
    settings: {
        submit_label: string;
        success_message: string;
    };
    notifications: {
        admin: { enabled: boolean; to: string; subject: string; template_id: number };
        confirmation: {
            enabled: boolean;
            email_field: string;
            subject: string;
            message: string;
            template_id: number;
        };
    };
}

export type FormStatus = "draft" | "published";

export interface FormDetail {
    id: number;
    uuid: string;
    title: string;
    status: FormStatus;
    config: FormConfig;
    created_at: string;
    updated_at: string;
}

export interface FormSummary extends FormDetail {
    entries_count: number;
}

export type EntryStatus = "unread" | "read";

export interface ActivityEvent {
    kind: string;
    type?: string;
    label: string;
    at: string;
}

export interface EntryRow {
    id: number;
    form_id: number;
    status: EntryStatus;
    data: Record<string, unknown>;
    meta: { user_agent?: string; referer?: string; activity?: ActivityEvent[] };
    created_at: string;
}

interface FieldTypeMeta {
    type: FieldType;
    icon: LucideIcon;
    hasOptions: boolean;
    label: () => string;
}

export const FIELD_TYPES: FieldTypeMeta[] = [
    { type: "text", icon: Type, hasOptions: false, label: () => __("Text") },
    { type: "email", icon: AtSign, hasOptions: false, label: () => __("Email") },
    { type: "textarea", icon: AlignLeft, hasOptions: false, label: () => __("Paragraph") },
    { type: "select", icon: List, hasOptions: true, label: () => __("Dropdown") },
    { type: "radio", icon: CircleDot, hasOptions: true, label: () => __("Radio choice") },
    { type: "checkbox", icon: CheckSquare, hasOptions: true, label: () => __("Checkboxes") },
    { type: "number", icon: Hash, hasOptions: false, label: () => __("Number") },
    { type: "date", icon: Calendar, hasOptions: false, label: () => __("Date") },
    { type: "hidden", icon: EyeOff, hasOptions: false, label: () => __("Hidden") },
];

export function fieldTypeMeta(type: FieldType): FieldTypeMeta {
    return FIELD_TYPES.find((meta) => meta.type === type) ?? FIELD_TYPES[0];
}

/** Stable for the field's lifetime; becomes the key in entry data. */
function generateFieldId(): string {
    return "f_" + Math.random().toString(36).slice(2, 8);
}

export function newField(type: FieldType): FormField {
    const meta = fieldTypeMeta(type);
    return {
        id: generateFieldId(),
        type,
        label: meta.label(),
        required: false,
        placeholder: "",
        options: meta.hasOptions ? [__("Option 1"), __("Option 2")] : [],
        width: "full",
        widthTablet: "inherit",
        widthMobile: "inherit",
    };
}
