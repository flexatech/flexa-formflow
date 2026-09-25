import { FileText, Inbox, Mail, Plug, Workflow } from "lucide-react";
import { EmptyState } from "@/components/custom/EmptyState";
import { __ } from "@/lib/i18n";

/**
 * Placeholder pages for the sections whose builders are not implemented yet.
 * Each renders the designed empty state (DESIGN.md Part 5.22) so the shell
 * demonstrates the final information architecture from day one.
 */

function PageFrame({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{title}</h1>
            {children}
        </div>
    );
}

export function FormsPage() {
    return (
        <PageFrame title={__("Forms")}>
            <EmptyState
                icon={FileText}
                title={__("Every flow starts with a form")}
                description={__("Build one in about two minutes. Its fields become data you can use in emails and workflows.")}
                caption={__("The form builder ships in an upcoming release.")}
            />
        </PageFrame>
    );
}

export function EntriesPage() {
    return (
        <PageFrame title={__("Entries")}>
            <EmptyState
                icon={Inbox}
                title={__("Submissions will land here")}
                description={__("Share or embed a form to start collecting entries, each with a full activity timeline.")}
                caption={__("Entries arrive once the form builder ships.")}
            />
        </PageFrame>
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
