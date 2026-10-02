import { memo } from "react";
import { ImageOff, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { THUMB_ASPECT } from "../emailFrame";
import { usePatternThumbnail } from "../useEmailTemplates";
import type { EmailPattern } from "../types";
import { ScaledEmailFrame } from "./ScaledEmailFrame";

/**
 * A pattern card's picture: the pattern's canonical email render (the same
 * HTML the email sends with), laid out at the email's desktop width and scaled
 * whole into a fixed-aspect frame. A skeleton of the same size holds the place
 * until the render arrives; a failed render shows a notice, never a guess.
 */
export const PatternThumbnail = memo(function PatternThumbnail({
    html,
    failed = false,
    name,
}: {
    html: string | undefined;
    failed?: boolean;
    name: string;
}) {
    if (failed) {
        return (
            <div
                className="ff:flex ff:w-full ff:flex-col ff:items-center ff:justify-center ff:gap-1 ff:bg-slate-50 ff:text-[11px] ff:text-slate-500"
                style={{ aspectRatio: String(THUMB_ASPECT) }}
            >
                <ImageOff aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
                {__("Preview unavailable")}
            </div>
        );
    }
    if (html === undefined) {
        return <div aria-hidden className="ff:w-full ff:animate-pulse ff:bg-slate-100" style={{ aspectRatio: String(THUMB_ASPECT) }} />;
    }
    return <ScaledEmailFrame html={html} title={name} fit="thumbnail" />;
});

/**
 * The large preview of one pattern, rendered by the same renderer the email
 * uses, with its description and an Insert button (locked for Pro patterns on
 * a Free site).
 */
export function PatternPreviewDialog({
    pattern,
    categoryLabel,
    onClose,
    onInsert,
    revision,
}: {
    pattern: EmailPattern | null;
    categoryLabel: string;
    /** Sample-data revision of the library the pattern came from (part of the render's cache key). */
    revision: number;
    onClose: () => void;
    onInsert: (id: string) => void;
}) {
    // The large preview reuses the thumbnail's cached render: same output, no new request.
    const { data: html, isError } = usePatternThumbnail(pattern, revision, pattern !== null);

    return (
        <Dialog open={pattern !== null} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="ff:max-w-3xl">
                {pattern && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                                {pattern.name}
                                <PatternTags pattern={pattern} />
                            </DialogTitle>
                            <DialogDescription>
                                {categoryLabel}
                                {pattern.description ? ` · ${pattern.description}` : ""}
                            </DialogDescription>
                        </DialogHeader>
                        {/* Same render as the card, at the same logical width; it only
                            scales down to fit, so a narrow window never reflows it. */}
                        <div className="ff:h-[55vh] ff:overflow-auto ff:rounded-md ff:bg-slate-100 ff:p-3">
                            {isError ? (
                                <PatternThumbnail html={undefined} failed name={pattern.name} />
                            ) : html === undefined ? (
                                <div className="ff:h-full ff:w-full ff:animate-pulse ff:rounded-md ff:bg-slate-200" />
                            ) : (
                                <ScaledEmailFrame
                                    html={html}
                                    title={pattern.name}
                                    fit="width"
                                    className="ff:rounded-md ff:border ff:border-slate-200"
                                />
                            )}
                        </div>
                        <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                            {__("Sample data shown. Inserted blocks stay fully editable and are not linked to the pattern.")}
                        </p>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>
                                {__("Close")}
                            </Button>
                            <Button disabled={pattern.locked} onClick={() => onInsert(pattern.id)}>
                                {pattern.locked ? (
                                    <Lock aria-hidden className="ff:h-4 ff:w-4" />
                                ) : (
                                    <Plus aria-hidden className="ff:h-4 ff:w-4" />
                                )}
                                {pattern.locked ? __("Available in Pro") : __("Insert pattern")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Small chips for a Pro lock or an integration the pattern needs. */
export function PatternTags({ pattern }: { pattern: EmailPattern }) {
    return (
        <>
            {pattern.locked && (
                <span className="ff:inline-flex ff:shrink-0 ff:items-center ff:gap-0.5 ff:rounded ff:bg-amber-50 ff:px-1 ff:py-px ff:text-[10px] ff:font-semibold ff:text-amber-700">
                    <Lock aria-hidden className="ff:h-2.5 ff:w-2.5" />
                    {__("Pro")}
                </span>
            )}
            {pattern.requires === "woocommerce" && (
                <span className="ff:shrink-0 ff:rounded ff:bg-violet-50 ff:px-1 ff:py-px ff:text-[10px] ff:font-semibold ff:text-violet-700">
                    {__("Woo")}
                </span>
            )}
        </>
    );
}
