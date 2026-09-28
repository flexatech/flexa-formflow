import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";

interface LockedExplainerProps {
    /** One sentence: what the capability does. */
    title: string;
    /** What unlocks it, e.g. "Included in FormFlow Pro." */
    unlocks: string;
    /** Optional external links; omit to hide the button. */
    learnMoreUrl?: string;
    upgradeUrl?: string;
    /** The trigger, usually a palette row or a Pro chip. */
    children: ReactNode;
    className?: string;
}

/**
 * Lock type 1 (Pro capability) from PRODUCT_DESIGN.md section D: the item stays
 * visible and explorable; clicking opens a compact explainer, never a modal
 * takeover. Dependency-free popover (no @radix-ui/react-popover in the bundle):
 * a controlled panel with click-outside + Escape to dismiss.
 */
export function LockedExplainer({
    title,
    unlocks,
    learnMoreUrl,
    upgradeUrl,
    children,
    className,
}: LockedExplainerProps) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onDocClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <span ref={wrapRef} className={cn("ff:relative ff:inline-flex", className)}>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="ff:inline-flex ff:cursor-pointer ff:items-center ff:border-0 ff:bg-transparent ff:p-0 ff:text-left"
            >
                {children}
            </button>
            {open && (
                <div
                    role="dialog"
                    className="ff:absolute ff:left-0 ff:top-[calc(100%+0.5rem)] ff:z-[160002] ff:w-72 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4 ff:shadow-lg ff:data-[state=open]:animate-in"
                >
                    <div className="ff:mb-2 ff:flex ff:items-center ff:gap-2 ff:text-brand-700">
                        <Lock aria-hidden className="ff:h-3.5 ff:w-3.5" />
                        <span className="ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide">
                            {__("FormFlow Pro")}
                        </span>
                    </div>
                    <p className="ff:m-0 ff:text-sm ff:font-medium ff:text-slate-900">{title}</p>
                    <p className="ff:m-0 ff:mt-1 ff:text-xs ff:text-slate-500">{unlocks}</p>
                    {(learnMoreUrl || upgradeUrl) && (
                        <div className="ff:mt-3 ff:flex ff:gap-2">
                            {upgradeUrl && (
                                <Button asChild size="sm">
                                    <a href={upgradeUrl} target="_blank" rel="noreferrer">
                                        {__("Upgrade to Pro")}
                                    </a>
                                </Button>
                            )}
                            {learnMoreUrl && (
                                <Button asChild size="sm" variant="ghost">
                                    <a href={learnMoreUrl} target="_blank" rel="noreferrer">
                                        {__("Learn more")}
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </span>
    );
}
