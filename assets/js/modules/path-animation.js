/**
 * 路径动画模块
 * 
 * 负责管理元素沿自定义路径移动的动画功能。
 * 
 * 主要功能：
 * - 钢笔工具绘制路径
 * - 路径点编辑
 * - 路径动画预览
 * - 放映模式下的路径动画播放
 * 
 * 使用方式：
 * 1. 选中一个元素
 * 2. 点击"路径动画"按钮进入路径绘制模式
 * 3. 在画布上点击添加路径点
 * 4. 双击或按ESC结束绘制
 * 5. 在放映模式下，元素会沿路径移动
 */

const PathAnimation = {
    /** @type {boolean} 是否处于路径绘制模式 */
    isDrawingMode: false,
    
    /** @type {boolean} 是否处于路径编辑模式 */
    isEditMode: false,
    
    /** @type {string|null} 当前绑定的元素ID */
    targetElementId: null,
    
    /** @type {Object[]} 路径点数组 [{x, y}] */
    pathPoints: [],
    
    /** @type {fabric.Path|null} Fabric.js 路径对象 */
    pathObject: null,
    
    /** @type {fabric.Circle[]} 路径控制点对象数组 */
    controlPoints: [],
    
    /** @type {fabric.Circle|null} 当前拖动的控制点 */
    activeControlPoint: null,
    
    /** @type {EditorStore|null} 状态管理实例 */
    store: null,
    
    /** @type {fabric.Canvas|null} 画布引用 */
    canvas: null,
    
    /** @type {string} 路径颜色 */
    pathColor: '#3b82f6',
    
    /** @type {string} 控制点颜色 */
    controlPointColor: '#ef4444',
    
    /** @type {number} 控制点半径 */
    controlPointRadius: 8,
    
    /** @type {number} 动画时长（秒） */
    animationDuration: 3,
    
    /** @type {string} 动画缓动函数 */
    animationEasing: 'easeInOutSine',
    
    /** @type {Function|null} 鼠标点击处理器引用 */
    _mouseDownHandler: null,
    
    /** @type {Function|null} 鼠标移动处理器引用 */
    _mouseMoveHandler: null,
    
    /** @type {Function|null} 键盘处理器引用 */
    _keyHandler: null,

    /**
     * 初始化路径动画模块
     * 
     * @param {EditorStore} store - 状态管理实例
     * @param {fabric.Canvas} canvas - Fabric.js 画布实例
     */
    init(store, canvas) {
        this.store = store;
        this.canvas = canvas;
        this.bindEvents();
    },

    /**
     * 绑定事件处理器
     */
    bindEvents() {
        document.getElementById('btn-path-tool')?.addEventListener('click', () => {
            this.toggleDrawingMode();
        });
    },

    /**
     * 切换路径绘制模式
     */
    toggleDrawingMode() {
        if (this.isDrawingMode) {
            this.exitDrawingMode();
        } else {
            this.enterDrawingMode();
        }
    },

    /**
     * 进入路径绘制模式
     */
    enterDrawingMode() {
        const state = this.store.getState();
        
        if (!state.activeElementId) {
            alert('请先选中一个元素');
            return;
        }
        
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        const element = slide?.elements.find(e => e.id === state.activeElementId);
        
        if (!element) {
            alert('请先选中一个元素');
            return;
        }
        
        if (element.type !== 'image' && element.type !== 'shape' && element.type !== 'icon') {
            alert('路径动画仅支持图片、形状和图标元素');
            return;
        }
        
        this.isDrawingMode = true;
        this.targetElementId = state.activeElementId;
        this.pathPoints = [];
        
        if (element.pathAnimation && element.pathAnimation.path) {
            this.pathPoints = [...element.pathAnimation.path];
            this.animationDuration = element.pathAnimation.duration || 3;
        }
        
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';
        this.canvas.selection = false;
        
        this._mouseDownHandler = (e) => this.onCanvasMouseDown(e);
        this._mouseMoveHandler = (e) => this.onCanvasMouseMove(e);
        this._keyHandler = (e) => this.onKeyDown(e);
        
        this.canvas.on('mouse:down', this._mouseDownHandler);
        this.canvas.on('mouse:move', this._mouseMoveHandler);
        document.addEventListener('keydown', this._keyHandler);
        
        this.renderPath();
        this.showDrawingHint();
        
        console.log('[PathAnimation] 进入路径绘制模式');
    },

    /**
     * 退出路径绘制模式
     */
    exitDrawingMode() {
        this.isDrawingMode = false;
        this.isEditMode = false;
        
        this.canvas.defaultCursor = 'default';
        this.canvas.hoverCursor = 'move';
        this.canvas.selection = true;
        
        if (this._mouseDownHandler) {
            this.canvas.off('mouse:down', this._mouseDownHandler);
            this._mouseDownHandler = null;
        }
        if (this._mouseMoveHandler) {
            this.canvas.off('mouse:move', this._mouseMoveHandler);
            this._mouseMoveHandler = null;
        }
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        
        this.savePath();
        this.clearPathVisuals();
        this.hideDrawingHint();
        
        console.log('[PathAnimation] 退出路径绘制模式');
    },

    /**
     * 画布鼠标点击事件处理
     */
    onCanvasMouseDown(e) {
        if (!this.isDrawingMode) return;
        
        const pointer = this.canvas.getPointer(e.e);
        
        if (e.e.shiftKey && this.pathPoints.length > 0) {
            const lastPoint = this.pathPoints[this.pathPoints.length - 1];
            const dx = Math.abs(pointer.x - lastPoint.x);
            const dy = Math.abs(pointer.y - lastPoint.y);
            
            if (dx > dy) {
                pointer.y = lastPoint.y;
            } else {
                pointer.x = lastPoint.x;
            }
        }
        
        if (this.isEditMode) {
            const clickedControl = this.controlPoints.find(cp => {
                const dist = Math.sqrt(
                    Math.pow(pointer.x - cp.left, 2) + 
                    Math.pow(pointer.y - cp.top, 2)
                );
                return dist < this.controlPointRadius * 2;
            });
            
            if (clickedControl) {
                this.activeControlPoint = clickedControl;
                return;
            }
        }
        
        this.pathPoints.push({ x: Math.round(pointer.x), y: Math.round(pointer.y) });
        this.renderPath();
    },

    /**
     * 画布鼠标移动事件处理
     */
    onCanvasMouseMove(e) {
        if (!this.isDrawingMode) return;
        
        if (this.isEditMode && this.activeControlPoint) {
            const pointer = this.canvas.getPointer(e.e);
            this.activeControlPoint.set({
                left: pointer.x,
                top: pointer.y
            });
            
            const index = this.controlPoints.indexOf(this.activeControlPoint);
            if (index >= 0 && index < this.pathPoints.length) {
                this.pathPoints[index] = { x: Math.round(pointer.x), y: Math.round(pointer.y) };
            }
            
            this.renderPath();
            this.canvas.renderAll();
        }
    },

    /**
     * 键盘事件处理
     */
    onKeyDown(e) {
        if (!this.isDrawingMode) return;
        
        if (e.key === 'Escape') {
            if (this.pathPoints.length >= 2) {
                this.exitDrawingMode();
            } else {
                this.pathPoints = [];
                this.exitDrawingMode();
            }
        } else if (e.key === 'Enter') {
            if (this.pathPoints.length >= 2) {
                this.exitDrawingMode();
            }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            if (this.pathPoints.length > 0) {
                this.pathPoints.pop();
                this.renderPath();
            }
        } else if (e.key === 'e' || e.key === 'E') {
            this.toggleEditMode();
        }
    },

    /**
     * 切换编辑模式
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.renderPath();
        
        if (this.isEditMode) {
            this.showEditHint();
        } else {
            this.showDrawingHint();
        }
    },

    /**
     * 渲染路径和控制点
     */
    renderPath() {
        this.clearPathVisuals();
        
        if (this.pathPoints.length === 0) return;
        
        if (this.pathPoints.length >= 2) {
            let pathString = `M ${this.pathPoints[0].x} ${this.pathPoints[0].y}`;
            
            for (let i = 1; i < this.pathPoints.length; i++) {
                pathString += ` L ${this.pathPoints[i].x} ${this.pathPoints[i].y}`;
            }
            
            this.pathObject = new fabric.Path(pathString, {
                fill: 'transparent',
                stroke: this.pathColor,
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                isPathGuide: true
            });
            
            this.canvas.add(this.pathObject);
        }
        
        this.pathPoints.forEach((point, index) => {
            const isFirst = index === 0;
            const isLast = index === this.pathPoints.length - 1;
            
            const controlPoint = new fabric.Circle({
                left: point.x,
                top: point.y,
                radius: this.controlPointRadius,
                fill: isFirst ? '#22c55e' : (isLast ? '#ef4444' : this.controlPointColor),
                stroke: '#ffffff',
                strokeWidth: 2,
                selectable: this.isEditMode,
                evented: this.isEditMode,
                originX: 'center',
                originY: 'center',
                isControlPoint: true,
                pointIndex: index
            });
            
            this.controlPoints.push(controlPoint);
            this.canvas.add(controlPoint);
        });
        
        this.canvas.renderAll();
    },

    /**
     * 清除路径可视化元素
     */
    clearPathVisuals() {
        if (this.pathObject) {
            this.canvas.remove(this.pathObject);
            this.pathObject = null;
        }
        
        this.controlPoints.forEach(cp => {
            this.canvas.remove(cp);
        });
        this.controlPoints = [];
        
        this.canvas.renderAll();
    },

    /**
     * 保存路径到元素
     */
    savePath() {
        if (!this.targetElementId || this.pathPoints.length < 2) {
            if (this.targetElementId && this.pathPoints.length < 2) {
                const state = this.store.getState();
                this.store.updateElement(state.activeSlideId, this.targetElementId, {
                    pathAnimation: null
                });
            }
            return;
        }
        
        const state = this.store.getState();
        
        this.store.updateElement(state.activeSlideId, this.targetElementId, {
            pathAnimation: {
                path: [...this.pathPoints],
                duration: this.animationDuration,
                easing: this.animationEasing
            }
        });
        
        console.log('[PathAnimation] 路径已保存:', this.pathPoints);
    },

    /**
     * 显示绘制提示
     */
    showDrawingHint() {
        let hint = document.getElementById('path-drawing-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'path-drawing-hint';
            hint.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(hint);
        }
        
        hint.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <span>点击画布添加路径点</span>
                <span style="color: #888;">|</span>
                <span>按住Shift绘制直线</span>
                <span style="color: #888;">|</span>
                <span>按E编辑路径</span>
                <span style="color: #888;">|</span>
                <span>按ESC或Enter完成</span>
                <span style="color: #888;">|</span>
                <span>按Delete删除最后一点</span>
            </div>
        `;
        hint.style.display = 'block';
    },

    /**
     * 显示编辑提示
     */
    showEditHint() {
        let hint = document.getElementById('path-drawing-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'path-drawing-hint';
            hint.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(hint);
        }
        
        hint.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="color: #22c55e;">编辑模式</span>
                <span style="color: #888;">|</span>
                <span>拖动控制点调整路径</span>
                <span style="color: #888;">|</span>
                <span>按E退出编辑</span>
                <span style="color: #888;">|</span>
                <span>按ESC完成</span>
            </div>
        `;
        hint.style.display = 'block';
    },

    /**
     * 隐藏绘制提示
     */
    hideDrawingHint() {
        const hint = document.getElementById('path-drawing-hint');
        if (hint) {
            hint.style.display = 'none';
        }
    },

    /**
     * 清除指定元素的路径
     * 
     * @param {string} elementId - 元素ID
     */
    clearElementPath(elementId) {
        const state = this.store.getState();
        this.store.updateElement(state.activeSlideId, elementId, {
            pathAnimation: null
        });
        
        if (this.targetElementId === elementId) {
            this.pathPoints = [];
            this.clearPathVisuals();
        }
    },

    /**
     * 检查元素是否有路径动画
     * 
     * @param {Object} element - 元素对象
     * @returns {boolean}
     */
    hasPathAnimation(element) {
        return element && element.pathAnimation && 
               element.pathAnimation.path && 
               element.pathAnimation.path.length >= 2;
    },

    /**
     * 在放映模式下播放路径动画
     * 
     * @param {HTMLElement} element - DOM元素
     * @param {Object} pathAnimation - 路径动画配置
     * @param {Function} onComplete - 动画完成回调
     */
    playPathAnimation(element, pathAnimation, onComplete) {
        if (!pathAnimation || !pathAnimation.path || pathAnimation.path.length < 2) {
            if (onComplete) onComplete();
            return;
        }
        
        const path = pathAnimation.path;
        const duration = (pathAnimation.duration || 3) * 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = this.easeInOutSine(progress);
            
            const position = this.getPositionOnPath(path, easedProgress);
            
            element.style.left = position.x + 'px';
            element.style.top = position.y + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    },

    /**
     * 缓动函数
     */
    easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    },

    /**
     * 获取路径上的位置
     * 
     * @param {Object[]} path - 路径点数组
     * @param {number} progress - 进度 (0-1