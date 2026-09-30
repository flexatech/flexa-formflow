import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 100;
/** Changes with the same key closer together than this collapse into one step. */
const COALESCE_MS = 500;

export interface UndoHistory<T> {
    /**
     * Call with the value as it was *before* a change. Passing the same `key`
     * for rapid, related changes (typing into one block's field) merges them
     * into a single undo step; omit it for structural changes that should
     * always be their own step.
     */
    record: (before: T, key?: string) => void;
    /** Returns the value to restore, or null when there is nothing to undo. */
    undo: (current: T) => T | null;
    /** Returns the value to restore, or null when there is nothing to redo. */
    redo: (current: T) => T | null;
    canUndo: boolean;
    canRedo: boolean;
}

/**
 * Snapshot-based undo/redo for an editor document. The caller keeps owning the
 * value; this only remembers earlier and undone versions of it. Session-only:
 * the stacks live in refs and start empty on every mount.
 */
export function useUndoHistory<T>(): UndoHistory<T> {
    const past = useRef<T[]>([]);
    const future = useRef<T[]>([]);
    const last = useRef<{ key: string; at: number } | null>(null);
    // The stacks are refs (so record/undo stay stable); this re-renders the
    // editor so canUndo/canRedo reflect them.
    const [, setVersion] = useState(0);
    const refresh = () => setVersion((v) => v + 1);

    const record = useCallback((before: T, key?: string) => {
        const now = Date.now();
        const merge = key !== undefined && last.current?.key === key && now - last.current.at < COALESCE_MS;
        last.current = key !== undefined ? { key, at: now } : null;
        future.current = [];
        if (!merge) {
            past.current.push(before);
            if (past.current.length > LIMIT) past.current.shift();
        }
        refresh();
    }, []);

    const undo = useCallback((current: T): T | null => {
        const previous = past.current.pop();
        if (previous === undefined) return null;
        future.current.push(current);
        last.current = null;
        refresh();
        return previous;
    }, []);

    const redo = useCallback((current: T): T | null => {
        const next = future.current.pop();
        if (next === undefined) return null;
        past.current.push(current);
        last.current = null;
        refresh();
        return next;
    }, []);

    return {
        record,
        undo,
        redo,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
    };
}

/** True when a key event comes from a field that has its own native undo. */
function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo, while the editor is
 * mounted. Inside a text field the chord is left to the field's own undo.
 * `onStep` may change every render; the listener always calls the latest one.
 */
export function useUndoShortcuts(onStep: (direction: "undo" | "redo") => void): void {
    const onStepRef = useRef(onStep);
    onStepRef.current = onStep;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const key = event.key.toLowerCase();
            const isUndo = key === "z" && !event.shiftKey;
            const isRedo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
            if ((!isUndo && !isRedo) || isTextEditingTarget(event.target)) return;
            event.preventDefault();
            onStepRef.current(isUndo ? "undo" : "redo");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
}
