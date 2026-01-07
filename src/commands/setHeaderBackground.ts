import { findParentNode } from "@tiptap/core";
import { EditorState, Transaction } from "@tiptap/pm/state";

const setHeaderBackground = (
  color: string | null
) => ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
  const table = findParentNode((n) => n.type.name === "table")(state.selection);
  if (!table) return false;

  const tr = state.tr;
  let changed = false;

  table.node.descendants((node, pos) => {
    if (node.type.name === "tableHeader") {
      const attrs = node.attrs || {};
      const nextAttrs = color
        ? { ...attrs, backgroundColor: color }
        : (() => {
            const { backgroundColor, ...rest } = attrs;
            return rest;
          })();

      if (attrs.backgroundColor !== nextAttrs.backgroundColor) {
        tr.setNodeMarkup(table.pos + 1 + pos, undefined, nextAttrs);
        changed = true;
      }
    }
  });

  if (changed && dispatch) dispatch(tr);
  return changed;
};

export default setHeaderBackground;

