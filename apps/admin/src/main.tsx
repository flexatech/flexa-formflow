import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bolt, MailOpen, Mails } from "lucide-react";
import { AppProviders } from "@/app/providers";
import { Toaster } from "@/components/Toaster";
import { EmailsPage } from "@/features/emails/EmailsPage";
import { EditorPage } from "@/features/editor/EditorPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import "./styles/index.css";

type Route =
    | { name: "emails" }
    | { name: "editor"; emailId: string }
    | { name: "settings" };

function parseHash(): Route {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("edit/")) {
        return { name: "editor", emailId: hash.slice(5) };
    }
    if (hash === "settings") {
        return { name: "settings" };
    }
    return { name: "emails" };
}

export function navigate(path: string): void {
    window.location.hash = path;
}

function App() {
    const [route, setRoute] = useState<Route>(parseHash);

    useEffect(() => {
        const onChange = () => setRoute(parseHash());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);

    const isEditor = route.name === "editor";

    return (
        <div className={cn("ff:min-h-screen ff:bg-slate-50", isEditor && "ff:flex ff:flex-col")}>
            {!isEditor && (
                <header className="ff:sticky ff:top-8 ff:z-40 ff:flex ff:items-center ff:justify-between ff:border-b ff:border-slate-200/80 ff:bg-white/90 ff:px-6 ff:py-3 ff:backdrop-blur">
                    <div className="ff:flex ff:items-center ff:gap-3">
                        <div className="ff:flex ff:h-9 ff:w-9 ff:items-center ff:justify-center ff:rounded-xl ff:bg-gradient-to-br ff:from-brand-500 ff:to-brand-700 ff:text-white ff:shadow-sm">
                            <MailOpen className="ff:h-4.5 ff:w-4.5" aria-hidden />
                        </div>
                        <div className="ff:flex ff:flex-col">
                            <span className="ff:text-sm ff:font-semibold ff:leading-tight ff:text-slate-900">
                                Flexa FormFlow
                            </span>
                            <span className="ff:text-[11px] ff:leading-tight ff:text-slate-400">
                                {__("Email Customizer for WooCommerce")}
                            </span>
                        </div>
                        <span className="ff:ml-1 ff:rounded-full ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-2 ff:py-0.5 ff:text-[10px] ff:font-medium ff:text-slate-500">
                            v{window.flexaFormFlow?.version ?? ""}
                        </span>
                    </div>
                    <nav className="ff:flex ff:gap-1">
                        <NavLink href="#/" active={route.name === "emails"}>
                            <Mails className="ff:h-4 ff:w-4" aria-hidden />
                            {__("Emails")}
                        </NavLink>
                        <NavLink href="#/settings" active={route.name === "settings"}>
                            <Bolt className="ff:h-4 ff:w-4" aria-hidden />
                            {__("Settings")}
                        </NavLink>
                    </nav>
                </header>
            )}
            {route.name === "emails" && <EmailsPage />}
            {route.name === "editor" && <EditorPage emailId={route.emailId} key={route.emailId} />}
            {route.name === "settings" && <SettingsPage />}
            <Toaster />
        </div>
    );
}

function NavLink({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <a
            href={href}
            className={cn(
                "ff:flex ff:items-center ff:gap-1.5 ff:rounded-lg ff:px-3 ff:py-1.5 ff:text-sm ff:font-medium ff:no-underline ff:transition-colors",
                active
                    ? "ff:bg-brand-600 ff:text-white ff:shadow-sm"
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
