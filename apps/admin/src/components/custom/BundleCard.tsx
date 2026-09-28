import { Boxes, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __, sprintf } from "@/lib/i18n";
import type { Bundle } from "@/features/library/types";

/**
 * A bundle presents several packs at a combined price (PRODUCT_DESIGN.md
 * section R). It is presentation over entitlement: the plugin lists the member
 * packs and the price; the store owns what a purchase grants. The action opens
 * the first member pack so the user can explore what is inside.
 */
export function BundleCard({ bundle, onOpenPack }: { bundle: Bundle; onOpenPack?: (packId: string) => void }) {
    const first = bundle.members[0]?.id;

    return (
        <div className="ff:flex ff:flex-col ff:overflow-hidden ff:rounded-xl ff:border ff:border-amber-200 ff:bg-white ff:transition-shadow ff:hover:shadow-md">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:bg-gradient-to-br ff:from-amber-500 ff:to-orange-600 ff:px-5 ff:py-4 ff:text-white">
                <div className="ff:flex ff:items-center ff:gap-3">
                    <span className="ff:flex ff:h-10 ff:w-10 ff:items-center ff:justify-center ff:rounded-xl ff:bg-white/15">
                        <Boxes aria-hidden className="ff:h-5 ff:w-5" />
                    </span>
                    <div className="ff:flex ff:flex-col">
                        <span className="ff:text-[11px] ff:uppercase ff:tracking-wide ff:text-white/70">
                            {sprintf(__("Bundle · %d packs"), bundle.memberCount)}
                        </span>
                        <span className="ff:text-base ff:font-semibold ff:leading-tight">{bundle.name}</span>
                    </div>
                </div>
                <div className="ff:flex ff:flex-col ff:items-end">
                    {bundle.price && <span className="ff:text-lg ff:font-semibold">{bundle.price}</span>}
                    {bundle.listPrice && (
                        <span className="ff:text-xs ff:text-white/70 ff:line-through">{bundle.listPrice}</span>
                    )}
                </div>
            </div>

            <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-4 ff:p-5">
                <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">{bundle.description}</p>

                <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-1.5 ff:p-0">
                    {bundle.members.map((member) => (
                        <li key={member.id} className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-700">
                            <Check aria-hidden className="ff:h-4 ff:w-4 ff:text-emerald-500" />
                            {member.name}
                        </li>
                    ))}
                </ul>

                <div className="ff:mt-auto ff:flex ff:items-center ff:justify-between ff:gap-3">
                    <span className="ff:rounded-full ff:bg-amber-50 ff:px-2.5 ff:py-1 ff:text-[11px] ff:font-medium ff:text-amber-700">
                        {__("Save when you buy the set")}
                    </span>
                    {first && (
                        <Button variant="outline" size="sm" onClick={() => onOpenPack?.(first)}>
                            {__("Explore packs")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
