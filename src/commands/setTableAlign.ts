import { findParentNode } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';

const setTableAlign = (
    state: EditorState,
    dispatch: ((args?: any) => any) | undefined,
    align: 'left' | 'center' | 'right' | 'start' | 'end' | 'justify'
) => {
    const table = findParentNode(n => n.type.name === 'table')(state.selection);
    if (!table) return false;

    const tr = state.tr;
    let changed = false;

    table.node.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
            changed = true;
            tr.setNodeMarkup(table.pos + 1 + pos, undefined, {
                ...node.attrs,
                textAlign: align,
            });
        }
    });

    if (changed && dispatch) dispatch(tr);
    return changed;
};

export default setTableAlign;
