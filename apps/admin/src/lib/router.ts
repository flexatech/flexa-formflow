/**
 * Dependency-free hash router. Routes:
 *   #/               → dashboard
 *   #/forms          → forms list
 *   #/forms/:id/edit → form builder (full-area takeover, no sidebar)
 *   #/entries        → entries list
 *   #/entries/:id    → entry detail
 *   #/emails         → email templates list
 *   #/emails/:id/edit → email editor (full-area takeover, no sidebar)
 *   #/settings       → settings
 * Upcoming sections (workflows, integrations) stay parseable but are only
 * reachable when the SHOW_UPCOMING flag in main.tsx is on.
 */

export type Route =
    | { name: "dashboard" }
    | { name: "forms" }
    | { name: "builder"; id: number }
    | { name: "entries" }
    | { name: "entry"; id: number }
    | { name: "emails" }
    | { name: "emailEditor"; id: number }
    | { name: "workflows" }
    | { name: "integrations" }
    | { name: "settings" };

export function parseHash(hash: string): Route {
    const segments = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [head, second, third] = segments;

    switch (head) {
        case "forms":
            if (second && /^\d+$/.test(second) && third === "edit") {
                return { name: "builder", id: parseInt(second, 10) };
            }
            return { name: "forms" };
        case "entries":
            if (second && /^\d+$/.test(second)) {
                return { name: "entry", id: parseInt(second, 10) };
            }
            return { name: "entries" };
        case "emails":
            if (second && /^\d+$/.test(second) && third === "edit") {
                return { name: "emailEditor", id: parseInt(second, 10) };
            }
            return { name: "emails" };
        case "workflows":
            return { name: "workflows" };
        case "integrations":
            return { name: "integrations" };
        case "settings":
            return { name: "settings" };
        default:
            return { name: "dashboard" };
    }
}

export function currentRoute(): Route {
    return parseHash(window.location.hash);
}

export function navigate(path: string): void {
    window.location.hash = path.startsWith("/") ? path : `/${path}`;
}
