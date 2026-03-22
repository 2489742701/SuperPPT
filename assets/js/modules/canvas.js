/**
 * 画布管理模块 (CanvasManager)
 * 
 * 本模块负责管理 Fabric.js 画布，是编辑器的核心渲染层。
 * 
 * 主要职责：
 * 1. 画布初始化与配置
 * 2. 幻灯片元素的渲染与更新
 * 3. 用户交互事件处理（选择、移动、缩放、文本编辑等）
 * 4. 智能参考线（Smart Guides）功能
 * 5. 画布缩放与视图控制
 * 
 * 依赖：
 * - Fabric.js: 画布渲染引擎
 * - EditorStore: 状态管理
 * 
 * 文本模式说明：
 * - fixed (文本框模式): 使用 fabric.Textbox，可拖动调整大小
 * - auto (纯文本模式): 使用 fabric.IText，根据文本内容自动调整大小
 */

const CanvasManager = {
    /** @type {fabric.Canvas|null} Fabric.js 画布实例 */
    canvas: null,
    
    /** @type {number} 幻灯片宽度（像素） */
    slideWidth: 1200,
    
    /** @type {number} 幻灯片高度（像素） */
    slideHeight: 675,
    
    /** @type {boolean} 是否启用智能参考线 */
    smartGuidesEnabled: true,
    
    /** @type {Object} 参考线存储 */
    guideLines: {
        /** @type {fabric.Line[]} 水平参考线数组 */
        horizontal: [],
        /** @type {fabric.Line[]} 垂直参考线数组 */
        vertical: []
    },
    
    /** @type {string} 参考线颜色 */
    guideColor: '#00a8ff',
    
    /** @type {number} 参考线吸附阈值（像素） */
    guideThreshold: 8,
    
    /** @type {number} 当前缩放级别 */
    zoomLevel: 1,
    
    /** @type {number} 最小缩放级别 */
    minZoom: 0.25,
    
    /** @type {number} 最大缩放级别 */
    maxZoom: 4,
    
    /** @type {Object|null} 多选组拖动前的中心点（用于计算位移） */
    _lastGroupCenter: null,
    
    /** @type {boolean} 调试模式开关（控制日志输出） */
    debugMode: false,
    
    /** @type {boolean} 是否在打包环境 */
    _isPackaged: false,
    
    /**
     * 检测是否在打包环境（同步版本，在 init 中调用）
     */
    async _checkPackaged() {
        try {
            const result = await window.pyApi.is_packaged();
            this._isPackaged = result.packaged;
        } catch (e) {
            this._isPackaged = false;
        }
    },
    
    /**
     * 调试日志输出
     * 开发环境：输出到控制台
     * 打包环境：写入日志文件
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    debug(message, ...args) {
        if (!this.debugMode) return;
        
        if (this._isPackaged) {
            // 打包环境：写入日志文件（不等待结果）
            try {
                window.pyApi.write_log('DEBUG', 'CanvasManager', message, args.length > 0 ? JSON.stringify(args) : '');
            } catch (e) {
                console.log(`[CanvasManager] ${message}`, ...args);
            }
        } else {
            // 开发环境：输出到控制台
            console.log(`[CanvasManager] ${message}`, ...args);
        }
    },

    /**
     * 初始化画布
     * 
     * 创建 Fabric.js 画布实例，绑定事件监听器。
     * 
     * @returns {Promise<fabric.Canvas>} 画布实例
     */
    async init() {
        // 检测是否在开发模式（通过 URL 参数或全局变量）
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug') || window.DEBUG_MODE) {
            this.debugMode = true;
        }
        
        // 检测是否在打包环境
        this._checkPackaged();
        
        // 创建 Fabric.js 画布
        this.canvas = new fabric.Canvas('canvas', {
            width: this.slideWidth,
            height: this.slideHeight,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,  // 保持对象堆叠顺序
            fireRightClick: true,          // 启用右键点击事件
            stopContextMenu: true          // 阻止默认右键菜单
        });

        // 绑定事件监听器
        this.canvas.on('object:modified', (e) => this.onObjectModified(e));
        this.canvas.on('selection:created', (e) => this.onSelectionChanged(e));
        this.canvas.on('selection:updated', (e) => this.onSelectionChanged(e));
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());
        this.canvas.on('text:changed', (e) => this.onTextChanged(e));
        this.canvas.on('mouse:down', (e) => this.onMouseDown(e));
        this.canvas.on('object:moving', (e) => this.onObjectMoving(e));
        this.canvas.on('mouse:up', () => this.clearGuideLines());
        
        // 初始化缩放功能
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 4;
        
        // 绑定滚轮缩放事件
        const canvasWrapper = document.getElementById('canvas-area');
        if (canvasWrapper) {
            canvasWrapper.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        }
        
        this.debug('画布初始化完成');
        
        return this.canvas;
    },

    /**
     * 清除所有参考线
     * 
     * 在对象移动结束或选择变化时调用，
     * 移除画布上显示的所有智能参考线。
     */
    clearGuideLines() {
        this.guideLines.horizontal.forEach(line => this.canvas.remove(line));
        this.guideLines.vertical.forEach(line => this.canvas.remove(line));
        this.guideLines.horizontal = [];
        this.guideLines.vertical = [];
        this.canvas.renderAll();
    },

    /**
     * 绘制参考线
     * 
     * 在指定位置绘制水平或垂直参考线。
     * 
     * @param {string} type - 参考线类型 ('horizontal' 或 'vertical')
     * @param {number} position - 参考线位置（像素）
     * @returns {fabric.Line} 创建的参考线对象
     */
    drawGuideLine(type, position) {
        const line = new fabric.Line(
            type === 'horizontal' 
                ? [0, position, this.slideWidth, position]
                : [position, 0, position, this.slideHeight],
            {
                stroke: this.guideColor,
                strokeWidth: 1,
                strokeDashArray: [4, 4],  // 虚线样式
                selectable: false,         // 不可选择
                evented: false,            // 不响应事件
                opacity: 0.8
            }
        );
        
        // 存储参考线以便后续清除
        if (type === 'horizontal') {
            this.guideLines.horizontal.push(line);
        } else {
            this.guideLines.vertical.push(line);
        }
        
        this.canvas.add(line);
        return line;
    },

    /**
     * 对象移动事件处理（智能参考线核心逻辑）
     * 
     * 当用户拖动对象时，计算并显示对齐参考线。
     * 支持以下对齐点：
     * - 画布边缘（左、右、上、下）
     * - 画布中心
     * - 其他对象的边缘和中心
     * 
     * @param {Object} e - 事件对象
     */
    onObjectMoving(e) {
        if (!this.smartGuidesEnabled) return;
        
        this.clearGuideLines();
        
        const target = e.target;
        if (!target) return;

        const threshold = this.guideThreshold;
        const canvasCenterX = this.slideWidth / 2;
        const canvasCenterY = this.slideHeight / 2;

        if (target.type === 'activeSelection') {
            this.handleActiveSelectionMoving(target, threshold, canvasCenterX, canvasCenterY);
        } else {
            this.handleSingleObjectMoving(target, threshold, canvasCenterX, canvasCenterY);
        }
        
        this.canvas.renderAll();
    },

    handleSingleObjectMoving(target, threshold, canvasCenterX, canvasCenterY) {
        const targetLeft = target.left;
        const targetTop = target.top;
        const targetWidth = target.getScaledWidth();
        const targetHeight = target.getScaledHeight();
        const targetCenterX = targetLeft + targetWidth / 2;
        const targetCenterY = targetTop + targetHeight / 2;
        const targetRight = targetLeft + targetWidth;
        const targetBottom = targetTop + targetHeight;

        let snapX = null;
        let snapY = null;
        let guideX = null;
        let guideY = null;

        const canvasSnapPoints = [
            { value: 0, type: 'edge' },
            { value: canvasCenterX, type: 'center' },
            { value: this.slideWidth, type: 'edge' }
        ];
        
        const canvasSnapPointsY = [
            { value: 0, type: 'edge' },
            { value: canvasCenterY, type: 'center' },
            { value: this.slideHeight, type: 'edge' }
        ];

        const objects = this.canvas.getObjects().filter(obj => obj !== target && obj.elementId);
        
        const allSnapPointsX = [...canvasSnapPoints];
        const allSnapPointsY = [...canvasSnapPointsY];
        
        objects.forEach((obj) => {
            const objLeft = obj.left;
            const objTop = obj.top;
            const objWidth = obj.getScaledWidth();
            const objHeight = obj.getScaledHeight();
            const objCenterX = objLeft + objWidth / 2;
            const objCenterY = objTop + objHeight / 2;
            
            allSnapPointsX.push(
                { value: objLeft, type: 'left' },
                { value: objCenterX, type: 'center' },
                { value: objLeft + objWidth, type: 'right' }
            );
            
            allSnapPointsY.push(
                { value: objTop, type: 'top' },
                { value: objCenterY, type: 'center' },
                { value: objTop + objHeight, type: 'bottom' }
            );
        });

        for (const point of allSnapPointsX) {
            const leftDiff = Math.abs(targetLeft - point.value);
            const centerDiff = Math.abs(targetCenterX - point.value);
            const rightDiff = Math.abs(targetRight - point.value);
            
            if (leftDiff < threshold && (snapX === null || leftDiff < Math.abs(snapX))) {
                snapX = point.value - targetLeft;
                guideX = point.value;
            }
            if (centerDiff < threshold && (snapX === null || centerDiff < Math.abs(snapX))) {
                snapX = point.value - targetCenterX;
                guideX = point.value;
            }
            if (rightDiff < threshold && (snapX === null || rightDiff < Math.abs(snapX))) {
                snapX = point.value - targetRight;
                guideX = point.value;
            }
        }

        for (const point of allSnapPointsY) {
            const topDiff = Math.abs(targetTop - point.value);
            const centerDiff = Math.abs(targetCenterY - point.value);
            const bottomDiff = Math.abs(targetBottom - point.value);
            
            if (topDiff < threshold && (snapY === null || topDiff < Math.abs(snapY))) {
                snapY = point.value - targetTop;
                guideY = point.value;
            }
            if (centerDiff < threshold && (snapY === null || centerDiff < Math.abs(snapY))) {
                snapY = point.value - targetCenterY;
                guideY = point.value;
            }
            if (bottomDiff < threshold && (snapY === null || bottomDiff < Math.abs(snapY))) {
                snapY = point.value - targetBottom;
                guideY = point.value;
            }
        }

        if (snapX !== null) {
            target.set('left', targetLeft + snapX);
            this.drawGuideLine('vertical', guideX);
        }
        if (snapY !== null) {
            target.set('top', targetTop + snapY);
            this.drawGuideLine('horizontal', guideY);
        }
    },

    /**
     * 处理多选对象移动时的智能参考线
     * 
     * 核心问题：activeSelection 中对象的 left/top 是相对于组的坐标
     * 解决方案：使用 getCenterPoint() 获取对象在画布上的绝对中心点
     * 
     * @param {fabric.ActiveSelection} target - 多选组对象
     * @param {number} threshold - 吸附阈值（像素）
     * @param {number} canvasCenterX - 画布中心 X 坐标
     * @param {number} canvasCenterY - 画布中心 Y 坐标
     */
    handleActiveSelectionMoving(target, threshold, canvasCenterX, canvasCenterY) {
        const objects = target.getObjects();
        if (objects.length === 0) return;

        // 计算选择组的边界（使用绝对坐标）
        // getCenterPoint() 返回对象在画布上的绝对中心点，不受组坐标影响
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objects.forEach(obj => {
            const center = obj.getCenterPoint();
            const width = obj.getScaledWidth();
            const height = obj.getScaledHeight();
            const left = center.x - width / 2;
            const top = center.y - height / 2;
            const right = center.x + width / 2;
            const bottom = center.y + height / 2;
            
            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        });

        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
        const boundsCenterX = minX + boundsWidth / 2;
        const boundsCenterY = minY + boundsHeight / 2;

        let snapX = null;
        let snapY = null;
        let guideX = null;
        let guideY = null;

        // 画布吸附点：左边缘、中心、右边缘
        const canvasSnapPointsX = [
            { value: 0, type: 'edge' },
            { value: canvasCenterX, type: 'center' },
            { value: this.slideWidth, type: 'edge' }
        ];
        
        const canvasSnapPointsY = [
            { value: 0, type: 'edge' },
            { value: canvasCenterY, type: 'center' },
            { value: this.slideHeight, type: 'edge' }
        ];

        // 收集其他对象的吸附点
        const otherObjects = this.canvas.getObjects().filter(obj => !target.contains(obj) && obj.elementId);
        
        const allSnapPointsX = [...canvasSnapPointsX];
        const allSnapPointsY = [...canvasSnapPointsY];
        
        otherObjects.forEach((obj) => {
            const objLeft = obj.left;
            const objTop = obj.top;
            const objWidth = obj.getScaledWidth();
            const objHeight = obj.getScaledHeight();
            const objCenterX = objLeft + objWidth / 2;
            const objCenterY = objTop + objHeight / 2;
            
            allSnapPointsX.push(
                { value: objLeft, type: 'left' },
                { value: objCenterX, type: 'center' },
                { value: objLeft + objWidth, type: 'right' }
            );
            
            allSnapPointsY.push(
                { value: objTop, type: 'top' },
                { value: objCenterY, type: 'center' },
                { value: objTop + objHeight, type: 'bottom' }
            );
        });

        // X 轴吸附检测
        for (const point of allSnapPointsX) {
            const leftDiff = Math.abs(minX - point.value);
            const centerDiff = Math.abs(boundsCenterX - point.value);
            const rightDiff = Math.abs(maxX - point.value);
            
            if (leftDiff < threshold && (snapX === null || leftDiff < Math.abs(snapX))) {
                snapX = point.value - minX;
                guideX = point.value;
            }
            if (centerDiff < threshold && (snapX === null || centerDiff < Math.abs(snapX))) {
                snapX = point.value - boundsCenterX;
                guideX = point.value;
            }
            if (rightDiff < threshold && (snapX === null || rightDiff < Math.abs(snapX))) {
                snapX = point.value - maxX;
                guideX = point.value;
            }
        }

        // Y 轴吸附检测
        for (const point of allSnapPointsY) {
            const topDiff = Math.abs(minY - point.value);
            const centerDiff = Math.abs(boundsCenterY - point.value);
            const bottomDiff = Math.abs(maxY - point.value);
            
            if (topDiff < threshold && (snapY === null || topDiff < Math.abs(snapY))) {
                snapY = point.value - minY;
                guideY = point.value;
            }
            if (centerDiff < threshold && (snapY === null || centerDiff < Math.abs(snapY))) {
                snapY = point.value - boundsCenterY;
                guideY = point.value;
            }
            if (bottomDiff < threshold && (snapY === null || bottomDiff < Math.abs(snapY))) {
                snapY = point.value - maxY;
                guideY = point.value;
            }
        }

        // 应用吸附并绘制参考线
        if (snapX !== null) {
            target.set('left', target.left + snapX);
            this.drawGuideLine('vertical', guideX);
        }
        if (snapY !== null) {
            target.set('top', target.top + snapY);
            this.drawGuideLine('horizontal', guideY);
        }
    },

    /**
     * 鼠标滚轮事件处理
     * 
     * Alt+滚轮：缩放画布
     * 支持的缩放范围：25% - 400%
     * 
     * @param {WheelEvent} e - 滚轮事件
     */
    onWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 计算缩放增量
        let delta;
        if (e.deltaY !== 0) {
            delta = e.deltaY > 0 ? -0.1 : 0.1;
        } else if (e.deltaX !== 0) {
            delta = e.deltaX > 0 ? -0.1 : 0.1;
        } else if (e.wheelDelta !== undefined) {
            delta = e.wheelDelta > 0 ? 0.1 : -0.1;
        } else {
            return;
        }
        
        // 计算新的缩放级别（限制在范围内）
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
        
        if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
            
            const container = document.getElementById('canvas-area');
            if (!container) return;
            
            // 计算新的画布尺寸
            const baseWidth = this.slideWidth;
            const baseHeight = this.slideHeight;
            const newWidth = baseWidth * newZoom;
            const newHeight = baseHeight * newZoom;
            
            // 应用缩放
            this.canvas.setDimensions({ width: newWidth, height: newHeight });
            this.canvas.setZoom(newZoom);
            this.canvas.renderAll();
            
            // 更新缩放显示
            this.updateZoomDisplay();
        }
    },

    /**
     * 更新缩放比例显示
     * 
     * 在画布工具栏中显示当前缩放百分比。
     */
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    },

    /**
     * 重置缩放
     * 
     * 将画布缩放重置为 100%。
     */
    resetZoom() {
        this.zoomLevel = 1;
        this.canvas.setDimensions({ width: this.slideWidth, height: this.slideHeight });
        this.canvas.setZoom(1);
        this.canvas.renderAll();
        this.updateZoomDisplay();
    },

    /**
     * 调整画布大小
     * 
     * 根据容器大小自适应调整画布尺寸，保持 16:9 比例。
     * 用于窗口大小变化时自动适配。
     */
    resize() {
        const container = document.getElementById('canvas-area');
        if (!container || !this.canvas) return;
        
        const { clientWidth, clientHeight } = container;
        const ratio = 16 / 9;
        
        // 计算适合容器的画布尺寸
        let width = clientWidth - 40;
        let height = width / ratio;
        
        // 如果高度超出容器，则按高度计算
        if (height > clientHeight - 40) {
            height = clientHeight - 40;
            width = height * ratio;
        }
        
        // 应用新的尺寸和缩放
        this.canvas.setDimensions({ width, height });
        const scale = width / this.slideWidth;
        this.canvas.setZoom(scale);
        this.canvas.renderAll();
    },

    /**
     * 渲染幻灯片内容到画布
     * 
     * 这是核心渲染方法，负责将数据模型转换为可视元素。
     * 
     * 渲染策略：
     * 1. 增量更新：只更新变化的元素，避免全量重绘
     * 2. 智能复用：已存在的对象只更新属性，不重新创建
     * 3. 模式切换：文本模式变化时自动重建对象
     * 
     * @param {Object} state - 当前应用状态
     * @param {EditorStore} store - 状态管理实例
     */
    render(state, store) {
        if (!this.canvas) {
            console.warn('[CanvasManager] 画布未初始化');
            return;
        }
        
        if (this._isUpdating) return;
        
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        if (!slide) {
            console.warn('[CanvasManager] 未找到活动幻灯片');
            return;
        }

        this.smartGuidesEnabled = state.presentation.settings.smartGuidesEnabled;

        const activeObj = this.canvas.getActiveObject();
        const isInMultiSelect = activeObj && activeObj.type === 'activeSelection';
        
        // 修复：多选状态下仍然需要更新元素位置，但不能销毁选择
        // 记录当前多选的对象ID
        let multiSelectedIds = [];
        if (isInMultiSelect) {
            multiSelectedIds = activeObj.getObjects()
                .filter(o => o.elementId)
                .map(o => o.elementId);
        }

        const existingObjects = this.canvas.getObjects();
        const existingIds = new Set(existingObjects.map(o => o.elementId));
        const newIds = new Set(slide.elements.map(e => e.id));

        existingObjects.forEach(obj => {
            if (obj.elementId && !newIds.has(obj.elementId)) {
                this.canvas.remove(obj);
            }
        });

        slide.elements.forEach((element, index) => {
            const style = element.style || {};
            const left = style.x || 0;
            const top = style.y || 0;
            const width = style.width || 100;
            const height = style.height || 50;
            
            let existingObj = this.canvas.getObjects().find(o => o.elementId === element.id);
            
            if (existingObj) {
                // 【关键修复】如果元素在多选组中，不要更新其位置
                // 因为此时元素的 left/top 是相对于组的坐标，不是画布坐标
                const isInActiveSelection = activeObj && activeObj.type === 'activeSelection' &&
                    activeObj.getObjects().some(o => o.elementId === element.id);
                
                if (isInActiveSelection) {
                    // 元素在多选组中，跳过位置更新
                    return;
                }
                
                if (element.type === 'textbox') {
                    const isFixedMode = element.textMode === 'fixed';
                    
                    const needsRecreate = (isFixedMode && existingObj.type !== 'textbox') || 
                                          (!isFixedMode && existingObj.type === 'textbox');
                    
                    if (needsRecreate) {
                        this.canvas.remove(existingObj);
                        const commonProps = { left, top, width, height };
                        let newObj = this.createFabricObject(element, commonProps);
                        if (newObj) {
                            newObj.elementId = element.id;
                            newObj.elementData = element;
                            this.canvas.add(newObj);
                        }
                    } else {
                        existingObj.set('left', left);
                        existingObj.set('top', top);
                        existingObj.set('width', width);
                        existingObj.set('height', height);
                        existingObj.setCoords();
                        
                        existingObj.set('text', element.content || '');
                        existingObj.set('fontSize', style.fontSize || 24);
                        existingObj.set('fill', style.color || '#333333');
                        existingObj.set('fontWeight', style.fontWeight || 'normal');
                        existingObj.set('fontStyle', style.fontStyle || 'normal');
                        existingObj.set('textAlign', style.textAlign || 'left');
                        existingObj.set('fontFamily', style.fontFamily || 'Arial');
                        existingObj.set('lineHeight', style.lineHeight || 1.5);
                    }
                } else {
                    existingObj.set('left', left);
                    existingObj.set('top', top);
                    
                    if (element.type === 'shape' || element.type === 'button') {
                        existingObj.set('width', width);
                        existingObj.set('height', height);
                        existingObj.set('fill', style.fill || '#007acc');
                    } else if (element.type === 'media' || element.type === 'image') {
                        if (existingObj.type === 'image') {
                            const scaleX = width / (existingObj.width || width);
                            const scaleY = height / (existingObj.height || height);
                            existingObj.set('scaleX', scaleX);
                            existingObj.set('scaleY', scaleY);
                        }
                    }
                    
                    existingObj.setCoords();
                }
            } else {
                const commonProps = { left, top, width, height };
                let newObj = this.createFabricObject(element, commonProps);
                if (newObj) {
                    newObj.elementId = element.id;
                    newObj.elementData = element;
                    this.canvas.add(newObj);
                }
            }
        });

        // 处理选择状态 - 修复多选/单选切换问题
        this._isUpdating = true;
        try {
            const currentActive = this.canvas.getActiveObject();
            const isCurrentlyMultiSelect = currentActive && currentActive.type === 'activeSelection';
            
            // 情况1：当前是多选状态，且 store 中也是多选
            if (isCurrentlyMultiSelect && state.selectedElementIds && state.selectedElementIds.length > 1) {
                const currentIds = currentActive.getObjects()
                    .filter(o => o.elementId)
                    .map(o => o.elementId)
                    .sort();
                const storeIds = [...state.selectedElementIds].sort();
                
                // 如果选中元素相同，保持选择不变
                if (JSON.stringify(currentIds) === JSON.stringify(storeIds)) {
                    // 保持现状，不做任何操作
                } else {
                    // 选中元素不同，重新创建多选组
                    const objectsToSelect = this.canvas.getObjects()
                        .filter(o => state.selectedElementIds.includes(o.elementId));
                    if (objectsToSelect.length > 1) {
                        const selection = new fabric.ActiveSelection(objectsToSelect, { canvas: this.canvas });
                        this.canvas.setActiveObject(selection);
                        // 【修复】重新创建多选组后记录中心点
                        this._lastGroupCenter = selection.getCenterPoint();
                        this.debug('重新创建多选组，记录中心点:', this._lastGroupCenter);
                    }
                }
            }
            // 情况2：当前是单选状态，store 中也是单选
            else if (!isCurrentlyMultiSelect && state.activeElementId) {
                const currentSelectedId = currentActive?.elementId;
                if (currentSelectedId !== state.activeElementId) {
                    const objToSelect = this.canvas.getObjects().find(o => o.elementId === state.activeElementId);
                    if (objToSelect) {
                        this.canvas.setActiveObject(objToSelect);
                    }
                }
            }
            // 情况3：从多选切换到单选
            else if (isCurrentlyMultiSelect && state.activeElementId && (!state.selectedElementIds || state.selectedElementIds.length <= 1)) {
                const objToSelect = this.canvas.getObjects().find(o => o.elementId === state.activeElementId);
                if (objToSelect) {
                    this.canvas.setActiveObject(objToSelect);
                }
            }
            // 情况4：从单选切换到多选
            else if (!isCurrentlyMultiSelect && state.selectedElementIds && state.selectedElementIds.length > 1) {
                const objectsToSelect = this.canvas.getObjects()
                    .filter(o => state.selectedElementIds.includes(o.elementId));
                if (objectsToSelect.length > 1) {
                    const selection = new fabric.ActiveSelection(objectsToSelect, { canvas: this.canvas });
                    this.canvas.setActiveObject(selection);
                    // 【修复】创建多选组后立即记录中心点
                    this._lastGroupCenter = selection.getCenterPoint();
                    this.debug('创建多选组，记录中心点:', this._lastGroupCenter);
                }
            }
            // 情况5：无选中状态
            else if (!state.activeElementId && (!state.selectedElementIds || state.selectedElementIds.length === 0)) {
                if (currentActive) {
                    this.canvas.discardActiveObject();
                }
            }
        } finally {
            this._isUpdating = false;
        }

        this.canvas.renderAll();
    },

    /**
     * 创建 Fabric.js 对象
     * 
     * 根据元素数据创建对应的 Fabric.js 对象。
     * 支持的类型：
     * - textbox: 文本框（支持 fixed/auto 两种模式）
     * - shape: 形状（矩形、圆形、三角形、线条等）
     * - button: 按钮
     * - media/image: 媒体（图片、视频、音频）
     * 
     * @param {Object} element - 元素数据对象
     * @param {Object} commonProps - 通用属性（left, top, width, height）
     * @returns {fabric.Object|null} 创建的 Fabric.js 对象，失败返回 null
     */
    createFabricObject(element, commonProps) {
        let obj = null;
        
        try {
            const style = element.style || {};
            const left = commonProps.left || 0;
            const top = commonProps.top || 0;
            const width = commonProps.width || 100;
            const height = commonProps.height || 50;
            
            switch (element.type) {
                case 'textbox':
                    const isFixedMode = element.textMode === 'fixed';
                    if (isFixedMode) {
                        obj = new fabric.Textbox(element.content || '文本', {
                            left: left,
                            top: top,
                            width: width,
                            fontSize: style.fontSize || 24,
                            fill: style.color || '#333333',
                            fontFamily: style.fontFamily || 'Arial',
                            fontWeight: style.fontWeight || 'normal',
                            fontStyle: style.fontStyle || 'normal',
                            textAlign: style.textAlign || 'left',
                            lineHeight: style.lineHeight || 1.5,
                            backgroundColor: style.backgroundColor || 'transparent',
                            lockScalingY: false,
                            splitByGrapheme: false
                        });
                        obj.setControlsVisibility({
                            mt: true,
                            mb: true,
                            ml: true,
                            mr: true
                        });
                    } else {
                        obj = new fabric.IText(element.content || '文本', {
                            left: left,
                            top: top,
                            fontSize: style.fontSize || 24,
                            fill: style.color || '#333333',
                            fontFamily: style.fontFamily || 'Arial',
                            fontWeight: style.fontWeight || 'normal',
                            fontStyle: style.fontStyle || 'normal',
                            textAlign: style.textAlign || 'left',
                            lineHeight: style.lineHeight || 1.5,
                            backgroundColor: style.backgroundColor || 'transparent'
                        });
                    }
                    break;
                    
                case 'shape':
                    // 形状：根据 shapeType 创建不同形状
                    const fill = style.fill || '#007acc';
                    if (element.shapeType === 'circle') {
                        obj = new fabric.Circle({
                            left: left,
                            top: top,
                            radius: (style.width || 100) / 2,
                            fill: fill
                        });
                    } else if (element.shapeType === 'triangle') {
                        obj = new fabric.Triangle({
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                            fill: fill
                        });
                    } else if (element.shapeType === 'line') {
                        obj = new fabric.Line([left, top, left + width, top], {
                            stroke: fill,
                            strokeWidth: 4
                        });
                    } else {
                        // 默认：矩形
                        obj = new fabric.Rect({
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                            fill: fill
                        });
                    }
                    break;
                    
                case 'button':
                    obj = new fabric.Rect({
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        fill: style.fill || '#3b82f6',
                        rx: 4,
                        ry: 4
                    });
                    break;
                    
                case 'table':
                    obj = this.createTableElement(element, left, top);
                    break;
                    
                case 'chart':
                    obj = this.createChartElement(element, left, top);
                    break;
                    
                case 'media':
                case 'image':
                    // 媒体：图片、视频、音频
                    if (element.mediaType === 'image' || element.type === 'image') {
                        const imgSrc = element.content || '';
                        if (imgSrc.startsWith('data:') || imgSrc.startsWith('http')) {
                            // 异步加载图片
                            fabric.Image.fromURL(imgSrc, (img) => {
                                img.set({
                                    left: left,
                                    top: top,
                                    scaleX: width / (img.width || width),
                                    scaleY: height / (img.height || height)
                                });
                                img.elementId = element.id;
                                img.elementData = element;
                                this.canvas.add(img);
                                this.canvas.renderAll();
                            }, { crossOrigin: 'anonymous' });
                            return null;  // 异步加载，返回 null
                        } else {
                            // 无有效图片源：显示占位符
                            obj = new fabric.Rect({
                                left: left,
                                top: top,
                                width: width,
                                height: height,
                                fill: '#e5e5e5',
                                stroke: '#a3a3a3',
                                strokeWidth: 2
                            });
                        }
                    } else if (element.mediaType === 'video') {
                        // 视频占位符
                        obj = new fabric.Rect({
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                            fill: '#1f2937',
                            stroke: '#374151',
                            strokeWidth: 2
                        });
                    } else if (element.mediaType === 'audio') {
                        // 音频占位符
                        obj = new fabric.Rect({
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                            fill: '#f3f4f6',
                            stroke: '#9ca3af',
                            strokeWidth: 1
                        });
                    } else {
                        // 未知媒体类型：默认占位符
                        obj = new fabric.Rect({
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                            fill: '#d4d4d8'
                        });
                    }
                    break;
                    
                case 'table':
                    // 表格：使用 fabric.Group 组合多个矩形和文本
                    const tableRows = element.rows || 3;
                    const tableCols = element.cols || 3;
                    const cellWidth = width / tableCols;
                    const cellHeight = height / tableRows;
                    const tableFill = style.fill || '#ffffff';
                    const tableStroke = style.stroke || '#d4d4d8';
                    const tableStrokeWidth = style.strokeWidth || 1;
                    
                    const tableObjects = [];
                    
                    // 创建表格单元格
                    for (let r = 0; r < tableRows; r++) {
                        for (let c = 0; c < tableCols; c++) {
                            // 单元格背景
                            const cellRect = new fabric.Rect({
                                left: left + c * cellWidth,
                                top: top + r * cellHeight,
                                width: cellWidth,
                                height: cellHeight,
                                fill: tableFill,
                                stroke: tableStroke,
                                strokeWidth: tableStrokeWidth,
                                selectable: false
                            });
                            tableObjects.push(cellRect);
                        }
                    }
                    
                    // 创建表格组
                    obj = new fabric.Group(tableObjects, {
                        left: left,
                        top: top,
                        selectable: true
                    });
                    break;
                    
                case 'icon':
                    // 图标：使用 fabric.Path 或简单的 SVG 图形
                    const iconColor = style.color || '#333333';
                    const iconSize = Math.min(width, height);
                    const iconLeft = left + (width - iconSize) / 2;
                    const iconTop = top + (height - iconSize) / 2;
                    
                    // 内置图标路径
                    const iconPaths = {
                        smile: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
                        star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
                        heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
                        check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
                        cross: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
                        arrow: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
                        home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
                        settings: 'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
                        user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
                        mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
                        phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
                        location: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                        calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z',
                        clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
                        folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
                        file: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
                        cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
                        download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
                        upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
                        link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
                        lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
                        unlock: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
                        search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
                        trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
                        edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
                        add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
                        remove: 'M19 13H5v-2h14v2z',
                        play: 'M8 5v14l11-7z',
                        pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
                        stop: 'M6 6h12v12H6z'
                    };
                    
                    const iconName = element.iconName || 'star';
                    const pathData = iconPaths[iconName] || iconPaths.star;
                    
                    // 创建图标路径
                    const path = new fabric.Path(pathData, {
                        left: iconLeft,
                        top: iconTop,
                        fill: iconColor,
                        scaleX: iconSize / 24,
                        scaleY: iconSize / 24,
                        selectable: false
                    });
                    
                    // 创建背景
                    const iconBg = new fabric.Rect({
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        fill: 'transparent',
                        selectable: false
                    });
                    
                    // 组合图标和背景
                    obj = new fabric.Group([iconBg, path], {
                        left: left,
                        top: top,
                        selectable: true
                    });
                    break;
                    
                default:
                    // 未知类型：创建默认矩形
                    obj = new fabric.Rect({
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        fill: '#d4d4d8'
                    });
            }
            
            // 设置元素 ID 和数据引用
            if (obj) {
                obj.elementId = element.id;
                obj.elementData = element;
            }
        } catch (error) {
            console.error('[CanvasManager] 创建对象失败:', error, element);
        }
        
        return obj;
    },

    /**
     * 对象修改事件处理
     * 
     * 当用户完成对象的修改（移动、缩放、旋转等）时触发。
     * 支持单选和多选：
     * - 单选：更新单个元素的样式
     * - 多选：分解变换矩阵，更新每个元素的独立位置
     * 
     * @param {Object} e - 事件对象，e.target 为被修改的对象
     */
    onObjectModified(e) {
        const obj = e.target;
        if (!obj) return;
        
        const store = window.editor?.store;
        const state = store?.getState();
        if (!state) return;
        
        this._isUpdating = true;
        
        try {
            if (obj.type === 'activeSelection') {
                const objects = obj.getObjects();
                const updates = [];
                
                this.debug('多选组修改，使用画布中心点计算法');
                
                // 【核心修复】使用画布中心点计算法
                // 1. 获取拖动后的组中心点（当前实际位置）
                const newCenter = obj.getCenterPoint();
                
                // 2. 获取拖动前的组中心点（从 _lastGroupCenter 获取）
                const oldCenter = this._lastGroupCenter || newCenter;
                
                // 3. 计算位移向量（绝对坐标）
                const deltaX = newCenter.x - oldCenter.x;
                const deltaY = newCenter.y - oldCenter.y;
                
                this.debug('组中心点位移:', {
                    oldCenter: { x: oldCenter.x, y: oldCenter.y },
                    newCenter: { x: newCenter.x, y: newCenter.y },
                    delta: { x: deltaX, y: deltaY }
                });
                
                // 4. 对每个元素应用绝对位移
                objects.forEach((o) => {
                    if (!o.elementId) return;
                    
                    const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                    const element = slide?.elements.find(el => el.id === o.elementId);
                    if (!element) return;
                    
                    // 【关键】使用元素的原始位置 + 位移量
                    const newX = element.style.x + deltaX;
                    const newY = element.style.y + deltaY;
                    
                    // 计算旋转角度变化
                    const newAngle = (element.style.angle || 0) + (obj.angle || 0);
                    
                    // 计算缩放后的尺寸
                    const scaleX = obj.scaleX || 1;
                    const scaleY = obj.scaleY || 1;
                    const newWidth = Math.round((element.style.width || 100) * scaleX);
                    const newHeight = Math.round((element.style.height || 50) * scaleY);
                    
                    console.log(`[CanvasManager] 元素 ${o.elementId}:`, {
                        oldPos: { x: element.style.x, y: element.style.y },
                        newPos: { x: newX, y: newY },
                        delta: { x: deltaX, y: deltaY }
                    });
                    
                    updates.push({
                        elementId: o.elementId,
                        style: {
                            x: Math.round(newX),
                            y: Math.round(newY),
                            width: newWidth,
                            height: newHeight,
                            angle: Math.round(newAngle)
                        }
                    });
                });
                
                // 5. 批量更新到 Store
                updates.forEach(update => {
                    store.updateElement(state.activeSlideId, update.elementId, {
                        style: update.style
                    });
                });
                
                // 6. 解散多选组
                this.canvas.discardActiveObject();
                
                // 7. 设置每个对象的新位置
                objects.forEach((o) => {
                    const update = updates.find(u => u.elementId === o.elementId);
                    if (update) {
                        o.set({
                            left: update.style.x,
                            top: update.style.y,
                            scaleX: 1,
                            scaleY: 1,
                            width: update.style.width,
                            height: update.style.height,
                            angle: update.style.angle
                        });
                        o.setCoords();
                    }
                });
                
                // 8. 清除多选状态
                store.clearSelection();
                
                // 9. 清除记录的中心点
                this._lastGroupCenter = null;
                
                this.canvas.renderAll();
                this.debug('多选组修改完成');
                return;
            }
            
            // 单选情况
            if (!obj.elementId) return;
            
            const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
            const element = slide?.elements.find(el => el.id === obj.elementId);
            if (!element) return;
            
            let newWidth, newHeight;
            
            if (element.type === 'textbox' && element.textMode === 'fixed') {
                newWidth = Math.round(obj.width * (obj.scaleX || 1));
                newHeight = Math.round((obj.height || element.style.height) * (obj.scaleY || 1));
                
                obj.set({
                    width: newWidth,
                    scaleX: 1,
                    scaleY: 1
                });
            } else {
                newWidth = Math.round((obj.width || element.style.width) * (obj.scaleX || 1));
                newHeight = Math.round((obj.height || element.style.height) * (obj.scaleY || 1));
                
                obj.set({ 
                    scaleX: 1, 
                    scaleY: 1, 
                    width: newWidth, 
                    height: newHeight 
                });
            }
            
            store.updateElement(state.activeSlideId, obj.elementId, {
                style: {
                    x: Math.round(obj.left) || element.style.x,
                    y: Math.round(obj.top) || element.style.y,
                    width: newWidth,
                    height: newHeight,
                    angle: Math.round(obj.angle) || 0
                }
            });
        } finally {
            this._isUpdating = false;
        }
    },

    /**
     * 选择变化事件处理
     * 
     * 当用户选择画布上的对象时触发。
     * 支持单选和多选：
     * - 单选：更新 store 中的 activeElementId，显示属性面板
     * - 多选：不更新 activeElementId，保持多选状态
     * 
     * 注意：多选时 activeElementId 为 null，属性面板应显示多选提示
     * 
     * @param {Object} e - 事件对象，包含 selected 和 deselected 数组
     */
    onSelectionChanged(e) {
        if (this._isUpdating) return;
        
        const store = window.editor?.store;
        if (!store) return;
        
        const activeObject = this.canvas.getActiveObject();
        
        if (activeObject && activeObject.type === 'activeSelection') {
            const selectedIds = activeObject.getObjects()
                .filter(o => o.elementId && !o.isPathGuide && !o.isControlPoint)
                .map(o => o.elementId);
            
            if (selectedIds.length === 0) {
                this.canvas.discardActiveObject();
                this.canvas.renderAll();
                return;
            }
            
            store.setMultiSelection(selectedIds);
            this._lastGroupCenter = activeObject.getCenterPoint();
            this.debug('onSelectionChanged 记录多选组中心点:', this._lastGroupCenter);
            return;
        }
        
        if (e.selected && e.selected.length > 0) {
            const selectedObj = e.selected[0];
            if (selectedObj.isPathGuide || selectedObj.isControlPoint) {
                this.canvas.discardActiveObject();
                this.canvas.renderAll();
                return;
            }
            if (selectedObj.elementId) {
                const state = store.getState();
                if (state.activeElementId !== selectedObj.elementId) {
                    store.selectElement(selectedObj.elementId);
                }
            }
        }
    },

    onSelectionCleared() {
        if (this._isUpdating) return;
        
        const store = window.editor?.store;
        const state = store?.getState();
        
        if (store && state && (state.activeElementId !== null || state.selectedElementIds?.length > 0)) {
            store.clearSelection();
        }
    },

    /**
     * 文本变化事件处理
     * 
     * 当用户编辑文本内容时触发。
     * 实时更新元素数据中的 content 字段。
     * 
     * @param {Object} e - 事件对象，e.target 为被编辑的文本对象
     */
    onTextChanged(e) {
        const obj = e.target;
        if (!obj || !obj.elementId) return;
        
        const store = window.editor?.store;
        const state = store?.getState();
        if (!state) return;
        
        this._isUpdating = true;
        try {
            store.updateElement(state.activeSlideId, obj.elementId, { content: obj.text });
        } finally {
            this._isUpdating = false;
        }
    },

    /**
     * 鼠标按下事件处理
     * 
     * 处理右键菜单显示。
     * 
     * @param {Object} e - 事件对象
     */
    onMouseDown(e) {
        // 记录多选组的初始中心点（用于计算位移）
        const obj = e.target;
        if (obj && obj.type === 'activeSelection') {
            this._lastGroupCenter = obj.getCenterPoint();
            this.debug('记录多选组初始中心点:', this._lastGroupCenter);
        }
        
        // 右键点击：显示上下文菜单
        if (e.button === 3 && e.target && e.target.elementId) {
            e.e.preventDefault();
            const store = window.editor?.store;
            if (store) store.selectElement(e.target.elementId);
            if (window.ContextMenu) {
                window.ContextMenu.show(e.e.clientX, e.e.clientY, e.target.elementId);
            }
        } else {
            // 其他点击：隐藏菜单
            if (window.ContextMenu) window.ContextMenu.hide();
        }
    },

    /**
     * 删除选中的对象
     * 
     * 支持删除单个或多个选中的对象。
     * 从 store 中删除元素数据，画布会自动更新。
     */
    deleteSelected() {
        const store = window.editor?.store;
        const state = store?.getState();
        if (!state || !state.activeSlideId) return;
        
        // 获取所有选中的对象
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(obj => {
                if (obj.elementId) {
                    store.deleteElement(state.activeSlideId, obj.elementId);
                }
            });
            this.canvas.discardActiveObject();
        }
    },
    
    /**
     * 强制刷新画布
     * 
     * 手动触发画布重新渲染。
     * 用于某些需要强制刷新的场景。
     */
    refresh() {
        if (this.canvas) {
            this.canvas.renderAll();
        }
    },
    
    /**
     * 销毁画布管理器（清理资源）
     * 
     * 清理 Fabric.js 画布实例和所有事件监听器。
     */
    destroy() {
        console.log('[CanvasManager] 开始清理资源...');
        
        // 清理参考线
        this.clearGuideLines();
        this.guideLines = { horizontal: [], vertical: [] };
        
        // 清理画布
        if (this.canvas) {
            // 移除所有事件监听器
            this.canvas.off();
            // 清空画布
            this.canvas.clear();
            // 销毁画布
            this.canvas.dispose();
            this.canvas = null;
        }
        
        // 重置状态
        this._isUpdating = false;
        this.zoomLevel = 1;
        
        console.log('[CanvasManager] 资源清理完成');
    }
};

// 导出到全局作用域
window.CanvasManager = CanvasManager;

CanvasManager.createTableElement = function(element, left, top) {
    const style = element.style || {};
    const data = element.content || [];
    const rows = data.length || 3;
    const cols = (data[0] || []).length || 4;
    const cellWidth = style.cellWidth || 100;
    const cellHeight = style.cellHeight || 40;
    const width = cols * cellWidth;
    const height = rows * cellHeight;
    
    const group = new fabric.Group([], {
        left: left,
        top: top,
        width: width,
        height: height
    });
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellLeft = c * cellWidth;
            const cellTop = r * cellHeight;
            
            const rect = new fabric.Rect({
                left: cellLeft,
                top: cellTop,
                width: cellWidth,
                height: cellHeight,
                fill: style.fill || '#ffffff',
                stroke: style.stroke || '#000000',
                strokeWidth: style.strokeWidth || 1
            });
            group.add(rect);
            
            const text = data[r]?.[c] || '';
            if (text) {
                const textObj = new fabric.Text(text, {
                    left: cellLeft + cellWidth / 2,
                    top: cellTop + cellHeight / 2,
                    fontSize: 12,
                    originX: 'center',
                    originY: 'center'
                });
                group.add(textObj);
            }
        }
    }
    
    return group;
};

CanvasManager.createChartElement = function(element, left, top) {
    const style = element.style || {};
    const content = element.content || {};
    const chartType = element.chartType || 'bar';
    const data = content.data || [30, 50, 40, 60, 35];
    const labels = content.labels || [];
    const title = content.title || '';
    
    const width = style.width || 400;
    const height = style.height || 300;
    const fill = style.fill || '#3b82f6';
    
    const group = new fabric.Group([], {
        left: left,
        top: top,
        width: width,
        height: height
    });
    
    const bg = new fabric.Rect({
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: '#ffffff',
        stroke: '#e4e4e7',
        strokeWidth: 1
    });
    group.add(bg);
    
    if (title) {
        const titleObj = new fabric.Text(title, {
            left: width / 2,
            top: 20,
            fontSize: 16,
            fontWeight: 'bold',
            originX: 'center'
        });
        group.add(titleObj);
    }
    
    const maxVal = Math.max(...data);
    const chartHeight = height - 60;
    const chartWidth = width - 40;
    const barWidth = chartWidth / data.length - 10;
    
    data.forEach((val, i) => {
        const barHeight = (val / maxVal) * chartHeight;
        const barLeft = 20 + i * (barWidth + 10);
        const barTop = height - 30 - barHeight;
        
        const bar = new fabric.Rect({
            left: barLeft,
            top: barTop,
            width: barWidth,
            height: barHeight,
            fill: fill,
            rx: 4,
            ry: 4
        });
        group.add(bar);
        
        if (labels[i]) {
            const label = new fabric.Text(labels[i], {
                left: barLeft + barWidth / 2,
                top: height - 15,
                fontSize: 10,
                originX: 'center'
            });
            group.add(label);
        }
    });
    
    return group;
};
