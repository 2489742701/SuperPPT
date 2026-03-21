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

    /**
     * 初始化画布
     * 
     * 创建 Fabric.js 画布实例，绑定事件监听器。
     * 
     * @returns {Promise<fabric.Canvas>} 画布实例
     */
    async init() {
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
        
        console.log('[CanvasManager] 画布初始化完成');
        
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

        // 处理选择状态
        if (isInMultiSelect && multiSelectedIds.length > 0) {
            // 修复：多选状态下，如果 store 中的选中状态与当前一致，保持选择
            // 这防止了 render 过程中销毁和重建多选组导致的位置问题
            const currentActive = this.canvas.getActiveObject();
            if (currentActive && currentActive.type === 'activeSelection') {
                // 保持当前多选状态，不做任何更改
                // 这样可以避免多选组被销毁后重新创建导致的位置错乱
            }
        } else if (state.activeElementId) {
            const objToSelect = this.canvas.getObjects().find(o => o.elementId === state.activeElementId);
            if (objToSelect && objToSelect !== this.canvas.getActiveObject()) {
                this._isUpdating = true;
                try {
                    this.canvas.setActiveObject(objToSelect);
                } finally {
                    this._isUpdating = false;
                }
            }
        } else if (state.selectedElementIds && state.selectedElementIds.length > 1) {
            const objectsToSelect = this.canvas.getObjects()
                .filter(o => state.selectedElementIds.includes(o.elementId));
            if (objectsToSelect.length > 1) {
                this._isUpdating = true;
                try {
                    const selection = new fabric.ActiveSelection(objectsToSelect, {
                        canvas: this.canvas
                    });
                    this.canvas.setActiveObject(selection);
                } finally {
                    this._isUpdating = false;
                }
            }
        } else {
            const activeObj = this.canvas.getActiveObject();
            if (!activeObj || (activeObj.type !== 'activeSelection' && activeObj.elementId)) {
                this._isUpdating = true;
                try {
                    this.canvas.discardActiveObject();
                } finally {
                    this._isUpdating = false;
                }
            }
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
                    // 文本框：根据 textMode 选择不同的 Fabric 类型
                    const isFixedMode = element.textMode === 'fixed';
                    if (isFixedMode) {
                        // 文本框模式：固定宽度，可拖动调整大小
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
                            backgroundColor: style.backgroundColor || 'transparent'
                        });
                    } else {
                        // 纯文本模式：自动调整大小，不可拖动调整宽度
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
                    // 按钮：带圆角的矩形
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
                
                // 关键：在多选组仍然存在时，计算每个对象的绝对位置
                objects.forEach((o) => {
                    if (!o.elementId) return;
                    
                    const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                    const element = slide?.elements.find(el => el.id === o.elementId);
                    if (!element) return;
                    
                    // 使用 calcTransformMatrix 获取对象的完整变换矩阵
                    // 这包含了对象自身的变换 + 多选组的变换
                    const matrix = o.calcTransformMatrix();
                    const transform = fabric.util.qrDecompose(matrix);
                    
                    // 安全获取缩放值，防止 NaN
                    const scaleX = transform.scaleX || 1;
                    const scaleY = transform.scaleY || 1;
                    const angle = transform.angle || 0;
                    
                    // transform.x/y 是对象的中心点
                    // 需要转换为左上角坐标
                    const objWidth = o.width || element.style.width || 100;
                    const objHeight = o.height || element.style.height || 50;
                    const scaledWidth = objWidth * scaleX;
                    const scaledHeight = objHeight * scaleY;
                    
                    const absoluteX = Math.round((transform.x || 0) - scaledWidth / 2);
                    const absoluteY = Math.round((transform.y || 0) - scaledHeight / 2);
                    const absoluteAngle = Math.round(angle);
                    
                    updates.push({
                        elementId: o.elementId,
                        style: {
                            x: absoluteX,
                            y: absoluteY,
                            width: Math.round(scaledWidth),
                            height: Math.round(scaledHeight),
                            angle: absoluteAngle
                        },
                        // 保存绝对坐标用于后续同步
                        _absoluteX: absoluteX,
                        _absoluteY: absoluteY,
                        _absoluteAngle: absoluteAngle,
                        _scaledWidth: scaledWidth,
                        _scaledHeight: scaledHeight
                    });
                });
                
                // 更新 store
                updates.forEach(update => {
                    store.updateElement(state.activeSlideId, update.elementId, {
                        style: update.style
                    });
                });
                
                // 关键修复：在多选组仍然存在时，直接设置对象的绝对坐标
                // 这样当多选组被销毁时，对象已经在正确的位置
                objects.forEach((o) => {
                    const update = updates.find(u => u.elementId === o.elementId);
                    if (update) {
                        // 设置对象的绝对坐标
                        o.set({
                            left: update._absoluteX,
                            top: update._absoluteY,
                            scaleX: 1,
                            scaleY: 1,
                            width: update._scaledWidth,
                            height: update._scaledHeight,
                            angle: update._absoluteAngle
                        });
                        o.setCoords();
                    }
                });
                
                // 不要在这里销毁多选组！让用户自然取消选择
                // 这样可以避免 Fabric.js 重新计算位置时的错误
                
                this.canvas.renderAll();
                return;
            }
            
            // 单选情况
            if (!obj.elementId) return;
            
            const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
            const element = slide?.elements.find(el => el.id === obj.elementId);
            if (!element) return;
            
            const newWidth = Math.round((obj.width || element.style.width) * (obj.scaleX || 1));
            const newHeight = Math.round((obj.height || element.style.height) * (obj.scaleY || 1));
            
            // 更新元素样式
            store.updateElement(state.activeSlideId, obj.elementId, {
                style: {
                    x: Math.round(obj.left) || element.style.x,
                    y: Math.round(obj.top) || element.style.y,
                    width: newWidth,
                    height: newHeight,
                    angle: Math.round(obj.angle) || 0
                }
            });
            
            // 重置对象的缩放（已应用到尺寸中）
            obj.set({ 
                scaleX: 1, 
                scaleY: 1, 
                width: newWidth, 
                height: newHeight 
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
                .filter(o => o.elementId)
                .map(o => o.elementId);
            store.setMultiSelection(selectedIds);
            return;
        }
        
        if (e.selected && e.selected.length > 0) {
            const selectedObj = e.selected[0];
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
    }
};

// 导出到全局作用域
window.CanvasManager = CanvasManager;
