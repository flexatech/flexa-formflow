import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { THUMB_ASPECT, emailViewport, fitWidthGeometry, thumbnailGeometry } from "../emailFrame";

interface Measured {
    height: number;
    background: string;
}

/**
 * A rendered email (the canonical HTML the email sends with, untouched) laid
 * out at a fixed desktop viewport and scaled down as one picture. Its own
 * document keeps WordPress and Tailwind styles out; no editor styles are
 * added. `fit="thumbnail"`: a fixed-aspect box with the whole email fitted in
 * and centred. `fit="width"`: as wide as the box, as tall as the email.
 *
 * The frame is inert (no scripts, no pointer events, no tab stop); the
 * control around it carries the label.
 */
export function ScaledEmailFrame({
    html,
    title,
    fit,
    className,
}: {
    html: string;
    title: string;
    fit: "thumbnail" | "width";
    className?: string;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [boxWidth, setBoxWidth] = useState(0);
    const [dpr, setDpr] = useState(() => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1));
    const [measured, setMeasured] = useState<Measured | null>(null);
    const viewport = emailViewport(html);

    // Only the box is observed: its width sets the scale, never the email's layout.
    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const read = () => {
            setBoxWidth(box.clientWidth);
            setDpr(window.devicePixelRatio || 1);
        };
        read();
        window.addEventListener("resize", read);
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
        observer?.observe(box);
        return () => {
            window.removeEventListener("resize", read);
            observer?.disconnect();
        };
    }, []);

    // A new document is measured again once it has loaded.
    useEffect(() => setMeasured(null), [html]);

    const measure = () => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.body) return;
        const height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
        if (height <= 1) return;
        setMeasured({ height, background: doc.defaultView?.getComputedStyle(doc.body).backgroundColor ?? "" });
    };

    const geometry =
        boxWidth > 0 && measured
            ? (fit === "thumbnail" ? thumbnailGeometry : fitWidthGeometry)(boxWidth, viewport, measured.height, dpr)
            : null;

    return (
        <div
            ref={boxRef}
            aria-hidden
            data-ff-email-frame={fit}
            className={cn("ff:relative ff:w-full ff:overflow-hidden", className)}
            style={{
                height: geometry ? geometry.boxHeight : fit === "width" ? 240 : undefined,
                aspectRatio: fit === "thumbnail" && !geometry ? String(THUMB_ASPECT) : undefined,
                // The email's own page colour fills the space around a short pattern.
                backgroundColor: measured?.background || undefined,
            }}
        >
            {!geometry && <div className="ff:absolute ff:inset-0 ff:animate-pulse ff:bg-slate-100" />}
            <iframe
                ref={frameRef}
                title={title}
                srcDoc={html}
                // Same origin only so the frame can be measured; scripts stay off.
                sandbox="allow-same-origin"
                scrolling="no"
                tabIndex={-1}
                onLoad={() => {
                    measure();
                    window.requestAnimationFrame(measure);
                }}
                style={{
                    position: "absolute",
                    left: geometry?.left ?? 0,
                    top: geometry?.top ?? 0,
                    display: "block",
                    // Inline and with max-width off: a host rule like
                    // `iframe { max-width: 100% }` must not narrow the email's viewport.
                    width: viewport,
                    minWidth: viewport,
                    maxWidth: "none",
                    // Until measured, a 1px frame so scrollHeight reports the email's own height.
                    height: measured?.height ?? 1,
                    maxHeight: "none",
                    border: 0,
                    margin: 0,
                    padding: 0,
                    transform: `scale(${geometry?.scale ?? 1})`,
                    transformOrigin: "0 0",
                    visibility: geometry ? "visible" : "hidden",
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
