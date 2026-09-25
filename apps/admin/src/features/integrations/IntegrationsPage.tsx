import { CheckCircle2, Circle, Clock, Send } from "lucide-react";
import { __ } from "@/lib/i18n";
import { useIntegrations, type IntegrationCard, type IntegrationStatus } from "./useIntegrations";

export function IntegrationsPage() {
    const { data, isLoading } = useIntegrations();

    if (isLoading || !data) {
        return (
            <div className="ff:p-6">
                <div className="ff:h-64 ff:animate-pulse ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white" />
            </div>
        );
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:flex-col ff:gap-1">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Integrations")}</h1>
                <p className="ff:text-sm ff:text-slate-500">
                    {__("Connect FormFlow to the rest of your stack: delivery, webhooks, and more.")}
                </p>
            </div>

            <DeliveryCard active={data.delivery.active} label={data.delivery.label} />

            <div className="ff:grid ff:grid-cols-1 ff:gap-3 md:ff:grid-cols-2">
                {data.integrations.map((card) => (
                    <IntegrationTile key={card.id} card={card} />
                ))}
            </div>
        </div>
    );
}

function DeliveryCard({ active, label }: { active: boolean; label: string }) {
    return (
        <section
            className={
                active
                    ? "ff:flex ff:items-center ff:gap-4 ff:rounded-xl ff:border ff:border-emerald-200 ff:bg-emerald-50/50 ff:px-5 ff:py-4"
                    : "ff:flex ff:items-center ff:gap-4 ff:rounded-xl ff:border ff:border-amber-200 ff:bg-amber-50/50 ff:px-5 ff:py-4"
            }
        >
            <span
                className={
                    active
                        ? "ff:flex ff:h-10 ff:w-10 ff:items-center ff:justify-center ff:rounded-lg ff:bg-emerald-100 ff:text-emerald-700"
                        : "ff:flex ff:h-10 ff:w-10 ff:items-center ff:justify-center ff:rounded-lg ff:bg-amber-100 ff:text-amber-700"
                }
            >
                <Send aria-hidden className="ff:h-5 ff:w-5" />
            </span>
            <div className="ff:min-w-0 ff:flex-1">
                <div className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Email delivery")}</div>
                <p className="ff:text-sm ff:text-slate-600">
                    {active
                        ? /* label already localized server-side */ label
                        : __("No delivery plugin detected. FormFlow uses wp_mail(); add an SMTP plugin such as Flexa MailBridge for reliable delivery, logs, and tracking.")}
                </p>
            </div>
            <span
                className={
                    active
                        ? "ff:shrink-0 ff:rounded-full ff:bg-emerald-100 ff:px-2.5 ff:py-1 ff:text-xs ff:font-medium ff:text-emerald-700"
                        : "ff:shrink-0 ff:rounded-full ff:bg-amber-100 ff:px-2.5 ff:py-1 ff:text-xs ff:font-medium ff:text-amber-700"
                }
            >
                {active ? label || __("Connected") : __("Not set up")}
            </span>
        </section>
    );
}

const STATUS_META: Record<IntegrationStatus, { label: string; icon: typeof Circle; cls: string }> = {
    active: { label: __("Active"), icon: CheckCircle2, cls: "ff:text-emerald-600" },
    available: { label: __("Available"), icon: Circle, cls: "ff:text-brand-600" },
    soon: { label: __("Coming soon"), icon: Clock, cls: "ff:text-slate-400" },
};

function IntegrationTile({ card }: { card: IntegrationCard }) {
    const meta = STATUS_META[card.status];
    const Icon = meta.icon;
    return (
        <section className="ff:flex ff:flex-col ff:gap-2 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-2">
                <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{card.title}</h2>
                <span className={`ff:flex ff:items-center ff:gap-1 ff:text-xs ff:font-medium ${meta.cls}`}>
                    <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
                    {meta.label}
                </span>
            </div>
            <p className="ff:text-sm ff:text-slate-500">{card.description}</p>
            <p className="ff:mt-auto ff:pt-1 ff:text-xs ff:text-slate-400">{card.detail}</p>
        </section>
    );
}
