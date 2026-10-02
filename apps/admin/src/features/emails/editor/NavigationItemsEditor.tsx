import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { __, sprintf } from "@/lib/i18n";
import { navUrlProblem, newNavItem, type NavigationItem } from "../navigation";
import { inputTarget, type TokenTarget } from "./tokenTarget";

/**
 * The link list of a Navigation block: a label and a URL per link, add and
 * remove, drag (or keyboard) to reorder, "open in a new tab". URLs accept
 * merge tags from the Dynamic Data browser and are checked as you type; the
 * server repeats the check and leaves out anything unsafe.
 */
export function NavigationItemsEditor({
    items,
    onChange,
    onFocusField,
}: {
    items: NavigationItem[];
    onChange: (items: NavigationItem[]) => void;
    onFocusField: (target: TokenTarget) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const update = (id: string, patch: Partial<NavigationItem>) =>
        onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = items.findIndex((i) => i.id === active.id);
        const to = items.findIndex((i) => i.id === over.id);
        onChange(arrayMove(items, from, to));
    };

    return (
        <div className="ff:flex ff:flex-col ff:gap-2">
            <Label className="ff:block">{__("Links")}</Label>
            {items.length === 0 && (
                <p className="ff:m-0 ff:rounded-lg ff:border ff:border-dashed ff:border-slate-300 ff:p-3 ff:text-center ff:text-xs ff:text-slate-500">
                    {__("No links yet. Add the first one below.")}
                </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <ul className="ff:m-0 ff:flex ff:list-none ff:flex-col ff:gap-2 ff:p-0">
                        {items.map((item, index) => (
                            <NavItemRow
                                key={item.id}
                                item={item}
                                index={index}
                                onChange={(patch) => update(item.id, patch)}
                                onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
                                onFocusField={onFocusField}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
            <Button variant="outline" size="sm" onClick={() => onChange([...items, newNavItem(__("New link"), "{site_url}")])}>
                <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Add link")}
            </Button>
        </div>
    );
}

function NavItemRow({
    item,
    index,
    onChange,
    onRemove,
    onFocusField,
}: {
    item: NavigationItem;
    index: number;
    onChange: (patch: Partial<NavigationItem>) => void;
    onRemove: () => void;
    onFocusField: (target: TokenTarget) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const problem = navUrlProblem(item.url);
    const urlId = `ff-nav-url-${item.id}`;
    const errorId = `${urlId}-error`;

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className="ff:flex ff:gap-2 ff:rounded-item ff:border ff:border-slate-200 ff:bg-white ff:p-2"
            data-dragging={isDragging || undefined}
        >
            <button
                type="button"
                className="ff:mt-1.5 ff:h-6 ff:w-5 ff:shrink-0 ff:cursor-grab ff:border-0 ff:bg-transparent ff:p-0 ff:text-slate-400 ff:hover:text-slate-700"
                aria-label={sprintf(__("Reorder link %d"), index + 1)}
                {...attributes}
                {...listeners}
            >
                <GripVertical aria-hidden className="ff:h-4 ff:w-4" />
            </button>
            <div className="ff:flex ff:min-w-0 ff:flex-1 ff:flex-col ff:gap-1.5">
                <Input
                    aria-label={sprintf(__("Link %d label"), index + 1)}
                    value={item.label}
                    placeholder={__("Label")}
                    onFocus={(e) => onFocusField(inputTarget(e.currentTarget, (v) => onChange({ label: v })))}
                    onChange={(e) => onChange({ label: e.target.value })}
                />
                <Input
                    id={urlId}
                    aria-label={sprintf(__("Link %d URL"), index + 1)}
                    aria-invalid={problem !== null}
                    aria-describedby={problem ? errorId : undefined}
                    value={item.url}
                    placeholder="https://… or {site_url}"
                    onFocus={(e) => onFocusField(inputTarget(e.currentTarget, (v) => onChange({ url: v })))}
                    onChange={(e) => onChange({ url: e.target.value })}
                    spellCheck={false}
                />
                {problem && (
                    <p id={errorId} className="ff:m-0 ff:text-[11px] ff:text-red-700">
                        {problem === "empty"
                            ? __("Add a URL, or this link is left out of the email.")
                            : __("Use a full web address (https://…), mailto:, tel:, or a merge tag such as {site_url}. This link is left out until it is fixed.")}
                    </p>
                )}
                <label className="ff:flex ff:items-center ff:gap-1.5 ff:text-[11px] ff:text-slate-600">
                    <input
                        type="checkbox"
                        className="flexa-formflow-check"
                        checked={item.target === "_blank"}
                        onChange={(e) => onChange({ target: e.target.checked ? "_blank" : undefined })}
                    />
                    {__("Open in a new tab")}
                </label>
            </div>
            <button
                type="button"
                onClick={onRemove}
                aria-label={sprintf(__("Remove link %d"), index + 1)}
                className="ff:mt-1.5 ff:h-6 ff:w-6 ff:shrink-0 ff:cursor-pointer ff:border-0 ff:bg-transparent ff:p-0 ff:text-slate-400 ff:hover:text-red-600"
            >
                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </li>
    );
}
