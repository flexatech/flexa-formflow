import { useState } from "react";
import { ArrowLeft, Check, FileText, LayoutGrid, Mail, Package, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { ownershipChip } from "@/components/custom/AssetCard";
import { __, sprintf } from "@/lib/i18n";
import { usePackDetail } from "./useLibrary";
import { ImportPackDialog } from "./ImportPackDialog";
import type { PackItem } from "./types";

/**
 * Pack detail (PRODUCT_DESIGN.md section L): header, the named content list,
 * requirement line, and the Get action that opens the 3-step import. Reads the
 * live pack manifest, so what it lists is exactly what the importer installs.
 */
export function PackDetailPage({ id }: { id: string }) {
    const { data: pack, isLoading } = usePackDetail(id);
    const [importOpen, setImportOpen] = useState(false);

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
    const groups: { icon: typeof FileText; label: string; items: PackItem[] }[] = [
        { icon: FileText, label: __("Forms"), items: pack.items.forms },
        { icon: Mail, label: __("Email templates"), items: pack.items.emails },
        { icon: Workflow, label: __("Workflows"), items: pack.items.workflows },
        { icon: LayoutGrid, label: __("Patterns"), items: pack.items.patterns },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <BackLink />

            <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-6 ff:md:flex-row ff:md:items-start ff:md:justify-between">
                <div className="ff:flex ff:max-w-xl ff:flex-col ff:gap-2">
                    <span className="ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-400">{pack.category}</span>
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
                    {pack.price && !pack.installed && (
                        <span className="ff:text-2xl ff:font-semibold ff:text-slate-900">{pack.price}</span>
                    )}
                    {pack.installed ? (
                        <Badge variant="installed">{__("Installed")}</Badge>
                    ) : (
                        <Button onClick={() => setImportOpen(true)} disabled={!pack.canInstall}>
                            {__("Get pack")}
                        </Button>
                    )}
                    {!pack.canInstall && !pack.installed && (
                        <span className="ff:text-xs ff:text-amber-600">{__("Needs FormFlow Pro")}</span>
                    )}
                </div>
            </div>

            <div className="ff:grid ff:gap-4 ff:md:grid-cols-2">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What's inside")}</h2>
                    <div className="ff:flex ff:flex-col ff:gap-4">
                        {groups
                            .filter((g) => g.items.length > 0)
                            .map(({ icon: Icon, label, items }) => (
                                <div key={label} className="ff:flex ff:flex-col ff:gap-1.5">
                                    <div className="ff:flex ff:items-center ff:gap-2 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                                        <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
                                        {label}
                                    </div>
                                    <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-1 ff:p-0">
                                        {items.map((item) => (
                                            <li
                                                key={item.ref}
                                                className="ff:flex ff:items-center ff:justify-between ff:gap-2 ff:text-sm ff:text-slate-700"
                                            >
                                                <span>{item.name}</span>
                                                {item.requiresPro && <Badge variant="pro">{__("Pro")}</Badge>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What it solves")}</h2>
                    <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">
                        {__("A ready-made pipeline for the industry: the form, the emails it sends, and the workflow that ties them together, all editable after import.")}
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

            <ImportPackDialog pack={pack} open={importOpen} onClose={() => setImportOpen(false)} />
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
