import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";

export interface SearchSelectOption {
    value: string;
    label: string;
    /** Section heading; consecutive options with the same group share one. */
    group?: string;
}

/**
 * A select with a search box, for lists too long to scroll (orders, forms,
 * templates). The parent owns the search text and passes the matching options,
 * so it can filter locally or query the server. `valueLabel` is what the closed
 * control shows, since the selected option may not be in the current results.
 */
export function SearchSelect({
    value,
    valueLabel,
    options,
    search,
    onSearchChange,
    onChange,
    loading = false,
    placeholder = __("Search…"),
    emptyText = __("Nothing found."),
    ariaLabel,
    className,
    align = "left",
}: {
    value: string;
    valueLabel: string;
    options: SearchSelectOption[];
    search: string;
    onSearchChange: (search: string) => void;
    onChange: (option: SearchSelectOption) => void;
    loading?: boolean;
    placeholder?: string;
    emptyText?: string;
    ariaLabel: string;
    className?: string;
    /** Which edge of the control the open list lines up with. */
    align?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const close = () => {
        setOpen(false);
        onSearchChange("");
    };

    // Close on a click outside, or when focus leaves the window (a click into
    // the preview iframe never reaches this document).
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        // Escape closes only the list: caught on the window in the capture
        // phase, before a surrounding dialog's own Escape handler sees it.
        const onEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopPropagation();
            close();
        };
        document.addEventListener("mousedown", onDown);
        window.addEventListener("blur", close);
        window.addEventListener("keydown", onEscape, true);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("blur", close);
            window.removeEventListener("keydown", onEscape, true);
        };
        // close only touches stable setters and the parent's setter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
    }, [open]);

    // Highlight the current value when it is listed, else the first option.
    useEffect(() => {
        if (!open) return;
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        // Only when the list itself changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, options]);

    useEffect(() => {
        if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }, [active, open, listId]);

    const pick = (option: SearchSelectOption) => {
        onChange(option);
        close();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(options.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const option = options[active];
            if (option) pick(option);
        } else if (e.key === "Tab") {
            close();
        }
    };

    return (
        <div ref={rootRef} className={cn("ff:relative ff:min-w-52", className)}>
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => (open ? close() : setOpen(true))}
                className={cn(
                    "flexa-formflow-control",
                    "ff:flex ff:h-9 ff:w-full ff:cursor-pointer ff:items-center ff:gap-2 ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-2 ff:text-left ff:text-sm ff:text-slate-900 ff:shadow-sm",
                    "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-1",
                )}
            >
                <span className="ff:min-w-0 ff:flex-1 ff:truncate">{valueLabel}</span>
                <ChevronDown aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
            </button>
            {open && (
                <div className={cn(align === "right" ? "ff:right-0" : "ff:left-0", "ff:absolute ff:top-full ff:z-40 ff:mt-1 ff:flex ff:w-full ff:min-w-72 ff:flex-col ff:overflow-hidden ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:shadow-lg")}>
                    <div className="ff:flex ff:items-center ff:gap-2 ff:border-b ff:border-slate-100 ff:px-2.5">
                        <Search aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
                        <input
                            ref={inputRef}
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={placeholder}
                            role="combobox"
                            aria-expanded
                            aria-controls={listId}
                            aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
                            aria-label={placeholder}
                            className="flexa-formflow-bare-input ff:h-9 ff:min-w-0 ff:flex-1 ff:border-0 ff:bg-transparent ff:text-sm ff:outline-none ff:shadow-none"
                            spellCheck={false}
                        />
                        {loading && <span className="ff:text-[11px] ff:text-slate-400">{__("Searching…")}</span>}
                    </div>
                    <ul id={listId} role="listbox" aria-label={ariaLabel} className="ff:m-0 ff:max-h-72 ff:list-none ff:overflow-y-auto ff:p-1">
                        {options.length === 0 && !loading && (
                            <li className="ff:px-2.5 ff:py-2 ff:text-xs ff:text-slate-500">{emptyText}</li>
                        )}
                        {options.map((option, i) => {
                            const heading = option.group && option.group !== options[i - 1]?.group ? option.group : null;
                            const selected = option.value === value;
                            return (
                                <li key={option.value} role="presentation" className="ff:m-0">
                                    {heading && (
                                        <div className="ff:px-2.5 ff:pb-1 ff:pt-2 ff:text-[11px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                                            {heading}
                                        </div>
                                    )}
                                    <div
                                        id={`${listId}-${i}`}
                                        role="option"
                                        aria-selected={selected}
                                        onMouseEnter={() => setActive(i)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => pick(option)}
                                        className={cn(
                                            "ff:flex ff:cursor-pointer ff:items-center ff:gap-2 ff:rounded-md ff:px-2.5 ff:py-1.5 ff:text-sm",
                                            i === active ? "ff:bg-brand-50 ff:text-brand-700" : "ff:text-slate-700",
                                        )}
                                    >
                                        <span className="ff:min-w-0 ff:flex-1 ff:truncate">{option.label}</span>
                                        {selected && <Check aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0" />}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

/** `value`, settled for `delay` ms; for search boxes that query the server. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
    const [settled, setSettled] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setSettled(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return settled;
}
