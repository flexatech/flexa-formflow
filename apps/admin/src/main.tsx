import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
    FileText,
    Inbox,
    LayoutDashboard,
    Mail,
    Plug,
    Settings,
    Workflow,
    Zap,
} from "lucide-react";
import { AppProviders } from "@/app/providers";
import { Toaster } from "@/components/Toaster";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import {
    EmailsPage,
    EntriesPage,
    FormsPage,
    IntegrationsPage,
    WorkflowsPage,
} from "@/features/placeholders/pages";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import "./styles/index.css";

type RouteName =
    | "dashboard"
    | "forms"
    | "entries"
    | "emails"
    | "workflows"
    | "integrations"
    | "settings";

const ROUTES: RouteName[] = [
    "dashboard",
    "forms",
    "entries",
    "emails",
    "workflows",
    "integrations",
    "settings",
];

function parseHash(): RouteName {
    const hash = window.location.hash.replace(/^#\/?/, "").split("/")[0];
    return (ROUTES as string[]).includes(hash) ? (hash as RouteName) : "dashboard";
}

export function navigate(path: string): void {
    window.location.hash = path;
}

const NAV: Array<{ route: RouteName; icon: typeof LayoutDashboard; label: () => string }> = [
    { route: "dashboard", icon: LayoutDashboard, label: () => __("Dashboard") },
    { route: "forms", icon: FileText, label: () => __("Forms") },
    { route: "entries", icon: Inbox, label: () => __("Entries") },
    { route: "emails", icon: Mail, label: () => __("Emails") },
    { route: "workflows", icon: Workflow, label: () => __("Workflows") },
    { route: "integrations", icon: Plug, label: () => __("Integrations") },
    { route: "settings", icon: Settings, label: () => __("Settings") },
];

function App() {
    const [route, setRoute] = useState<RouteName>(parseHash);

    useEffect(() => {
        const onChange = () => setRoute(parseHash());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);

    return (
        <div className="ff:flex ff:min-h-screen ff:bg-slate-50">
            <aside className="ff:sticky ff:top-8 ff:flex ff:h-[calc(100vh-2rem)] ff:w-56 ff:shrink-0 ff:flex-col ff:border-r ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:px-4 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:items-center ff:justify-center ff:rounded-xl ff:bg-gradient-to-br ff:from-brand-500 ff:to-brand-700 ff:text-white ff:shadow-sm">
                        <Zap aria-hidden className="ff:h-4.5 ff:w-4.5" />
                    </div>
                    <div className="ff:flex ff:flex-col">
                        <span className="ff:text-sm ff:font-semibold ff:leading-tight ff:text-slate-900">
                            FormFlow
                        </span>
                        <span className="ff:text-[11px] ff:leading-tight ff:text-slate-400">
                            v{window.flexaFormFlow?.version ?? ""}
                        </span>
                    </div>
                </div>
                <nav className="ff:flex ff:flex-1 ff:flex-col ff:gap-0.5 ff:px-2 ff:py-2">
                    {NAV.map(({ route: r, icon: Icon, label }) => (
                        <NavLink key={r} href={`#/${r}`} active={route === r}>
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            {label()}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <main className="ff:min-w-0 ff:flex-1">
                {route === "dashboard" && <DashboardPage />}
                {route === "forms" && <FormsPage />}
                {route === "entries" && <EntriesPage />}
                {route === "emails" && <EmailsPage />}
                {route === "workflows" && <WorkflowsPage />}
                {route === "integrations" && <IntegrationsPage />}
                {route === "settings" && <SettingsPage />}
            </main>
            <Toaster />
        </div>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
    return (
        <a
            href={href}
            className={cn(
                "ff:flex ff:items-center ff:gap-2.5 ff:rounded-lg ff:px-3 ff:py-2 ff:text-sm ff:font-medium ff:no-underline ff:transition-colors",
                active
                    ? "ff:bg-brand-50 ff:text-brand-700"
                    : "ff:text-slate-600 ff:hover:bg-slate-100 ff:hover:text-slate-900",
            )}
        >
            {children}
        </a>
    );
}

const rootEl = document.getElementById("flexa-formflow-admin-root");
if (rootEl) {
    createRoot(rootEl).render(
        <StrictMode>
            <AppProviders>
                <App />
            </AppProviders>
        </StrictMode>,
    );
}
