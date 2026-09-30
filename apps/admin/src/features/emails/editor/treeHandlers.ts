import type { ConditionSet } from "@/components/custom/SchemaFields";
import {
    findInTree,
    insertInTree,
    insertManyInTree,
    materializePattern,
    moveInTree,
    newElement,
    removeFromTree,
    resizeColumns,
    updateInTree,
    type DropTarget,
    type EmailElement,
    type EmailPattern,
} from "../types";

/** Deep-copy an element (and any column children) with fresh ids. */
function cloneWithIds(source: EmailElement): EmailElement {
    const copy: EmailElement = { ...newElement(source.type), props: { ...source.props } };
    if (source.columns) {
        copy.columns = source.columns.map((col) => col.map(cloneWithIds));
    }
    if (source.visibility) {
        copy.visibility = { match: source.visibility.match, rules: source.visibility.rules.map((r) => ({ ...r })) };
    }
    return copy;
}

interface TreeHandlerDeps {
    elements: EmailElement[];
    /** `key` groups rapid edits to one target into one undo step; omit it for a structural edit. */
    setElements: (next: EmailElement[], key?: string) => void;
    patterns: EmailPattern[];
    selectedId: string | null;
    setSelectedElement: (id: string | null) => void;
}

/**
 * The block-editing actions the layer list, canvas and props panel call: add,
 * insert, move, duplicate, delete and edit. Shared by every screen that edits
 * a block list (a template, the global header/footer), which each supply where
 * the list lives and how a new version of it is stored.
 */
export function createTreeHandlers({ elements, setElements, patterns, selectedId, setSelectedElement }: TreeHandlerDeps) {
    return {
        onAdd: (type: string) => {
            const element = newElement(type);
            setElements([...elements, element]);
            setSelectedElement(element.id);
        },
        onInsertAt: (type: string, target: DropTarget) => {
            const element = newElement(type);
            setElements(insertInTree(elements, target, element));
            setSelectedElement(element.id);
        },
        onInsertPatternAt: (patternId: string, target: DropTarget) => {
            const pattern = patterns.find((p) => p.id === patternId);
            if (!pattern) return;
            const blocks = materializePattern(pattern.blocks);
            setElements(insertManyInTree(elements, target, blocks));
            setSelectedElement(blocks[0]?.id ?? null);
        },
        onAddPattern: (patternId: string) => {
            const pattern = patterns.find((p) => p.id === patternId);
            if (!pattern) return;
            const blocks = materializePattern(pattern.blocks);
            setElements([...elements, ...blocks]);
            setSelectedElement(blocks[0]?.id ?? null);
        },
        onMove: (id: string, target: DropTarget) => {
            setElements(moveInTree(elements, id, target));
        },
        onDuplicate: (elId: string) => {
            const source = findInTree(elements, elId);
            const { from } = removeFromTree(elements, elId);
            if (!source || !from) return;
            const clone = cloneWithIds(source);
            setElements(insertInTree(elements, { ...from, index: from.index + 1 }, clone));
            setSelectedElement(clone.id);
        },
        onDelete: (elId: string) => {
            setElements(removeFromTree(elements, elId).elements);
            if (selectedId === elId) setSelectedElement(null);
        },
        onChangeProps: (elId: string, props: Record<string, unknown>) =>
            setElements(updateInTree(elements, elId, (el) => ({ ...el, props })), `props:${elId}`),
        onChangeVisibility: (elId: string, visibility: ConditionSet) =>
            setElements(
                updateInTree(elements, elId, (el) => {
                    if (visibility.rules.length === 0) {
                        const { visibility: _drop, ...rest } = el;
                        return rest;
                    }
                    return { ...el, visibility };
                }),
                `visibility:${elId}`,
            ),
        onChangeColumnCount: (elId: string, count: number) =>
            setElements(updateInTree(elements, elId, (el) => resizeColumns(el, count))),
        onReorder: (next: EmailElement[]) => setElements(next),
    };
}
