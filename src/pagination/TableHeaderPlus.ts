import TableHeader from "@tiptap/extension-table-header";
import { mergeAttributes } from "@tiptap/core";

export const TableHeaderPlus = TableHeader.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: (element: HTMLElement) =>
                    element.getAttribute("data-header-bg") ||
                    element.style.backgroundColor ||
                    null,
                renderHTML: (attrs: { backgroundColor?: string | null }) => {
                    if (!attrs.backgroundColor) return {};
                    return {
                        "data-header-bg": attrs.backgroundColor,
                        style: `background-color:${attrs.backgroundColor}`,
                    };
                },
            },
        };
    },
    addNodeView() {
        return ({ node }) => {
          const tableNode = this.editor.extensionManager.extensions.find((extension) => extension.name === "table");
          const borderColor = tableNode ? tableNode.options.borderColor : "black";
          const dom = document.createElement('th');
          dom.style.border = `1px solid ${borderColor}`;
          const applyBackground = (n: typeof node) => {
            const bg = n.attrs.backgroundColor;
            dom.style.backgroundColor = bg || "var(--color-secondary, #f5f5f5)";
            if (bg) {
              dom.setAttribute("data-header-bg", bg);
            } else {
              dom.removeAttribute("data-header-bg");
            }
          };
          applyBackground(node);
          let colspan = node.attrs.colspan;
          let rowspan = node.attrs.rowspan;
          const updateGrid = (colspan: number, rowspan: number) => {
            dom.style.gridColumn = `auto / span ${colspan || 1}`;
            dom.rowSpan = rowspan || 1;
            dom.setAttribute("colspan", `${colspan || 1}`);
          };
      
          updateGrid(colspan, rowspan);
      
          return {
            dom,
            contentDOM :  dom,
      
            update(updatedNode) {
              if (updatedNode.type.name !== 'tableHeader') {
                return false;
              }
              const updatedColspan = updatedNode.attrs.colspan;
              if (updatedColspan !== colspan) {
                colspan = updatedColspan;
                updateGrid(updatedColspan, rowspan);
              }
              applyBackground(updatedNode);
              return true;
            },
          };
        };
      },
    renderHTML({ HTMLAttributes }) {
        const existingStyle = HTMLAttributes.style || "";
        const backgroundColor = HTMLAttributes['data-header-bg'] || null;
        const baseBg = backgroundColor
            ? `background-color: ${backgroundColor}`
            : "background-color: var(--color-secondary, #f5f5f5)";
        const mergedStyle = existingStyle 
            ? `${baseBg}; ${existingStyle}` 
            : baseBg;
        
        return [
            "th",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                style: mergedStyle,
            }),
            0,
        ];
    },
})

export default TableHeaderPlus
