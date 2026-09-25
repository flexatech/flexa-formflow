import { ArrowLeft, Check, FileText, LayoutGrid, Mail, Package, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { ownershipChip } from "@/components/custom/AssetCard";
import { __, sprintf } from "@/lib/i18n";
import { usePacks } from "./useLibrary";

/**
 * Pack detail (PRODUCT_DESIGN.md section L): header, contents summary,
 * requirement line, Preview / Get actions. Reads the live catalog. Slice 4
 * wires the entitlement check and the 3-step import behind Get / Preview.
 */
export function PackDetailPage({ id }: { id: string }) {
    const { data: packs, isLoading } = usePacks();
    const pack = packs.find((p) => p.id === id);

    if (!pack && isLoading) {
        return <div className="ff:p-6 ff:text-sm ff:text-slate-400">{__("Loading…")}</div>;
    }

    if (!pack) {
        return (
            <div className="ff:p-6">
                <BackLink />
                <EmptyState
                    icon={Package}
                    title={__("Pack not found.")}
                    description={__("This pack is not in the catalog. It may have been removed.")}
                />
            </div>
        );
    }

    const chip = ownershipChip(pack);
    const contents: { icon: typeof FileText; n: number; label: string }[] = [
        { icon: FileText, n: pack.contents.forms, label: __("Forms") },
        { icon: Mail, n: pack.contents.emails, label: __("Email templates") },
        { icon: Workflow, n: pack.contents.workflows, label: __("Workflows") },
        { icon: LayoutGrid, n: pack.contents.patterns, label: __("Patterns") },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <BackLink />

            <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-6 ff:md:flex-row ff:md:items-start ff:md:justify-between">
                <div className="ff:flex ff:max-w-xl ff:flex-col ff:gap-2">
                    <span className="ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-400">
                        {pack.category}
                    </span>
                    <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{pack.name}</h1>
                    <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">{pack.description}</p>
                    <div className="ff:mt-1 ff:flex ff:items-center ff:gap-2">
                        <Badge variant={chip.variant}>{chip.label}</Badge>
                        {pack.requiresPro && (
                            <span className="ff:text-xs ff:text-slate-400">{__("Requires: FormFlow Pro")}</span>
                        )}
                    </div>
                </div>
                <div className="ff:flex ff:shrink-0 ff:flex-col ff:items-start ff:gap-2 ff:md:items-end">
                    {pack.price && (
                        <span className="ff:text-2xl ff:font-semibold ff:text-slate-900">{pack.price}</span>
                    )}
                    <div className="ff:flex ff:gap-2">
                        <Button variant="outline">{__("Preview pack")}</Button>
                        <Button>{__("Get pack")}</Button>
                    </div>
                </div>
            </div>

            <div className="ff:grid ff:gap-4 ff:md:grid-cols-2">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What's inside")}</h2>
                    <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-2 ff:p-0">
                        {contents.map(({ icon: Icon, n, label }) => (
                            <li key={label} className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-700">
                                <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
                                <span className="ff:font-semibold ff:tabular-nums">{n}</span>
                                <span>{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What it solves")}</h2>
                    <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">
                        {__("Lead capture through qualification, quote, follow-up and booking, with every email and automation pre-written for the industry.")}
                    </p>
                    <div className="ff:mt-2 ff:flex ff:flex-col ff:gap-1 ff:text-xs ff:text-slate-500">
                        <span className="ff:flex ff:items-center ff:gap-1.5">
                            <Check aria-hidden className="ff:h-3.5 ff:w-3.5 ff:text-emerald-500" />
                            {sprintf(__("Compatibility: %s"), pack.compatibility)}
                        </span>
                        <span className="ff:flex ff:items-center ff:gap-1.5">
                            <Check aria-hidden className="ff:h-3.5 ff:w-3.5 ff:text-emerald-500" />
                            {sprintf(__("Version %s"), pack.version)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BackLink() {
    return (
        <a
            href="#/library"
            className="ff:inline-flex ff:w-fit ff:items-center ff:gap-1.5 ff:text-sm ff:font-medium ff:text-slate-500 ff:no-underline ff:transition-colors ff:hover:text-slate-800"
        >
            <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
            {__("Back to Library")}
        </a>
    );
}
