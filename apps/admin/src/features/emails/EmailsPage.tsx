import { Download, Plus, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { WooEmailsTab } from "@/features/woocommerce/WooCommercePage";
import { useCreateEmailTemplate, useEmailTemplatesList } from "./useEmailTemplates";
import { ImportTemplatesDialog } from "./ImportTemplatesDialog";
import { downloadTemplates } from "./templateTransfer";
import { LayoutCard } from "./layout/LayoutCard";
import { FormEmailsTab } from "./TemplatesListPage";

export type EmailsTab = "form" | "woocommerce";

/**
 * The Emails screen (PRODUCT_DESIGN.md section C). Woo email takeover is an
 * email concern, so it lives here as a second tab, shown only when WooCommerce
 * is active, rather than as its own top-level menu item.
 */
export function EmailsPage({ tab }: { tab: EmailsTab }) {
    const hasWoo = window.flexaFormFlow?.hasWooCommerce ?? false;
    const active: EmailsTab = tab === "woocommerce" && hasWoo ? "woocommerce" : "form";
    const createTemplate = useCreateEmailTemplate();
    const showToast = useUiStore((s) => s.showToast);
    const { data: templates = [] } = useEmailTemplatesList();
    const [importOpen, setImportOpen] = useState(false);

    const onCreate = () => {
        createTemplate.mutate(__("Untitled template"), {
            onSuccess: (template) => navigate(`/emails/${template.id}/edit`),
            onError: () => showToast(__("Could not create the template."), "error"),
        });
    };

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-start ff:justify-between ff:gap-4">
                <div>
                    <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Emails")}</h1>
                    <p className="ff:mt-1 ff:text-sm ff:text-slate-500">
                        {hasWoo
                            ? __("Design the emails your forms send, and take over your store's order emails.")
                            : __("Design the notification and confirmation emails your forms send.")}
                    </p>
                </div>
                <div className="ff:flex ff:shrink-0 ff:items-center ff:gap-2">
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                        <Upload aria-hidden className="ff:h-4 ff:w-4" />
                        {__("Import")}
                    </Button>
                    {templates.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => downloadTemplates(templates, "all")}
                            title={__("Download every template as one .json file")}
                        >
                            <Download aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Export all")}
                        </Button>
                    )}
                    {active === "form" && (
                        <Button onClick={onCreate} disabled={createTemplate.isPending}>
                            <Plus aria-hidden className="ff:h-4 ff:w-4" />
                            {__("New template")}
                        </Button>
                    )}
                </div>
            </div>

            <LayoutCard />

            {hasWoo && (
                <div className="ff:flex ff:gap-1 ff:border-b ff:border-slate-200">
                    <TabLink href="#/emails" active={active === "form"}>
                        {__("Form Emails")}
                    </TabLink>
                    <TabLink href="#/emails/woocommerce" active={active === "woocommerce"}>
                        {__("WooCommerce")}
                    </TabLink>
                </div>
            )}

            {active === "woocommerce" ? <WooEmailsTab /> : <FormEmailsTab />}

            <ImportTemplatesDialog open={importOpen} onClose={() => setImportOpen(false)} />
        </div>
    );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
    return (
        <a
            href={href}
            className={cn(
                "ff:-mb-px ff:cursor-pointer ff:border-b-2 ff:px-3 ff:py-2.5 ff:text-sm ff:font-medium ff:no-underline ff:transition-colors",
                active
                    ? "ff:border-brand-600 ff:text-brand-700"
                    : "ff:border-transparent ff:text-slate-500 ff:hover:text-slate-800",
            )}
        >
            {children}
        </a>
    );
}
