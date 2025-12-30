import { Node } from "@tiptap/pm/model";
import { Editor } from "@tiptap/core";

export class TablePlusNodeView {
    node: Node;
    getPos: () => number | undefined;
    editor: Editor;
    dom: HTMLElement;
    contentDOM: HTMLElement;

    maxCellCount: number;
    cellPercentage: number[];
    columnSize: string;

    slider: HTMLElement;
    handles: HTMLElement[];
    options: any;

    isRTL: boolean;

    //  observe dir/lang changes (system/app toggle)
    private dirObserver?: MutationObserver;

    constructor(
        node: Node,
        getPos: () => number | undefined,
        editor: Editor,
        options: any
    ) {
        this.node = node;
        this.columnSize = node.attrs.columnSize;
        this.getPos = getPos;
        this.editor = editor;
        this.options = options;

        this.isRTL = this.getIsRTL();

        this.dom = document.createElement("div");
        this.dom.style.position = "relative";

        this.maxCellCount = 0;
        this.cellPercentage = [];
        this.handles = [];

        this.slider = document.createElement("div");
        this.slider.contentEditable = "false";
        this.slider.style.width = "100%";
        this.slider.style.position = "relative";
        this.dom.appendChild(this.slider);

        // Build initial sizes + handles
        this.updateNode(node);

        this.contentDOM = document.createElement("table");
        this.contentDOM.classList.add("table-plus");
        this.contentDOM.style.flex = "1";
        this.dom.appendChild(this.contentDOM);

        // start observing direction changes
        this.startDirectionObserver();
    }

    // observe direction changes even when doc doesn't change
    private startDirectionObserver() {
        const editorEl = this.editor.view.dom as HTMLElement;

        const check = () => {
            const nextRTL = this.getIsRTL();
            if (nextRTL !== this.isRTL) {
                this.isRTL = nextRTL;
                // Rebuild handles so left/right/transform are correct
                this.updateHandles();
                // Ensure handles match current percentages after rebuild
                this.updateHandlePositions();
            }
        };

        // Run once after mount (covers cases where dir applies after constructor)
        requestAnimationFrame(check);

        this.dirObserver = new MutationObserver(() => {
            // wait a frame so computedStyle reflects the new direction
            requestAnimationFrame(check);
        });

        // Watch likely sources that change when "system/app" direction toggles
        this.dirObserver.observe(editorEl, {
            attributes: true,
            attributeFilter: ["dir", "lang", "style", "class"],
        });

        this.dirObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["dir", "lang"],
        });
    }

    // Called by ProseMirror when nodeview is removed
    destroy() {
        this.dirObserver?.disconnect();
        this.dirObserver = undefined;
    }

    addHandles() {
        const dragHandle = (handle: HTMLElement) => {
            let handleIndex = parseInt(handle.dataset.index ?? "0");

            const onMouseMove = (e: MouseEvent) => {
                const rect = this.slider.getBoundingClientRect();

                let x = this.isRTL ? rect.right - e.clientX : e.clientX - rect.left;
                x = x < this.options.minColumnSize ? this.options.minColumnSize : x;

                let percent = Math.min(Math.max((x / rect.width) * 100, 0), 100);

                const getHandlePosition = (h: HTMLElement) => {
                    return this.isRTL
                        ? parseFloat(h.style.right || "0")
                        : parseFloat(h.style.left || "0");
                };

                // enforce min column size with previous handle
                if (handleIndex > 0) {
                    const prev = getHandlePosition(this.handles[handleIndex - 1]);
                    const prevPixel =
                        (prev * x) / (percent || 0.000001) + this.options.minColumnSize;

                    if (x < prevPixel) {
                        percent = Math.min(
                            Math.max((prevPixel / rect.width) * 100, 0),
                            100
                        );
                    }
                    percent = Math.max(percent, prev);
                }

                // enforce min column size with next handle
                if (handleIndex < this.handles.length - 1) {
                    const next = getHandlePosition(this.handles[handleIndex + 1]);
                    const nextPixel =
                        (next * x) / (percent || 0.000001) - this.options.minColumnSize;

                    if (x > nextPixel) {
                        percent = Math.min(
                            Math.max((nextPixel / rect.width) * 100, 0),
                            100
                        );
                    }
                    percent = Math.min(percent, next);
                }

                if (this.isRTL) {
                    handle.style.right = percent + "%";
                    handle.style.left = "auto";
                } else {
                    handle.style.left = percent + "%";
                    handle.style.right = "auto";
                }

                this.updateValues(this.getColumnSizes(this.handles), false);
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                this.updateValues(this.getColumnSizes(this.handles), true);
            };

            handle.addEventListener("mousedown", (e) => {
                e.preventDefault();
                handleIndex = parseInt(handle.dataset.index ?? "0");
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });
        };

        let lastValue = 0;

        for (let index = 0; index < this.cellPercentage.length; index++) {
            lastValue += this.cellPercentage[index];

            if (index >= this.handles.length) {
                const handle = document.createElement("div");
                handle.className = "handle";
                handle.style.position = "absolute";
                handle.style.top = "50%";
                handle.style.width = "12px";
                handle.style.height = "12px";
                handle.style.zIndex = "9999";
                handle.style.borderRadius = "50%";
                handle.style.cursor = "ew-resize";

                Object.assign(handle.style, {
                    ...this.options.resizeHandleStyle,
                });

                handle.dataset.index = index.toString();

                if (this.isRTL) {
                    handle.style.right = `${lastValue}%`;
                    handle.style.left = "auto";
                    handle.style.transform = "translate(50%, -50%)";
                } else {
                    handle.style.left = `${lastValue}%`;
                    handle.style.right = "auto";
                    handle.style.transform = "translate(-50%, -50%)";
                }

                this.slider.appendChild(handle);
                this.handles.push(handle);
                dragHandle(handle);
            }
        }
    }

    removeHandles() {
        // remove until counts match
        while (this.handles.length > this.cellPercentage.length) {
            const handle = this.handles[this.handles.length - 1];
            if (!handle) break;

            if (handle.parentNode === this.slider) {
                this.slider.removeChild(handle);
            }
            this.handles.splice(this.handles.length - 1, 1);
        }

        this.handles.forEach((h, i) => {
            h.dataset.index = i.toString();
        });
    }

    updateHandlePositions() {
        let lastValue = 0;
        for (let index = 0; index < this.cellPercentage.length; index++) {
            lastValue += this.cellPercentage[index];
            const h = this.handles[index];
            if (!h) continue;

            if (this.isRTL) {
                h.style.right = `${lastValue}%`;
                h.style.left = "auto";
                h.style.transform = "translate(50%, -50%)";
            } else {
                h.style.left = `${lastValue}%`;
                h.style.right = "auto";
                h.style.transform = "translate(-50%, -50%)";
            }
        }
    }

    updateHandles() {
        // clear all existing handles
        this.handles.forEach((handle) => {
            if (handle.parentNode === this.slider) {
                this.slider.removeChild(handle);
            }
        });
        this.handles = [];

        // recreate handles
        this.addHandles();
    }

    getIsRTL(): boolean {
        const editorElement = this.editor.view.dom as HTMLElement;
        const computedStyle = window.getComputedStyle(editorElement);
        const direction = computedStyle.direction;

        if (
            direction === "rtl" ||
            document.dir === "rtl" ||
            document.documentElement.dir === "rtl"
        ) {
            return true;
        }

        const lang =
            editorElement.lang ||
            document.documentElement.lang ||
            "";
        const rtlLanguages = ["ar", "he", "fa", "ur", "ps", "sd"];
        return rtlLanguages.some((rtlLang) => lang.startsWith(rtlLang));
    }

    updateNode(node: Node) {
        this.isRTL = this.getIsRTL();

        this.columnSize = node.attrs.columnSize;

        let _maxCellCount = 0;
        node.forEach((child) => {
            if (child.type.name === "tableRowGroup") {
                child.forEach((row) => {
                    if (row.type.name === "tableRow") {
                        if (row.childCount > _maxCellCount) _maxCellCount = row.childCount;
                    }
                });
            } else if (child.type.name === "tableRow") {
                if (child.childCount > _maxCellCount) _maxCellCount = child.childCount;
            }
        });

        this.maxCellCount = _maxCellCount;

        const getColumnSizeList = (columnSize: string) => {
            const arr = columnSize.split(",").map((str) => str.trim());
            const numbers =
                arr.length > 0 && arr.every((item) => item !== "" && !isNaN(Number(item)))
                    ? arr.map(Number)
                    : [];
            return numbers;
        };

        this.dom.style.setProperty("--cell-count", this.maxCellCount.toString());

        // default equal distribution
        const base = Math.floor(100 / Math.max(this.maxCellCount, 1));
        this.cellPercentage = Array(this.maxCellCount).fill(base);

        const columnSize = getColumnSizeList(this.columnSize);
        if (columnSize.length === this.maxCellCount) {
            this.cellPercentage = columnSize;
        } else if (this.maxCellCount > 0) {
            // ensure sum to 100 (avoid rounding drift)
            const sum = this.cellPercentage.reduce((a, b) => a + b, 0);
            this.cellPercentage[this.cellPercentage.length - 1] += 100 - sum;
        }

        this.dom.style.setProperty(
            "--cell-percentage",
            this.cellPercentage.map((a) => `${a}%`).join(" ")
        );

        // ensure handles count matches and direction is respected
        this.updateHandles();
    }

    getColumnSizes(handles: HTMLElement[]) {
        const values = handles.map((h) => {
            const position = this.isRTL
                ? parseFloat(h.style.right || "0")
                : parseFloat(h.style.left || "0");
            return Math.round(position * 100) / 100;
        });

        let counted = 0;
        const _values: number[] = [];
        for (let i = 0; i < values.length; i++) {
            _values.push(Math.round((values[i] - counted) * 100) / 100);
            counted = values[i];
        }
        return _values;
    }

    updateValues(_values: number[], updateNode: boolean = false) {
        this.dom.style.setProperty(
            "--cell-percentage",
            _values.map((a) => `${a}%`).join(" ")
        );

        if (updateNode) {
            this.editor.commands.command(({ tr }) => {
                const pos = this.getPos();
                if (typeof pos !== "number") return false;

                tr.setNodeMarkup(pos, undefined, {
                    ...this.node.attrs,
                    columnSize: _values.map((a) => a.toString()).join(","),
                });

                return true;
            });
        }
    }

    getContentDOM() {
        return this.contentDOM;
    }

    update(node: Node) {
        if (node.type.name === this.node.type.name) {
            this.updateNode(node);
        }
        this.node = node;
        return true;
    }

    ignoreMutation() {
        return true;
    }
}
