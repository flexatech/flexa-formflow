import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bold, Code, Italic, Link2, Link2Off, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navUrlProblem } from "../navigation";
import { hasUnsupportedMarkup, sanitizeInline, toEditable } from "./richText";
import type { TokenTarget } from "./tokenTarget";

/**
 * Text with bold, italic, underline and links, edited visually instead of as
 * HTML. What it stores is the same inline subset the renderer keeps, cleaned
 * on every edit. "Edit HTML" is still there for people who want it, behind a
 * warning; the server sanitizes either way.
 */
export function RichTextField({
    value,
    onChange,
    onFocusField,
    placeholder,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    onFocusField: (target: TokenTarget) => void;
    placeholder?: string;
    label: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const lastEmitted = useRef<string | null>(null);
    const savedRange = useRef<Range | null>(null);
    const [htmlMode, setHtmlMode] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    // Load outside values (another block selected, undo) without fighting the
    // caret while the user types: our own edits are skipped.
    useEffect(() => {
        const el = ref.current;
        if (!el || htmlMode || value === lastEmitted.current) return;
        el.innerHTML = toEditable(value);
    }, [value, htmlMode]);

    const emit = () => {
        const el = ref.current;
        if (!el) return;
        const clean = sanitizeInline(el.innerHTML);
        lastEmitted.current = clean;
        onChange(clean);
    };

    const rememberSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        const range = savedRange.current;
        if (range) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    };

    const command = (name: string, arg?: string) => {
        restoreSelection();
        document.execCommand(name, false, arg);
        emit();
        rememberSelection();
    };

    const target: TokenTarget = {
        insert: (token) => {
            restoreSelection();
            document.execCommand("insertText", false, token);
            emit();
        },
    };

    const linkProblem = linkUrl.trim() === "" ? null : navUrlProblem(linkUrl);

    if (htmlMode) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-1.5">
                <div className="ff:flex ff:items-start ff:gap-2 ff:rounded-md ff:bg-amber-50 ff:p-2 ff:text-[11px] ff:text-amber-800" role="note">
                    <AlertTriangle aria-hidden className="ff:mt-0.5 ff:h-3.5 ff:w-3.5 ff:shrink-0" />
                    {__("Advanced: only links, bold, italic, underline and line breaks are kept in the email. Anything else is removed when it is sent.")}
                </div>
                <Textarea
                    aria-label={label}
                    value={value}
                    rows={5}
                    spellCheck={false}
                    className="ff:font-mono ff:text-xs"
                    onChange={(e) => onChange(e.target.value)}
                />
                <Button variant="outline" size="sm" onClick={() => setHtmlMode(false)}>
                    {__("Back to the visual editor")}
                </Button>
            </div>
        );
    }

    const tool = (Icon: typeof Bold, title: string, run: () => void) => (
        <button
            type="button"
            title={title}
            aria-label={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={run}
            className="ff:flex ff:h-7 ff:w-7 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded-field ff:border-0 ff:bg-transparent ff:text-slate-600 ff:hover:bg-slate-100 ff:hover:text-slate-900"
        >
            <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
        </button>
    );

    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <div className="ff:overflow-hidden ff:rounded-field ff:border ff:border-slate-300 ff:bg-white ff:focus-within:border-brand-500">
                <div role="toolbar" aria-label={__("Formatting")} className="ff:flex ff:items-center ff:gap-0.5 ff:border-b ff:border-slate-200 ff:px-1 ff:py-0.5">
                    {tool(Bold, __("Bold"), () => command("bold"))}
                    {tool(Italic, __("Italic"), () => command("italic"))}
                    {tool(Underline, __("Underline"), () => command("underline"))}
                    {tool(Link2, __("Add link"), () => {
                        rememberSelection();
                        setLinkUrl("");
                        setLinkOpen(true);
                    })}
                    {tool(Link2Off, __("Remove link"), () => command("unlink"))}
                    <span className="ff:flex-1" />
                    {tool(Code, __("Edit HTML"), () => setHtmlMode(true))}
                </div>
                <div
                    ref={ref}
                    role="textbox"
                    aria-multiline="true"
                    aria-label={label}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                    onInput={emit}
                    onKeyUp={rememberSelection}
                    onMouseUp={rememberSelection}
                    onFocus={() => onFocusField(target)}
                    onBlur={rememberSelection}
                    onKeyDown={(e) => {
                        // A line break, not a new <div>, so the stored text stays inline.
                        if (e.key === "Enter") {
                            e.preventDefault();
                            document.execCommand("insertLineBreak");
                            emit();
                        }
                    }}
                    onPaste={(e) => {
                        // Paste as plain text: formatting comes from the toolbar.
                        e.preventDefault();
                        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
                        emit();
                    }}
                    className={cn(
                        "flexa-formflow-richtext",
                        "ff:min-h-20 ff:px-3 ff:py-2 ff:text-sm ff:leading-relaxed ff:text-slate-900 ff:outline-none",
                    )}
                />
            </div>
            {hasUnsupportedMarkup(value) && (
                <p className="ff:m-0 ff:text-[11px] ff:text-amber-700">
                    {__("This text has markup the visual editor does not show. Use Edit HTML to see it.")}
                </p>
            )}
            {linkOpen && (
                <div className="ff:flex ff:flex-col ff:gap-1.5 ff:rounded-item ff:border ff:border-slate-200 ff:bg-slate-50 ff:p-2">
                    <Input
                        autoFocus
                        aria-label={__("Link URL")}
                        aria-invalid={linkProblem !== null}
                        value={linkUrl}
                        placeholder="https://… or {site_url}"
                        onChange={(e) => setLinkUrl(e.target.value)}
                        spellCheck={false}
                    />
                    {linkProblem && (
                        <p className="ff:m-0 ff:text-[11px] ff:text-red-700">
                            {__("Use a full web address (https://…), mailto:, tel:, or a merge tag such as {site_url}.")}
                        </p>
                    )}
                    <div className="ff:flex ff:justify-end ff:gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button
                            size="sm"
                            disabled={linkUrl.trim() === "" || linkProblem !== null}
                            onClick={() => {
                                command("createLink", linkUrl.trim());
                                setLinkOpen(false);
                            }}
                        >
                            {__("Apply link")}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
