import { Mail, Plug, Workflow } from "lucide-react";
import { EmptyState } from "@/components/custom/EmptyState";
import { __ } from "@/lib/i18n";

/**
 * Placeholder pages for sections whose builders are not implemented yet.
 * Hidden behind SHOW_UPCOMING in main.tsx (WP.org gate: never advertise a
 * section that does not work). Forms and Entries got real pages in M1.
 */

function PageFrame({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{title}</h1>
            {children}
        </div>
    );
}

export function EmailsPage() {
    return (
        <PageFrame title={__("Emails")}>
            <EmptyState
                icon={Mail}
                title={__("Design emails once")}
                description={__("Your form data fills them in automatically. WooCommerce order emails are designed in the same builder.")}
                caption={__("The email builder ships in an upcoming release.")}
            />
        </PageFrame>
    );
}

export function WorkflowsPage() {
    return (
        <PageFrame title={__("Workflows")}>
            <EmptyState
                icon={Workflow}
                title={__("Decide what happens after Send")}
                description={__("Connect forms, emails, and integrations on a visual canvas with conditions and branches.")}
                caption={__("The workflow builder ships in an upcoming release.")}
            />
        </PageFrame>
    );
}

export function IntegrationsPage() {
    return (
        <PageFrame title={__("Integrations")}>
            <EmptyState
                icon={Plug}
                title={__("Send your data where your team works")}
                description={__("CRM, email marketing, messaging, and webhooks connect here. Delivery stays with your mail bridge plugin.")}
                caption={__("Integrations ship in an upcoming release.")}
            />
        </PageFrame>
    );
}
