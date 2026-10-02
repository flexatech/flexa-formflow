import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileJson, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { __, _n, sprintf } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { checkImport, runImport, type ImportCheck } from "./templateTransfer";

const MAX_BYTES = 1024 * 1024;

/**
 * Import templates from a file another site exported: pick or drop it, review
 * what will be created and anything that may not carry over, then import.
 * Nothing is written before the Import button.
 */
export function ImportTemplatesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient();
    const showToast = useUiStore((s) => s.showToast);
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<{ name: string; data: unknown } | null>(null);
    const [check, setCheck] = useState<ImportCheck | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);

    const reset = () => {
        setFile(null);
        setCheck(null);
        setError("");
        setBusy(false);
    };

    const close = () => {
        onClose();
        window.setTimeout(reset, 200);
    };

    const read = async (picked: File | undefined) => {
        if (!picked) return;
        reset();
        if (picked.size > MAX_BYTES) {
            setError(__("The file is larger than 1 MB, so it cannot be a template export."));
            return;
        }
        let data: unknown;
        try {
            data = JSON.parse(await picked.text());
        } catch {
            setError(__("This file is not valid JSON."));
            return;
        }
        setBusy(true);
        try {
            setCheck(await checkImport(data));
            setFile({ name: picked.name, data });
        } catch (e) {
            setError(e instanceof Error ? e.message : __("The file could not be read."));
        } finally {
            setBusy(false);
        }
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setOver(false);
        void read(e.dataTransfer.files[0]);
    };

    const onImport = async () => {
        if (!file) return;
        setBusy(true);
        try {
            const result = await runImport(file.data);
            await queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            showToast(
                sprintf(_n("%d template imported.", "%d templates imported.", result.created.length), result.created.length),
            );
            close();
            if (result.created.length === 1) navigate(`/emails/${result.created[0].id}/edit`);
        } catch (e) {
            setError(e instanceof Error ? e.message : __("Import failed."));
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent className="ff:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{__("Import email templates")}</DialogTitle>
                    <DialogDescription>
                        {__("Choose a .json file exported from Flexa FormFlow on this or another site. Imported templates are added as new ones; nothing is replaced.")}
                    </DialogDescription>
                </DialogHeader>

                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setOver(true);
                    }}
                    onDragLeave={() => setOver(false)}
                    onDrop={onDrop}
                    className={cn(
                        "ff:flex ff:flex-col ff:items-center ff:gap-2 ff:rounded-lg ff:border-2 ff:border-dashed ff:px-4 ff:py-6 ff:text-center",
                        over ? "ff:border-brand-400 ff:bg-brand-50" : "ff:border-slate-200 ff:bg-slate-50",
                    )}
                >
                    <FileJson aria-hidden className="ff:h-6 ff:w-6 ff:text-slate-400" />
                    <p className="ff:m-0 ff:text-sm ff:text-slate-600">
                        {file ? file.name : __("Drop the file here, or")}
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                        <Upload aria-hidden className="ff:h-4 ff:w-4" />
                        {file ? __("Choose another file") : __("Choose file")}
                    </Button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".json,application/json"
                        className="ff:hidden"
                        onChange={(e) => {
                            void read(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                </div>

                {error && <p className="ff:m-0 ff:text-sm ff:text-red-600">{error}</p>}

                {check && (
                    <div className="ff:flex ff:flex-col ff:gap-3">
                        <div>
                            <p className="ff:m-0 ff:mb-1.5 ff:text-xs ff:font-medium ff:text-slate-600">
                                {sprintf(_n("%d template will be added:", "%d templates will be added:", check.items.length), check.items.length)}
                            </p>
                            <ul className="ff:m-0 ff:max-h-40 ff:list-none ff:overflow-y-auto ff:rounded-md ff:border ff:border-slate-200 ff:p-0">
                                {check.items.map((item, i) => (
                                    <li
                                        key={i}
                                        className="ff:m-0 ff:flex ff:justify-between ff:gap-3 ff:border-b ff:border-slate-100 ff:px-3 ff:py-1.5 ff:text-sm ff:last:border-0"
                                    >
                                        <span className="ff:truncate ff:text-slate-800">{item.title}</span>
                                        <span className="ff:shrink-0 ff:text-xs ff:text-slate-400">
                                            {sprintf(_n("%d block", "%d blocks", item.blocks), item.blocks)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {check.warnings.map((warning) => (
                            <div
                                key={warning}
                                className="ff:flex ff:items-start ff:gap-2 ff:rounded-lg ff:border ff:border-amber-200 ff:bg-amber-50 ff:px-3 ff:py-2 ff:text-xs ff:text-amber-800"
                            >
                                <AlertTriangle aria-hidden className="ff:mt-0.5 ff:h-4 ff:w-4 ff:shrink-0 ff:text-amber-500" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={close}>
                        {__("Cancel")}
                    </Button>
                    <Button onClick={() => void onImport()} disabled={!check || busy}>
                        {busy && check ? __("Importing…") : __("Import")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
