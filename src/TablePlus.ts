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
            borderColor: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("data-border-color"),
                renderHTML: (attributes: { borderColor: string | null }) => {
                    return attributes.borderColor
                        ? { "data-border-color": attributes.borderColor, style: `--table-border-color:${attributes.borderColor}` }
                        : {};
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
