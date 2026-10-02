import { useEffect, useState } from "react";

export type BuilderView = "list" | "visual";

/** Per-browser preference only; never part of the workflow config. */
const STORAGE_KEY = "flexa-formflow:workflow-view";

/** Below this the canvas and its side panel do not fit, so List is used. */
const NARROW_QUERY = "(max-width: 900px)";

function readStored(): BuilderView {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "visual" ? "visual" : "list";
    } catch {
        return "list";
    }
}

function isNarrow(): boolean {
    return typeof window.matchMedia === "function" && window.matchMedia(NARROW_QUERY).matches;
}

/**
 * The builder's List / Visual choice, remembered in this browser. On a narrow
 * screen the effective view is List whatever was chosen, and the choice is
 * kept for when the screen is wide again.
 */
export function useViewMode(): {
    view: BuilderView;
    chosen: BuilderView;
    narrow: boolean;
    setView: (view: BuilderView) => void;
} {
    const [chosen, setChosen] = useState<BuilderView>(readStored);
    const [narrow, setNarrow] = useState(isNarrow);

    useEffect(() => {
        if (typeof window.matchMedia !== "function") return;
        const query = window.matchMedia(NARROW_QUERY);
        const onChange = () => setNarrow(query.matches);
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, []);

    const setView = (view: BuilderView) => {
        setChosen(view);
        try {
            window.localStorage.setItem(STORAGE_KEY, view);
        } catch {
            // Storage blocked (private mode): the choice lasts for this visit only.
        }
    };

    return { view: narrow ? "list" : chosen, chosen, narrow, setView };
}
