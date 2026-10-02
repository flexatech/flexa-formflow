import { createContext, memo, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Lock, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { __, sprintf } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { usePatternThumbnail } from "../useEmailTemplates";
import { BLOCK_PATTERN_TYPE, groupPatterns, type EmailPattern, type PatternCategory } from "../types";
import { PatternPreviewDialog, PatternTags, PatternThumbnail } from "./PatternPreview";

interface PatternPaletteProps {
    /** Patterns already filtered to this editing context by the server. */
    patterns: EmailPattern[];
    categories: PatternCategory[];
    isLoading: boolean;
    /** Insert the pattern's blocks after the selected block, or at the end. */
    onAdd: (patternId: string) => void;
    /** The library's sample-data revision; thumbnails are cached per revision. */
    revision?: number;
    /** A one-line note above the list (the layout editor says which region it fills). */
    note?: string;
}

/** The scroll area cards observe to load their thumbnail when near view. */
const ScrollRoot = createContext<HTMLElement | null>(null);
/** The sample-data revision the cards' thumbnails are keyed by. */
const Revision = createContext(0);

/**
 * The Patterns tab: the patterns allowed in this context, grouped in
 * collapsible categories with counts, searchable by name, category, keywords
 * and description. Search runs on the metadata only. A card renders its
 * thumbnail (through the email renderer, batched with its neighbours) only
 * once it scrolls near view, so opening the tab or a category stays cheap.
 */
export function PatternPalette({ patterns, categories, isLoading, onAdd, revision = 0, note }: PatternPaletteProps) {
    const [query, setQuery] = useState("");
    // Typing updates the box at once; filtering the list follows a beat later.
    const deferredQuery = useDeferredValue(query);
    const [open, setOpen] = useState<string[]>([]);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);

    // The editors rebuild their handlers on every render; keep one stable
    // callback so memoized cards don't re-render for it.
    const onAddRef = useRef(onAdd);
    onAddRef.current = onAdd;
    const add = useCallback((id: string) => onAddRef.current(id), []);

    const groups = useMemo(() => groupPatterns(patterns, categories, deferredQuery), [patterns, categories, deferredQuery]);
    const total = groups.reduce((n, g) => n + g.items.length, 0);

    const searching = deferredQuery.trim() !== "";
    // While searching, every category with a match is open; otherwise the user's choice.
    const isOpen = (key: string) => searching || open.includes(key);
    const toggle = useCallback(
        (key: string) => setOpen((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key])),
        [],
    );

    const previewPattern = patterns.find((p) => p.id === previewId) ?? null;

    return (
        <div className="ff:flex ff:h-full ff:flex-col">
            <div className="ff:border-b ff:border-slate-200 ff:p-3">
                <div className="ff:relative">
                    <Search
                        aria-hidden
                        className="ff:pointer-events-none ff:absolute ff:left-2.5 ff:top-1/2 ff:h-3.5 ff:w-3.5 ff:-translate-y-1/2 ff:text-slate-400"
                    />
                    <Input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={__("Search patterns")}
                        aria-label={__("Search patterns")}
                        // Inline left padding: WP-admin's unlayered `input { padding }`
                        // beats the layered `ff:pl-8` utility, so the icon and text
                        // would overlap. An inline style outranks WP's rule.
                        style={{ paddingLeft: "2rem" }}
                    />
                </div>
                {note && <p className="ff:m-0 ff:mt-2 ff:text-[11px] ff:text-slate-500">{note}</p>}
                {searching && !isLoading && (
                    <p className="ff:m-0 ff:mt-1 ff:text-[11px] ff:text-slate-500" role="status">
                        {sprintf(__("%d matching patterns"), total)}
                    </p>
                )}
            </div>

            <div ref={setScrollRoot} className="ff:flex-1 ff:overflow-y-auto ff:p-2">
                {isLoading ? (
                    <div className="ff:flex ff:flex-col ff:gap-2 ff:p-1">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="ff:h-9 ff:animate-pulse ff:rounded-item ff:bg-slate-100" />
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <EmptyState searching={searching} onClear={() => setQuery("")} />
                ) : (
                    <ScrollRoot.Provider value={scrollRoot}>
                        <Revision.Provider value={revision}>
                        <div className="ff:flex ff:flex-col ff:gap-1">
                            {groups.map((group) => (
                                <CategorySection
                                    key={group.key}
                                    group={group}
                                    expanded={isOpen(group.key)}
                                    onToggle={toggle}
                                    onAdd={add}
                                    onPreview={setPreviewId}
                                />
                            ))}
                        </div>
                        </Revision.Provider>
                    </ScrollRoot.Provider>
                )}
            </div>

            <PatternPreviewDialog
                pattern={previewPattern}
                categoryLabel={categories.find((c) => c.key === previewPattern?.category)?.label ?? ""}
                revision={revision}
                onClose={() => setPreviewId(null)}
                onInsert={(id) => {
                    add(id);
                    setPreviewId(null);
                }}
            />
        </div>
    );
}

function EmptyState({ searching, onClear }: { searching: boolean; onClear: () => void }) {
    return (
        <div className="ff:m-1 ff:flex ff:flex-col ff:items-center ff:gap-2 ff:rounded-item ff:border ff:border-dashed ff:border-slate-300 ff:p-4 ff:text-center">
            <SearchX aria-hidden className="ff:h-5 ff:w-5 ff:text-slate-400" />
            <p className="ff:m-0 ff:text-xs ff:text-slate-600">
                {searching
                    ? __("No patterns here match your search. Try another word, or browse the categories.")
                    : __("No patterns are available for this part yet. Add blocks from the Blocks tab instead.")}
            </p>
            {searching && (
                <Button variant="outline" size="sm" onClick={onClear}>
                    {__("Clear search")}
                </Button>
            )}
        </div>
    );
}

const CategorySection = memo(function CategorySection({
    group,
    expanded,
    onToggle,
    onAdd,
    onPreview,
}: {
    group: { key: string; label: string; items: EmailPattern[] };
    expanded: boolean;
    onToggle: (key: string) => void;
    onAdd: (id: string) => void;
    onPreview: (id: string) => void;
}) {
    const Chevron = expanded ? ChevronDown : ChevronRight;
    const panelId = `ff-patterns-${group.key}`;
    return (
        <section>
            <button
                type="button"
                onClick={() => onToggle(group.key)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="ff:flex ff:w-full ff:cursor-pointer ff:items-center ff:gap-2 ff:rounded-item ff:border-0 ff:bg-transparent ff:px-2 ff:py-2 ff:text-left ff:text-sm ff:font-medium ff:text-slate-700 ff:hover:bg-slate-50"
            >
                <Chevron aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
                <span className="ff:flex-1">{group.label}</span>
                <span
                    className="ff:rounded-full ff:bg-slate-100 ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:font-medium ff:text-slate-500"
                    aria-label={sprintf(__("%d patterns"), group.items.length)}
                >
                    {group.items.length}
                </span>
            </button>
            {expanded && (
                <div id={panelId} className="ff:flex ff:flex-col ff:gap-2 ff:px-1 ff:pb-3 ff:pt-1">
                    {group.items.map((pattern) => (
                        <PatternCard key={pattern.id} pattern={pattern} onAdd={onAdd} onPreview={onPreview} />
                    ))}
                </div>
            )}
        </section>
    );
});

/** True once the element has come within `margin` of the scroll area's view. */
function useNearView(margin = "240px"): [(el: HTMLElement | null) => void, boolean] {
    const root = useContext(ScrollRoot);
    const [node, setNode] = useState<HTMLElement | null>(null);
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        if (!node || seen) return;
        if (typeof IntersectionObserver === "undefined") {
            setSeen(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) setSeen(true);
            },
            { root, rootMargin: `${margin} 0px` },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [node, root, seen, margin]);
    return [setNode, seen];
}

const PatternCard = memo(function PatternCard({
    pattern,
    onAdd,
    onPreview,
}: {
    pattern: EmailPattern;
    onAdd: (id: string) => void;
    onPreview: (id: string) => void;
}) {
    const [ref, near] = useNearView();
    const revision = useContext(Revision);
    const { data: html, isError } = usePatternThumbnail(pattern, revision, near);

    return (
        <div
            ref={ref}
            data-pattern={pattern.id}
            draggable={!pattern.locked}
            onDragStart={(e) => {
                e.dataTransfer.setData(BLOCK_PATTERN_TYPE, pattern.id);
                e.dataTransfer.effectAllowed = "copy";
            }}
            className={cn(
                "ff:group ff:overflow-hidden ff:rounded-item ff:border ff:border-slate-200 ff:bg-white ff:transition-colors ff:hover:border-brand-300",
                !pattern.locked && "ff:cursor-grab ff:active:cursor-grabbing",
            )}
        >
            <button
                type="button"
                onClick={() => onPreview(pattern.id)}
                className="ff:block ff:w-full ff:cursor-pointer ff:border-0 ff:bg-slate-100 ff:p-0"
                aria-label={sprintf(__("Preview %s"), pattern.name)}
            >
                <PatternThumbnail html={near ? html : undefined} failed={isError} name={pattern.name} />
            </button>
            <div className="ff:flex ff:items-start ff:gap-2 ff:px-2.5 ff:py-2">
                <div className="ff:min-w-0 ff:flex-1">
                    <div className="ff:flex ff:items-center ff:gap-1.5">
                        <span className="ff:truncate ff:text-xs ff:font-semibold ff:text-slate-800">{pattern.name}</span>
                        <PatternTags pattern={pattern} />
                    </div>
                    {pattern.description && (
                        <p className="ff:m-0 ff:mt-0.5 ff:line-clamp-2 ff:text-[11px] ff:leading-snug ff:text-slate-500">
                            {pattern.description}
                        </p>
                    )}
                </div>
                <div className="ff:flex ff:shrink-0 ff:items-center ff:gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ff:h-7 ff:w-7"
                        onClick={() => onPreview(pattern.id)}
                        aria-label={sprintf(__("Preview %s"), pattern.name)}
                        title={__("Preview")}
                    >
                        <Eye aria-hidden className="ff:h-3.5 ff:w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ff:h-7 ff:w-7"
                        disabled={pattern.locked}
                        onClick={() => onAdd(pattern.id)}
                        aria-label={sprintf(__("Insert %s"), pattern.name)}
                        title={pattern.locked ? __("Available in Pro") : __("Insert after the selected block")}
                    >
                        {pattern.locked ? (
                            <Lock aria-hidden className="ff:h-3.5 ff:w-3.5" />
                        ) : (
                            <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
});
