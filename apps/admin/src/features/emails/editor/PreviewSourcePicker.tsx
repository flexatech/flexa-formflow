import { useMemo, useState } from "react";
import { SearchSelect, useDebouncedValue, type SearchSelectOption } from "@/components/custom/SearchSelect";
import { useFormsList } from "@/features/forms/useForms";
import { useWooOrderSearch } from "@/features/woocommerce/useWooEmails";
import { __, sprintf } from "@/lib/i18n";
import { sampleSource, type PreviewSource } from "../types";

/**
 * "Preview with data from": sample data, a form (its latest entry), or, with
 * WooCommerce, an order. Forms and orders are searched on the server, so a
 * site with hundreds of either can still find the one it wants.
 */
export function PreviewSourcePicker({
    value,
    onChange,
    className,
    align,
}: {
    value: PreviewSource;
    onChange: (source: PreviewSource) => void;
    className?: string;
    align?: "left" | "right";
}) {
    // wp_localize_script sends booleans as "1" / "", so coerce.
    const hasWoo = Boolean(window.flexaFormFlow?.hasWooCommerce);
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());

    const forms = useFormsList({ search: term, per_page: 20 });
    const orders = useWooOrderSearch(term, hasWoo);

    const options = useMemo<SearchSelectOption[]>(() => {
        const list: SearchSelectOption[] = [];
        if (term === "") list.push({ value: "sample", label: sampleSource().label });
        for (const form of forms.data?.items ?? []) {
            list.push({ value: `form:${form.id}`, label: form.title || __("Untitled form"), group: __("Forms") });
        }
        for (const order of hasWoo ? (orders.data ?? []) : []) {
            list.push({ value: `order:${order.id}`, label: order.label, group: __("WooCommerce orders") });
        }
        return list;
    }, [term, forms.data, orders.data, hasWoo]);

    const current = value.orderId > 0 ? `order:${value.orderId}` : value.formId > 0 ? `form:${value.formId}` : "sample";

    const pick = (option: SearchSelectOption) => {
        const [kind, raw] = option.value.split(":");
        const id = Number(raw ?? 0);
        if (kind === "form") onChange({ formId: id, orderId: 0, label: option.label });
        else if (kind === "order") onChange({ formId: 0, orderId: id, label: option.label });
        else onChange(sampleSource());
    };

    return (
        <SearchSelect
            ariaLabel={__("Preview data source")}
            value={current}
            valueLabel={value.label}
            options={options}
            search={search}
            onSearchChange={setSearch}
            onChange={pick}
            loading={forms.isFetching || (hasWoo && orders.isFetching)}
            placeholder={hasWoo ? __("Search forms, or orders by number, name or email…") : __("Search forms…")}
            emptyText={term === "" ? __("Nothing to preview with yet.") : sprintf(__('Nothing matches "%s".'), term)}
            className={className}
            align={align}
        />
    );
}
