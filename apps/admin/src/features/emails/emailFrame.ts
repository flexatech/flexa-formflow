/**
 * Geometry for showing a rendered email scaled down (pattern thumbnails, the
 * pattern preview dialog). The email is laid out once at a fixed logical
 * viewport, like a desktop inbox, and the whole result is scaled to the box.
 * The box width never reaches the email's layout, so a narrow sidebar cannot
 * trip the email's phone rule (`max-width: width + 20px`) and stack columns
 * the inbox shows side by side.
 */

/** Logical viewport for a 600px email: 600 + the renderer's 12px gutters, with room to spare. */
export const EMAIL_VIEWPORT = 640;

/** Thumbnail frame: one aspect for every card, so a category lines up. */
export const THUMB_ASPECT = 16 / 9;

/**
 * The logical viewport to lay a rendered email out at: at least
 * EMAIL_VIEWPORT, and always wider than the container's phone breakpoint
 * (width + 20px) when the design uses a wider email.
 */
export function emailViewport(html: string): number {
    const match = /class="ff-container"[^>]*\swidth="(\d+)"/.exec(html);
    const width = match ? Number(match[1]) : 0;
    return Math.max(EMAIL_VIEWPORT, width > 0 ? width + 40 : 0);
}

export interface FrameGeometry {
    /** Wrapper height in CSS px. */
    boxHeight: number;
    scale: number;
    /** Where the scaled email's top-left corner sits in the wrapper. */
    left: number;
    top: number;
}

/** Snap to the device pixel grid so a scaled frame never sits on half a pixel. */
export function snap(value: number, dpr: number): number {
    const ratio = dpr > 0 ? dpr : 1;
    return Math.round(value * ratio) / ratio;
}

/**
 * Thumbnail: a fixed-aspect box; the email is scaled to fit it whole
 * (never cropped), centred.
 */
export function thumbnailGeometry(boxWidth: number, viewport: number, contentHeight: number, dpr = 1): FrameGeometry {
    const boxHeight = snap(boxWidth / THUMB_ASPECT, dpr);
    const height = Math.max(1, contentHeight);
    const scale = Math.min(boxWidth / viewport, boxHeight / height);
    return {
        boxHeight,
        scale,
        left: snap((boxWidth - viewport * scale) / 2, dpr),
        top: snap(Math.max(0, (boxHeight - height * scale) / 2), dpr),
    };
}

/**
 * Large preview: the email's full width fits the box (never upscaled), and the
 * box is as tall as the scaled email.
 */
export function fitWidthGeometry(boxWidth: number, viewport: number, contentHeight: number, dpr = 1): FrameGeometry {
    const scale = Math.min(1, boxWidth / viewport);
    return {
        boxHeight: snap(Math.max(1, contentHeight) * scale, dpr),
        scale,
        left: snap(Math.max(0, (boxWidth - viewport * scale) / 2), dpr),
        top: 0,
    };
}
