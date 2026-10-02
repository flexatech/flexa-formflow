import type { ConditionSet } from "@/components/custom/SchemaFields";
import { parseLegacyMenu } from "../navigation";
import {
    cloneElementWithIds,
    findInTree,
    insertInTree,
    insertManyInTree,
    insertionTarget,
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
    // Fresh, independent copies of a pattern's blocks; null for an unknown or
    // locked (Pro on Free) pattern, which is never inserted.
    const patternBlocks = (patternId: string): EmailElement[] | null => {
        const pattern = patterns.find((p) => p.id === patternId);
        if (!pattern || pattern.locked) return null;
        return materializePattern(pattern.blocks);
    };

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
            const blocks = patternBlocks(patternId);
            if (!blocks) return;
            // Dropped inside a column: a pattern may hold columns itself, and
            // columns do not nest, so it lands after that columns row instead.
            const at = target.colId === null ? target : insertionTarget(elements, target.colId);
            setElements(insertManyInTree(elements, at, blocks));
            setSelectedElement(blocks[0]?.id ?? null);
        },
        /** Insert after the selected block, or at the end when nothing is selected. */
        onAddPattern: (patternId: string) => {
            const blocks = patternBlocks(patternId);
            if (!blocks) return;
            setElements(insertManyInTree(elements, insertionTarget(elements, selectedId), blocks));
            setSelectedElement(blocks[0]?.id ?? null);
        },
        /** Swap the whole list for the pattern's blocks (one undo step). */
        onReplaceWithPattern: (patternId: string) => {
            const blocks = patternBlocks(patternId);
            if (!blocks) return;
            setElements(blocks);
            setSelectedElement(blocks[0]?.id ?? null);
        },
        onMove: (id: string, target: DropTarget) => {
            setElements(moveInTree(elements, id, target));
        },
        onDuplicate: (elId: string) => {
            const source = findInTree(elements, elId);
            const { from } = removeFromTree(elements, elId);
            if (!source || !from) return;
            const clone = cloneElementWithIds(source);
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
        /**
         * Turn a Text block that is only a row of links into a Navigation block,
         * keeping its id, section background and visibility rules. One undo step.
         */
        onConvertToNavigation: (elId: string) => {
            const el = findInTree(elements, elId);
            if (!el || el.type !== "text" || typeof el.props.html !== "string") return;
            const align = el.props.align === "left" || el.props.align === "right" ? el.props.align : "center";
            const menu = parseLegacyMenu(el.props.html, align);
            if (!menu) return;
            const background = typeof el.props.background === "string" ? { background: el.props.background } : {};
            setElements(updateInTree(elements, elId, (old) => ({ ...old, type: "navigation", props: { ...menu.props, ...background } })));
        },
    };
}
