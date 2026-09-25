import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MousePointerClick, Trash2 } from "lucide-react";
import { useState } from "react";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/lib/store";
import { FIELD_TYPES, fieldTypeMeta, newField, type FieldType, type FormConfig, type FormField } from "../types";
import { Inspector } from "./Inspector";

interface BuildTabProps {
    config: FormConfig;
    onChange: (config: FormConfig) => void;
}

/**
 * Palette · canvas · inspector. Palette items add on click and drag onto the
 * canvas; canvas cards reorder with dnd-kit sortable.
 */
export function BuildTab({ config, onChange }: BuildTabProps) {
    const selectedFieldId = useUiStore((s) => s.selectedFieldId);
    const setSelectedField = useUiStore((s) => s.setSelectedField);
    const [paletteDrag, setPaletteDrag] = useState<FieldType | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const fields = config.fields;
    const setFields = (next: FormField[]) => onChange({ ...config, fields: next });

    const addField = (type: FieldType, index?: number) => {
        const field = newField(type);
        const next = [...fields];
        next.splice(index ?? fields.length, 0, field);
        setFields(next);
        setSelectedField(field.id);
    };

    const onDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.fromPalette) {
            setPaletteDrag(data.type as FieldType);
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        setPaletteDrag(null);
        const { active, over } = event;
        if (!over) return;

        if (active.data.current?.fromPalette) {
            const type = active.data.current.type as FieldType;
            const overIndex = fields.findIndex((f) => f.id === over.id);
            addField(type, overIndex === -1 ? undefined : overIndex);
            return;
        }

        if (active.id !== over.id) {
            const from = fields.findIndex((f) => f.id === active.id);
            const to = fields.findIndex((f) => f.id === over.id);
            if (from === -1 || to === -1) return;
            const next = [...fields];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            setFields(next);
        }
    };

    const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

    return (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="ff:grid ff:h-full ff:grid-cols-[13rem_1fr_17rem] ff:gap-0">
                <aside className="ff:overflow-y-auto ff:border-r ff:border-slate-200 ff:bg-white ff:p-3">
                    <p className="ff:mb-2 ff:px-1 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                        {__("Fields")}
                    </p>
                    <div className="ff:flex ff:flex-col ff:gap-1">
                        {FIELD_TYPES.map((meta) => (
                            <PaletteItem key={meta.type} type={meta.type} onAdd={() => addField(meta.type)} />
                        ))}
                    </div>
                </aside>

                <Canvas
                    fields={fields}
                    selectedId={selectedFieldId}
                    onSelect={setSelectedField}
                    onRemove={(id) => {
                        setFields(fields.filter((f) => f.id !== id));
                        if (selectedFieldId === id) setSelectedField(null);
                    }}
                />

                <aside className="ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                    <Inspector
                        config={config}
                        field={selected}
                        onChange={onChange}
                        onFieldChange={(patch) =>
                            selected &&
                            setFields(fields.map((f) => (f.id === selected.id ? { ...f, ...patch } : f)))
                        }
                    />
                </aside>
            </div>

            <DragOverlay>
                {paletteDrag ? <PaletteGhost type={paletteDrag} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function PaletteItem({ type, onAdd }: { type: FieldType; onAdd: () => void }) {
    const meta = fieldTypeMeta(type);
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `palette-${type}`,
        data: { fromPalette: true, type },
    });
    const Icon = meta.icon;

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={onAdd}
            className="ff:flex ff:cursor-grab ff:items-center ff:gap-2.5 ff:rounded-lg ff:border ff:border-transparent ff:bg-transparent ff:px-2.5 ff:py-2 ff:text-left ff:text-sm ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-slate-200 ff:hover:bg-slate-50"
            {...attributes}
            {...listeners}
        >
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
            {meta.label()}
        </button>
    );
}

function PaletteGhost({ type }: { type: FieldType }) {
    const meta = fieldTypeMeta(type);
    const Icon = meta.icon;
    return (
        <div className="ff:flex ff:rotate-2 ff:items-center ff:gap-2.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-2.5 ff:py-2 ff:text-sm ff:font-medium ff:text-slate-700 ff:shadow-lg">
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
            {meta.label()}
        </div>
    );
}

function Canvas({
    fields,
    selectedId,
    onSelect,
    onRemove,
}: {
    fields: FormField[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onRemove: (id: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

    return (
        <div className="ff:overflow-y-auto ff:p-6" onClick={() => onSelect(null)}>
            <div
                ref={setNodeRef}
                className={cn(
                    "ff:mx-auto ff:flex ff:max-w-xl ff:flex-col ff:gap-2 ff:rounded-xl ff:border ff:bg-white ff:p-5 ff:shadow-sm",
                    isOver && fields.length === 0 ? "ff:border-brand-500" : "ff:border-slate-200",
                )}
            >
                {fields.length === 0 ? (
                    <div className="ff:flex ff:min-h-48 ff:flex-col ff:items-center ff:justify-center ff:gap-2 ff:rounded-lg ff:border-2 ff:border-dashed ff:border-slate-200 ff:text-center">
                        <MousePointerClick aria-hidden className="ff:h-5 ff:w-5 ff:text-slate-400" />
                        <p className="ff:text-sm ff:text-slate-500">
                            {__("Click or drag a field from the left to start.")}
                        </p>
                    </div>
                ) : (
                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        {fields.map((field) => (
                            <FieldCard
                                key={field.id}
                                field={field}
                                selected={field.id === selectedId}
                                onSelect={() => onSelect(field.id)}
                                onRemove={() => onRemove(field.id)}
                            />
                        ))}
                    </SortableContext>
                )}
            </div>
        </div>
    );
}

function FieldCard({
    field,
    selected,
    onSelect,
    onRemove,
}: {
    field: FormField;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: field.id });
    const meta = fieldTypeMeta(field.type);
    const Icon = meta.icon;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                "ff:group ff:flex ff:items-center ff:gap-2 ff:rounded-lg ff:border ff:bg-white ff:px-3 ff:py-2.5 ff:transition-colors",
                selected
                    ? "ff:border-brand-500 ff:bg-brand-50/40 ff:ring-1 ff:ring-brand-500"
                    : "ff:border-slate-200 ff:hover:border-slate-300",
                isDragging && "ff:opacity-40",
            )}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
            <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={__("Reorder field")}
                className="ff:cursor-grab ff:touch-none ff:rounded ff:bg-transparent ff:p-1 ff:text-slate-300 ff:hover:text-slate-500"
                {...attributes}
                {...listeners}
            >
                <GripVertical aria-hidden className="ff:h-4 ff:w-4" />
            </button>
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
            <div className="ff:min-w-0 ff:flex-1">
                <p className="ff:truncate ff:text-sm ff:font-medium ff:text-slate-900">
                    {field.label || meta.label()}
                    {field.required ? <span className="ff:ml-1 ff:text-red-500">*</span> : null}
                </p>
                <p className="ff:text-xs ff:text-slate-400">
                    {meta.label()}
                    {field.width === "half" ? " · " + __("Half width") : ""}
                </p>
            </div>
            <button
                type="button"
                aria-label={__("Delete field")}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="ff:cursor-pointer ff:rounded ff:bg-transparent ff:p-1 ff:text-slate-300 ff:opacity-0 ff:transition-opacity ff:hover:text-red-600 ff:group-hover:opacity-100"
            >
                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </div>
    );
}
