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

    slider: HTMLElement; // overlay for resize handles
    handles: HTMLElement[];
    options: any;

    isRTL: boolean;

    // observe direction changes
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
        this.options = options ?? {};

        this.isRTL = this.getIsRTL();

        // Root wrapper for the table + overlay
        this.dom = document.createElement("div");
        this.dom.style.position = "relative"; // containing block for absolute overlay

        this.maxCellCount = 0;
        this.cellPercentage = [];
        this.handles = [];

        // The table content element
        this.contentDOM = document.createElement("table");
        this.contentDOM.classList.add("table-plus");
        this.contentDOM.style.flex = "1";
        this.dom.appendChild(this.contentDOM);

        // Absolute overlay that spans the table area
        this.slider = document.createElement("div");
        this.slider.contentEditable = "false";
        this.slider.style.position = "absolute";
        this.slider.style.inset = "0";             // top/right/bottom/left: 0
        this.slider.style.zIndex = "2";             // below handle z-index but above table content
        this.slider.style.pointerEvents = "none";   // ignore events; handles will re-enable
        this.dom.appendChild(this.slider);

        // Initialize sizes + handles
        this.updateNode(node);

        // Start observing direction changes (e.g., switching to Arabic)
        this.startDirectionObserver();
    }

    // Observe direction changes on editor root and document
    private startDirectionObserver() {
        const editorEl = this.editor.view.dom as HTMLElement;

        const check = () => {
            const nextRTL = this.getIsRTL();
            if (nextRTL !== this.isRTL) {
                this.isRTL = nextRTL;
                // Rebuild handles so left/right/transform are correct
                this.updateHandles();
                // Ensure handle positions reflect current percentages
                this.updateHandlePositions();
            }
        };

        // Run once after mount
        requestAnimationFrame(check);

        this.dirObserver = new MutationObserver(() => {
            requestAnimationFrame(check);
        });

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

    // Create full-height line handles and wire drag logic
    addHandles() {
        const dragHandle = (handle: HTMLElement) => {
            let handleIndex = parseInt(handle.dataset.index ?? "0");

            const onMove = (clientX: number) => {
                const rect = this.slider.getBoundingClientRect();

                // position of pointer relative to overlay rect, respecting RTL
                let x = this.isRTL ? rect.right - clientX : clientX - rect.left;
                x = Math.max(x, this.options.minColumnSize ?? 0);

                let percent = Math.min(Math.max((x / rect.width) * 100, 0), 100);

                const getHandlePosition = (h: HTMLElement) => {
                    return this.isRTL
                        ? parseFloat(h.style.right || "0")
                        : parseFloat(h.style.left || "0");
                };

                // Enforce min size with previous handle
                if (handleIndex > 0) {
                    const prev = getHandlePosition(this.handles[handleIndex - 1]);
                    percent = Math.max(percent, prev);
                }

                // Enforce min size with next handle
                if (handleIndex < this.handles.length - 1) {
                    const next = getHandlePosition(this.handles[handleIndex + 1]);
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

            // Pointer events (covers mouse + touch + pen)
            const onPointerMove = (e: PointerEvent) => {
                e.preventDefault();
                onMove(e.clientX);
            };
            const onPointerUp = (e: PointerEvent) => {
                e.preventDefault();
                document.removeEventListener("pointermove", onPointerMove);
                document.removeEventListener("pointerup", onPointerUp);
                this.updateValues(this.getColumnSizes(this.handles), true);
            };

            handle.addEventListener("pointerdown", (e: PointerEvent) => {
                // Touch devices don’t show cursor; still allow dragging
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                e.preventDefault();
                handleIndex = parseInt(handle.dataset.index ?? "0");
                document.addEventListener("pointermove", onPointerMove);
                document.addEventListener("pointerup", onPointerUp);
            });

            // Mouse fallback (older browsers)
            const onMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                onMove(e.clientX);
            };
            const onMouseUp = (e: MouseEvent) => {
                e.preventDefault();
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
                handle.dataset.index = index.toString();

                // Placement within overlay
                handle.style.position = "absolute";
                handle.style.top = "0";
                handle.style.height = "100%";
                handle.style.width = (this.options.resizeHandleStyle?.width as string) || "12px"; // hit-area width
                handle.style.zIndex = "2";
                handle.style.pointerEvents = "auto";
                handle.style.cursor = "ew-resize";
                handle.style.touchAction = "none";
                // Allow user overrides via options
                if (this.options.resizeHandleStyle) {
                    Object.assign(handle.style, this.options.resizeHandleStyle);
                }

                if (this.isRTL) {
                    handle.style.right = `${lastValue}%`;
                    handle.style.left = "auto";
                    handle.style.transform = "translateX(50%)";  // center over seam (RTL)
                } else {
                    handle.style.left = `${lastValue}%`;
                    handle.style.right = "auto";
                    handle.style.transform = "translateX(-50%)"; // center over seam (LTR)
                }

                this.slider.appendChild(handle);
                this.handles.push(handle);
                dragHandle(handle);
            }
        }
    }

    removeHandles() {
        while (this.handles.length > this.cellPercentage.length) {
            const handle = this.handles[this.handles.length - 1];
            if (!handle) break;
            if (handle.parentNode === this.slider) this.slider.removeChild(handle);
            this.handles.splice(this.handles.length - 1, 1);
        }
        this.handles.forEach((h, i) => (h.dataset.index = i.toString()));
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
                h.style.transform = "translateX(50%)";  // X only
            } else {
                h.style.left = `${lastValue}%`;
                h.style.right = "auto";
                h.style.transform = "translateX(-50%)"; // X only
            }
        }
    }

    updateHandles() {
        // clear current handles
        this.handles.forEach((handle) => {
            if (handle.parentNode === this.slider) this.slider.removeChild(handle);
        });
        this.handles = [];

        // recreate with current direction and percentages
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

        const lang = editorElement.lang || document.documentElement.lang || "";
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
