import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { __, sprintf } from "@/lib/i18n";
import type { EmailTree } from "../types";
import { useDefaultTree, useTemplateOrigins } from "../useEmailTemplates";

/**
 * Confirm "Reset to default". Every template gets the same screen: a "Start
 * from" choice, preselected with the design that fits it best (the one it was
 * made from, or the WooCommerce email it is assigned to) and a line saying
 * why, so the user can always see and change what it resets to. The reset is
 * applied as a normal editor change, so Undo brings the old design back.
 */
export function ResetTemplateDialog({
    open,
    onClose,
    templateId,
    onApply,
}: {
    open: boolean;
    onClose: () => void;
    templateId: number;
    onApply: (tree: EmailTree) => void;
}) {
    const [picked, setPicked] = useState("");
    const suggested = useDefaultTree(templateId, "", open);
    const origins = useTemplateOrigins(open);
    const chosen = useDefaultTree(templateId, picked, open && picked !== "");

    useEffect(() => {
        if (open) setPicked("");
    }, [open]);

    const suggestedValue = suggested.data ? `${suggested.data.origin.kind}:${suggested.data.origin.ref}` : "";
    const value = picked || suggestedValue;
    const result = picked !== "" && picked !== suggestedValue ? chosen : suggested;

    // A pack design is not in the generic list; offer it when it is the suggestion.
    const options = [...(origins.data ?? [])];
    if (suggested.data && suggestedValue && !options.some((o) => o.value === suggestedValue)) {
        options.unshift({ value: suggestedValue, label: suggested.data.label });
    }

    const reason = (() => {
        if (picked !== "" && picked !== suggestedValue) return "";
        if (suggested.isLoading) return __("Loading…");
        switch (suggested.data?.reason) {
            case "recorded":
                return __("This template was made from this design.");
            case "woo_assigned":
                return __("Suggested because this WooCommerce email uses this template.");
            default:
                return __("This template does not record which design it started from. Choose one.");
        }
    })();

    const apply = () => {
        if (!result.data) return;
        onApply(result.data.tree);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{__("Reset to the default design?")}</DialogTitle>
                    <DialogDescription>
                        {result.data
                            ? sprintf(
                                  /* translators: %s: the default design, e.g. "WooCommerce: Processing order (to customer)". */
                                  __("Every block and design setting is replaced with the default for %s."),
                                  result.data.label,
                              )
                            : __("Every block and design setting is replaced with the design you choose.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="ff:flex ff:flex-col ff:gap-1.5">
                    <Label htmlFor="ff-reset-origin" className="ff:block">
                        {__("Start from")}
                    </Label>
                    <Select
                        id="ff-reset-origin"
                        value={value}
                        onChange={(e) => setPicked(e.target.value)}
                        options={[
                            ...(value === "" ? [{ value: "", label: origins.isLoading ? __("Loading…") : __("Choose a design") }] : []),
                            ...options,
                        ]}
                        className="ff:w-full"
                    />
                    {reason && <p className="ff:m-0 ff:text-xs ff:text-slate-500">{reason}</p>}
                    {picked !== "" && chosen.isError && (
                        <p className="ff:m-0 ff:text-xs ff:text-red-600">
                            {chosen.error instanceof Error ? chosen.error.message : __("That design is not available.")}
                        </p>
                    )}
                </div>
                <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                    {__("The header & footer choice is kept. You can undo this with Ctrl+Z (Cmd+Z on Mac) until you leave the editor.")}
                </p>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {__("Cancel")}
                    </Button>
                    <Button variant="destructive" onClick={apply} disabled={!result.data || result.isFetching}>
                        {__("Reset template")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
