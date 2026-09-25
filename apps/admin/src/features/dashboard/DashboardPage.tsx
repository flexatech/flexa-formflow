import { FileText, Inbox, Mail, Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";

const STATS = [
    { key: "forms", icon: FileText },
    { key: "entries", icon: Inbox },
    { key: "emails", icon: Mail },
    { key: "workflows", icon: Workflow },
] as const;

function statLabel(key: (typeof STATS)[number]["key"]): string {
    switch (key) {
        case "forms":
            return __("Forms");
        case "entries":
            return __("Entries");
        case "emails":
            return __("Emails sent");
        case "workflows":
            return __("Active workflows");
    }
}

export function DashboardPage() {
    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Dashboard")}</h1>
            </div>

            <div className="ff:grid ff:grid-cols-2 ff:gap-4 ff:lg:grid-cols-4">
                {STATS.map(({ key, icon: Icon }) => (
                    <div
                        key={key}
                        className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5"
                    >
                        <div className="ff:flex ff:items-center ff:gap-2 ff:text-slate-500">
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            <span className="ff:text-xs ff:font-medium ff:uppercase ff:tracking-wide">
                                {statLabel(key)}
                            </span>
                        </div>
                        <span className="ff:text-3xl ff:font-semibold ff:text-slate-900">0</span>
                    </div>
                ))}
            </div>

            <div className="ff:grid ff:gap-4 ff:lg:grid-cols-[2fr_1fr]">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Recent activity")}</h2>
                    <p className="ff:text-sm ff:text-slate-500">
                        {__("Submissions, sent emails, and workflow runs will show up here.")}
                    </p>
                </div>
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Quick actions")}</h2>
                    <div className="ff:flex ff:flex-col ff:gap-2">
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/forms">
                                <Plus aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Create Form")}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/emails">
                                <Mail aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Design Email")}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/workflows">
                                <Workflow aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Build Workflow")}
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
