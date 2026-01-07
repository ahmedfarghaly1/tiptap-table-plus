import { Table as TiptapTable } from '@tiptap/extension-table'
import TableCommandExtension from './TableCommandExtension';

export const TablePlus = TiptapTable.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            locked: {
                default: false,
                parseHTML: (element: HTMLElement) => {
                    const attr = element.getAttribute("data-locked");
                    return attr === "true" || attr === "1" || attr === "";
                },
                renderHTML: (attributes: { locked: boolean }) => {
                    return attributes.locked ? { "data-locked": "true" } : {};
                },
            },
        };
    },
    addExtensions() {
        return [
            TableCommandExtension
        ]
    }
})

export default TablePlus
