import { findParentNode } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';

const unsetTableAlign = (
    state: EditorState,
    dispatch: ((args?: any) => any) | undefined
) => {
    const table = findParentNode(n => n.type.name === 'table')(state.selection);
    if (!table) return false;

  if (table.node.attrs?.locked) return false;

    const tr = state.tr;
    let changed = false;

    table.node.descendants((node, pos) => {
        if (node.type.name === 'tableRow' && node.attrs?.textAlign) {
            changed = true;
            const { textAlign, ...rest } = node.attrs;
            tr.setNodeMarkup(table.pos + 1 + pos, undefined, rest);
        }
    });

    if (changed && dispatch) dispatch(tr);
    return changed;
};

export default unsetTableAlign;
