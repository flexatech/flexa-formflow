import { useMemo, useState } from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/custom/SearchSelect";
import { useWooEmails } from "@/features/woocommerce/useWooEmails";
import { __ } from "@/lib/i18n";
import { useEmailTemplatesList } from "../useEmailTemplates";

/**
 * Jump to another template without going back to the list. Templates a
 * WooCommerce email uses are grouped first and named with those emails, so
 * "Processing order" finds the template behind it.
 */
export function TemplateSwitcher({ currentId, onSwitch }: { currentId: number; onSwitch: (id: number) => void }) {
    // wp_localize_script sends booleans as "1" / "", so coerce.
    const hasWoo = Boolean(window.flexaFormFlow?.hasWooCommerce);
    const { data: templates = [] } = useEmailTemplatesList();
    const { data: woo } = useWooEmails(hasWoo);
    const [search, setSearch] = useState("");

    const options = useMemo<SearchSelectOption[]>(() => {
        const usedBy = new Map<number, string[]>();
        for (const email of woo?.emails ?? []) {
            if (email.enabled && email.templateId > 0) {
                usedBy.set(email.templateId, [...(usedBy.get(email.templateId) ?? []), email.title]);
            }
        }
        const term = search.trim().toLowerCase();
        const rows = templates.map((t) => {
            const uses = usedBy.get(t.id) ?? [];
            const title = t.title || __("Untitled template");
            return {
                value: String(t.id),
                label: uses.length > 0 ? `${title} · ${uses.join(", ")}` : title,
                group: uses.length > 0 ? __("WooCommerce emails") : __("Other templates"),
            };
        });
        const matches = term === "" ? rows : rows.filter((r) => r.label.toLowerCase().includes(term));
        // Woo-used templates first, keeping the list order inside each group.
        return [
            ...matches.filter((r) => r.group === __("WooCommerce emails")),
            ...matches.filter((r) => r.group !== __("WooCommerce emails")),
        ];
    }, [templates, woo, search]);

    return (
        <SearchSelect
            ariaLabel={__("Switch to another email")}
            value={String(currentId)}
            valueLabel={__("Switch email…")}
            options={options}
            search={search}
            onSearchChange={setSearch}
            onChange={(option) => {
                const id = Number(option.value);
                if (id !== currentId) onSwitch(id);
            }}
            placeholder={__("Search templates or WooCommerce emails…")}
            emptyText={__("No templates match.")}
            className="ff:w-44 ff:min-w-44 ff:shrink-0"
        />
    );
}
