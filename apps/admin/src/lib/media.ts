/**
 * Bridge to the WordPress Media Library modal (`wp.media`), which
 * Enqueue::enqueue_admin loads with wp_enqueue_media(). Only the slice the
 * image pickers need is typed here.
 */

export interface MediaImage {
    id: number;
    url: string;
    alt: string;
    width: number;
    height: number;
    mime: string;
}

interface MediaAttachmentJson {
    id?: number;
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
    mime?: string;
}

interface MediaFrame {
    on(event: "select", handler: () => void): void;
    open(): void;
    state(): { get(key: "selection"): { first(): { toJSON(): MediaAttachmentJson } | undefined } };
}

type MediaFactory = (options: {
    title: string;
    button: { text: string };
    library: { type: string };
    multiple: boolean;
}) => MediaFrame;

declare global {
    interface WpGlobal {
        media?: MediaFactory;
    }
}

/** Whether the Media Library can be opened by this user on this page. */
export function canUseMediaLibrary(): boolean {
    // wp_localize_script sends booleans as "1" / "", so coerce.
    return typeof window.wp?.media === "function" && Boolean(window.flexaFormFlow?.canUpload);
}

/**
 * Open the Media Library to upload or pick one image. Returns false when the
 * library is not available, so the caller can say so.
 */
export function openMediaPicker({
    title,
    buttonText,
    onSelect,
}: {
    title: string;
    buttonText: string;
    onSelect: (image: MediaImage) => void;
}): boolean {
    const media = window.wp?.media;
    if (typeof media !== "function") return false;

    const frame = media({ title, button: { text: buttonText }, library: { type: "image" }, multiple: false });
    frame.on("select", () => {
        const picked = frame.state().get("selection").first()?.toJSON();
        if (!picked?.url) return;
        onSelect({
            id: picked.id ?? 0,
            url: picked.url,
            alt: picked.alt ?? "",
            width: picked.width ?? 0,
            height: picked.height ?? 0,
            mime: picked.mime ?? "",
        });
    });
    frame.open();
    return true;
}
