import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type UIEvent } from "react";

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 1.75;
const PAD = 48;
const PAN_STEP = 48;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * Pan and zoom for the workflow canvas, as a CSS transform on one layer (no
 * canvas library). Drag the background or scroll to pan, Ctrl/Cmd + scroll or
 * the controls to zoom, and the canvas keys (arrows, + / -, 0) when it has
 * focus. `fit` frames the whole flow; it runs once the canvas has a size.
 */
export function useCanvasViewport(content: { width: number; height: number }, onBackgroundClick?: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const drag = useRef<{ id: number; x: number; y: number; moved: number } | null>(null);
    // Until the user pans or zooms, keep the flow framed as the canvas resizes
    // (its height settles after mount; the side panel narrows it).
    const touched = useRef(false);
    const contentRef = useRef(content);
    contentRef.current = content;

    const fit = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        const c = contentRef.current;
        const zoom = clampZoom(Math.min(1, (width - PAD * 2) / c.width, (height - PAD * 2) / c.height));
        // A flow taller than the canvas even at minimum zoom starts at the top.
        const y = c.height * zoom > height - PAD * 2 ? PAD : (height - c.height * zoom) / 2;
        setView({ x: (width - c.width * zoom) / 2, y, zoom });
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") {
            fit();
            return;
        }
        const observer = new ResizeObserver(() => {
            if (!touched.current) fit();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [fit]);

    // A step added or removed reframes too, while the user has not moved the view.
    useEffect(() => {
        if (!touched.current) fit();
    }, [content.height, fit]);

    /** Frame the whole flow, and keep it framed through later resizes. */
    const fitView = useCallback(() => {
        touched.current = false;
        fit();
    }, [fit]);

    /** Zoom by `factor`, keeping the canvas point under (px, py) still (default: the centre). */
    const zoomBy = useCallback((factor: number, px?: number, py?: number) => {
        touched.current = true;
        const rect = ref.current?.getBoundingClientRect();
        const cx = px ?? (rect ? rect.width / 2 : 0);
        const cy = py ?? (rect ? rect.height / 2 : 0);
        setView((v) => {
            const next = clampZoom(v.zoom * factor);
            const ratio = next / v.zoom;
            return { zoom: next, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
        });
    }, []);

    // Wheel needs a non-passive listener to keep the page from scrolling.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const rect = el.getBoundingClientRect();
                zoomBy(Math.exp(-e.deltaY * 0.0025), e.clientX - rect.left, e.clientY - rect.top);
            } else {
                touched.current = true;
                setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
            }
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [zoomBy]);

    // Background drag pans; drags that start on a node or a control do not.
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("[data-ff-canvas-stop]")) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        drag.current = { id: d.id, x: e.clientX, y: e.clientY, moved: d.moved + Math.abs(dx) + Math.abs(dy) };
        touched.current = true;
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (d?.id !== e.pointerId) return;
        drag.current = null;
        // A click on the background (not a drag) clears the selection.
        if (e.type === "pointerup" && d.moved < 4) onBackgroundClick?.();
    };

    // Keys apply only while the canvas itself (not a node inside it) has focus.
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;
        const pan: Record<string, [number, number]> = {
            ArrowLeft: [PAN_STEP, 0],
            ArrowRight: [-PAN_STEP, 0],
            ArrowUp: [0, PAN_STEP],
            ArrowDown: [0, -PAN_STEP],
        };
        if (pan[e.key]) {
            e.preventDefault();
            const [dx, dy] = pan[e.key];
            touched.current = true;
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoomBy(1.2);
        } else if (e.key === "-" || e.key === "_") {
            e.preventDefault();
            zoomBy(1 / 1.2);
        } else if (e.key === "0") {
            e.preventDefault();
            fitView();
        }
    };

    // Focusing a node outside the view makes the browser scroll this
    // overflow-hidden box, which would shift the controls and misalign the
    // grid. Turn that scroll into a pan instead, so the node still comes into view.
    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const dx = el.scrollLeft;
        const dy = el.scrollTop;
        if (dx === 0 && dy === 0) return;
        el.scrollLeft = 0;
        el.scrollTop = 0;
        touched.current = true;
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
    };

    return {
        ref,
        view,
        fit: fitView,
        zoomIn: () => zoomBy(1.2),
        zoomOut: () => zoomBy(1 / 1.2),
        handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown, onScroll },
    };
}
