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

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    placeholder: string;
    options: string[];
    width: "full" | "half";
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

export interface EntryRow {
    id: number;
    form_id: number;
    status: EntryStatus;
    data: Record<string, unknown>;
    meta: { user_agent?: string; referer?: string };
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
    };
}
