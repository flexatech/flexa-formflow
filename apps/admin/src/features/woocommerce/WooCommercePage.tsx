import { Eye, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/custom/EmptyState";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import {
    useSaveWooEmail,
    useWooEmailPreview,
    useWooEmails,
    type TokenHint,
    type WooEmailRow,
    type WooTemplateOption,
} from "./useWooEmails";

/**
 * The "WooCommerce" tab body of the Emails screen: take over WooCommerce order
 * emails and design them with the FormFlow builder. Rendered only when the
 * WooCommerce tab is active (EmailsPage gates it on Woo being present).
 */
export function WooEmailsTab() {
    const { data, isLoading } = useWooEmails();
    const [preview, setPreview] = useState<{ title: string; html: string } | null>(null);

    if (isLoading || !data) {
        return <div className="ff:h-64 ff:animate-pulse ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white" />;
    }

    if (!data.hasWooCommerce) {
        return (
            <EmptyState
                icon={ShoppingCart}
                title={__("WooCommerce is not active")}
                description={__(
                    "Install and activate WooCommerce to design its order emails with the FormFlow builder. FormFlow keeps working without it.",
                )}
            />
        );
    }

    return (
        <>
            <TokensHint tokens={data.tokens} />
            <div className="ff:flex ff:flex-col ff:gap-3">
                {data.emails.map((email) => (
                    <EmailCard
                        key={email.id}
                        email={email}
                        templates={data.templates}
                        onPreview={(title, html) => setPreview({ title, html })}
                    />
                ))}
            </div>

            <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
                <DialogContent className="ff:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{preview?.title ?? __("Preview")}</DialogTitle>
                        <DialogDescription>
                            {__("Rendered with your most recent order, or sample data if there are no orders yet.")}
                        </DialogDescription>
                    </DialogHeader>
                    <iframe
                        title={__("Email preview")}
                        srcDoc={preview?.html ?? ""}
                        className="ff:h-[60vh] ff:w-full ff:rounded-md ff:border ff:border-slate-200 ff:bg-white"
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

function TokensHint({ tokens }: { tokens: TokenHint[] }) {
    if (tokens.length === 0) {
        return null;
    }
    return (
        <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-4 ff:py-3">
            <p className="ff:mb-1 ff:text-xs ff:font-medium ff:text-slate-500">
                {__("Order tokens you can drop into any assigned template or subject line:")}
            </p>
            <div className="ff:flex ff:flex-wrap ff:gap-1.5">
                {tokens.map((t) => (
                    <code
                        key={t.token}
                        title={t.label}
                        className="ff:rounded ff:bg-white ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:text-slate-600 ff:ring-1 ff:ring-slate-200"
                    >
                        {t.token}
                    </code>
                ))}
            </div>
        </div>
    );
}

function EmailCard({
    email,
    templates,
    onPreview,
}: {
    email: WooEmailRow;
    templates: WooTemplateOption[];
    onPreview: (title: string, html: string) => void;
}) {
    const save = useSaveWooEmail(email.id);
    const preview = useWooEmailPreview();
    const showToast = useUiStore((s) => s.showToast);

    const templateOptions = [
        { value: "0", label: __("Default design") },
        ...templates.map((t) => ({ value: String(t.id), label: t.title })),
    ];

    const onPreviewClick = () => {
        preview.mutate(email.id, {
            onSuccess: (html) => onPreview(email.title, html),
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Could not render the preview."), "error"),
        });
    };

    const patch = (fields: Parameters<typeof save.mutate>[0]) => {
        save.mutate(fields, {
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
        });
    };

    return (
        <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
            <div className="ff:flex ff:items-start ff:gap-3 ff:px-5 ff:py-4">
                <div className="ff:min-w-0 ff:flex-1">
                    <div className="ff:flex ff:items-center ff:gap-2">
                        <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{email.title}</h2>
                        <span className="ff:rounded ff:bg-slate-100 ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:text-slate-500">
                            {email.recipient === "admin" ? __("Admin") : __("Customer")}
                        </span>
                    </div>
                    <p className="ff:mt-0.5 ff:text-xs ff:text-slate-500">{email.description}</p>
                </div>
                <Switch
                    checked={email.enabled}
                    onCheckedChange={(next) => patch({ enabled: next })}
                    aria-label={__("Take over this email")}
                />
            </div>

            {email.enabled ? (
                <div className="ff:flex ff:flex-col ff:gap-3 ff:border-t ff:border-slate-100 ff:bg-slate-50/60 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:flex-col ff:gap-1.5">
                        <label className="ff:text-xs ff:font-medium ff:text-slate-600">
                            {__("Subject line")}
                        </label>
                        <Input
                            defaultValue={email.subject}
                            placeholder={__("Leave blank to keep the WooCommerce default")}
                            onBlur={(e) => {
                                if (e.target.value !== email.subject) {
                                    patch({ subject: e.target.value });
                                }
                            }}
                            spellCheck={false}
                        />
                    </div>
                    <div className="ff:flex ff:items-end ff:gap-3">
                        <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-1.5">
                            <label className="ff:text-xs ff:font-medium ff:text-slate-600">
                                {__("Template")}
                            </label>
                            <Select
                                options={templateOptions}
                                value={String(email.templateId)}
                                onChange={(e) => patch({ template_id: parseInt(e.target.value, 10) })}
                            />
                        </div>
                        <Button variant="outline" onClick={onPreviewClick} disabled={preview.isPending}>
                            <Eye aria-hidden className="ff:h-4 ff:w-4" />
                            {preview.isPending ? __("Rendering…") : __("Preview")}
                        </Button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
