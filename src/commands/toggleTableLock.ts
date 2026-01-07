import { findParentNode } from "@tiptap/core";
import { EditorState, Transaction } from "@tiptap/pm/state";

const toggleTableLock = (
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined
) => {
  const table = findParentNode((n) => n.type.name === "table")(state.selection);
  if (!table) return false;

  const nextLocked = !Boolean(table.node.attrs?.locked);

  const tr = state.tr.setNodeMarkup(table.pos, undefined, {
    ...table.node.attrs,
    locked: nextLocked,
  });

  if (dispatch) dispatch(tr);
  return true;
};

export default toggleTableLock;

