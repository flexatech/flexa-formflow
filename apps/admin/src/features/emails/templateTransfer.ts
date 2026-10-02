import { api } from "@/lib/api";
import type { EmailElement, EmailTree } from "./types";

/**
 * The JSON file email templates move between sites in. Export is built here
 * from trees the app already has; import goes through POST
 * /email-templates/import, which checks and sanitizes it
 * (src/Api/EmailTemplateImportEndpoint.php). Bump `schema` only on a breaking
 * change to this shape.
 */
export const TEMPLATE_FILE_FORMAT = "flexa-formflow/email-templates";

export interface TemplateFile {
    format: typeof TEMPLATE_FILE_FORMAT;
    schema: 1;
    plugin: string;
    exportedAt: string;
    /** Plugins the templates need to render fully. */
    requires: string[];
    items: Array<{ title: string; tree: EmailTree }>;
}

const WOO_BLOCKS = ["order_details", "order_address"];

function allBlocks(elements: EmailElement[]): EmailElement[] {
    return elements.flatMap((el) => [el, ...(el.columns ?? []).flat()]);
}

export function buildTemplateFile(templates: Array<{ title: string; tree: EmailTree }>): TemplateFile {
    const needsWoo = templates.some((t) => allBlocks(t.tree.elements).some((el) => WOO_BLOCKS.includes(el.type)));
    return {
        format: TEMPLATE_FILE_FORMAT,
        schema: 1,
        plugin: window.flexaFormFlow?.version ?? "",
        exportedAt: new Date().toISOString(),
        requires: needsWoo ? ["woocommerce"] : [],
        items: templates.map((t) => ({ title: t.title, tree: t.tree })),
    };
}

/** Save the templates as a .json file through the browser's download. */
export function downloadTemplates(templates: Array<{ title: string; tree: EmailTree }>, name: string): void {
    const file = buildTemplateFile(templates);
    const slug =
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "templates";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `flexa-email-${slug}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportCheck {
    items: Array<{ title: string; blocks: number }>;
    warnings: string[];
}

export interface ImportResult {
    created: Array<{ id: number; title: string }>;
    warnings: string[];
}

export function checkImport(file: unknown): Promise<ImportCheck> {
    return api.post<ImportCheck>("/email-templates/import", { file: file as Record<string, unknown>, dry_run: true });
}

export function runImport(file: unknown): Promise<ImportResult> {
    return api.post<ImportResult>("/email-templates/import", { file: file as Record<string, unknown> });
}
