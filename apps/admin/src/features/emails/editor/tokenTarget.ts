/**
 * Where the Dynamic Data browser drops a merge tag: the field the user last
 * focused. Plain inputs and the rich-text editor each provide one.
 */
export interface TokenTarget {
    insert: (token: string) => void;
}

/** A target for an <input>/<textarea>: splice the token at the caret. */
export function inputTarget(el: HTMLInputElement | HTMLTextAreaElement, onChange: (value: string) => void): TokenTarget {
    return {
        insert: (token) => {
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            onChange(el.value.slice(0, start) + token + el.value.slice(end));
            const caret = start + token.length;
            window.requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(caret, caret);
            });
        },
    };
}
