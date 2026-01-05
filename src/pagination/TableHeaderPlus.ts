import TableHeader from "@tiptap/extension-table-header";
import { mergeAttributes } from "@tiptap/core";

export const TableHeaderPlus = TableHeader.extend({
    addNodeView() {
        return ({ node }) => {
          const tableNode = this.editor.extensionManager.extensions.find((extension) => extension.name === "table");
          const borderColor = tableNode ? tableNode.options.borderColor : "black";
          const dom = document.createElement('th');
          dom.style.border = `1px solid ${borderColor}`;
          dom.style.backgroundColor = "var(--color-secondary, #f5f5f5)";
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
              return true;
            },
          };
        };
      },
    renderHTML({ HTMLAttributes }) {
        const existingStyle = HTMLAttributes.style || "";
        const backgroundColor = "background-color: var(--color-secondary, #f5f5f5)";
        const mergedStyle = existingStyle 
            ? `${backgroundColor}; ${existingStyle}` 
            : backgroundColor;
        
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
