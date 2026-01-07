import { findParentNode } from "@tiptap/core";
import { EditorState, Transaction } from "@tiptap/pm/state";

const setTableBorderColor =
  (color: string | null) =>
  ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
    const table = findParentNode((n) => n.type.name === "table")(state.selection);
    if (!table) return false;
    const tr = state.tr.setNodeMarkup(table.pos, undefined, {
      ...table.node.attrs,
      borderColor: color,
    });

    if (dispatch) dispatch(tr);
    return true;
  };

export default setTableBorderColor;

