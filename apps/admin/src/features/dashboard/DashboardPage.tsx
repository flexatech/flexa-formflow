import { CalendarClock, FileText, Inbox, MailWarning, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useEntriesList } from "@/features/entries/useEntries";
import { entryExcerpt } from "@/features/entries/EntryFields";
import { useFormsList } from "@/features/forms/useForms";
import { formatDate } from "@/features/forms/FormsListPage";
import { useStats } from "./useStats";

export function DashboardPage() {
    const { data: stats } = useStats();
    const { data: recent } = useEntriesList({ per_page: 5 });
    const { data: formsData } = useFormsList({ per_page: 100 });
    const formById = new Map((formsData?.items ?? []).map((f) => [f.id, f]));

    const cards = [
        { label: __("Forms"), icon: FileText, value: stats?.forms },
        { label: __("Entries"), icon: Inbox, value: stats?.entries },
        { label: __("Unread"), icon: MailWarning, value: stats?.unread },
        { label: __("Last 7 days"), icon: CalendarClock, value: stats?.entries_last_7_days },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Dashboard")}</h1>
            </div>

            <div className="ff:grid ff:grid-cols-2 ff:gap-4 ff:lg:grid-cols-4">
                {cards.map(({ label, icon: Icon, value }) => (
                    <div
                        key={label}
                        className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5"
                    >
                        <div className="ff:flex ff:items-center ff:gap-2 ff:text-slate-500">
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            <span className="ff:text-xs ff:font-medium ff:uppercase ff:tracking-wide">{label}</span>
                        </div>
                        <span
                            className={cn(
                                "ff:text-3xl ff:font-semibold ff:tabular-nums ff:text-slate-900",
                                value === undefined && "ff:animate-pulse ff:text-slate-300",
                            )}
                        >
                            {value ?? "–"}
                        </span>
                    </div>
                ))}
            </div>

            <div className="ff:grid ff:gap-4 ff:lg:grid-cols-[2fr_1fr]">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Recent entries")}</h2>
                    {!recent || recent.items.length === 0 ? (
                        <p className="ff:text-sm ff:text-slate-500">
                            {__("Submissions will show up here once a published form is shared.")}
                        </p>
                    ) : (
                        <ul className="ff:flex ff:flex-col">
                            {recent.items.map((entry) => (
                                <li key={entry.id}>
                                    <a
                                        href={`#/entries/${entry.id}`}
                                        className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:rounded-lg ff:px-2 ff:py-2 ff:no-underline ff:transition-colors ff:hover:bg-slate-50"
                                    >
                                        <span className="ff:flex ff:min-w-0 ff:items-center ff:gap-2">
                                            {entry.status === "unread" ? (
                                                <span className="ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ff:bg-brand-600" />
                                            ) : (
                                                <span className="ff:h-2 ff:w-2 ff:shrink-0" />
                                            )}
                                            <span
                                                className={cn(
                                                    "ff:truncate ff:text-sm ff:text-slate-800",
                                                    entry.status === "unread" && "ff:font-semibold",
                                                )}
                                            >
                                                {entryExcerpt(entry, formById.get(entry.form_id))}
                                            </span>
                                        </span>
                                        <span className="ff:shrink-0 ff:text-xs ff:text-slate-400">
                                            {formatDate(entry.created_at)}
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="ff:flex ff:h-fit ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Quick actions")}</h2>
                    <div className="ff:flex ff:flex-col ff:gap-2">
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/forms">
                                <Plus aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Create Form")}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/entries">
                                <Inbox aria-hidden className="ff:h-4 ff:w-4" />
                                {__("View entries")}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="ff:justify-start">
                            <a href="#/settings">
                                <Settings aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Open settings")}
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
