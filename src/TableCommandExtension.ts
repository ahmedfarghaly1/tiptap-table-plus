import { Extension } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { Transaction } from '@tiptap/pm/state';
import duplicateColumn from "./commands/duplicateColumn";
import duplicateRow from "./commands/duplicateRow";
import setTableAlign from "./commands/setTableAlign";
import unsetTableAlign from "./commands/unsetTableAlign";

export const TableCommandExtension = Extension.create({
    name: "tableCommandExtension",

    addCommands() {
        return {
            duplicateColumn:
                (withContent = true) =>
                    ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
                        duplicateColumn(state, dispatch, withContent);
                        return true;
                    },
            duplicateRow:
                (withContent = true) =>
                    ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
                        duplicateRow(state, dispatch, withContent);
                        return true;
                    },
            setTableAlign:
                (align: 'left' | 'center' | 'right' | 'start' | 'end' | 'justify') =>
                    ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
                        return setTableAlign(state, dispatch, align);
                    },
            unsetTableAlign:
                () =>
                    ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
                        return unsetTableAlign(state, dispatch);
                    },
        };
    },
});
export default TableCommandExtension;
