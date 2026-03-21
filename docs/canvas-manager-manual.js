/**
 * 画布管理模块 (CanvasManager) - 技术手册
 * 
 * 本文档记录了 CanvasManager 模块的核心设计和实现细节，
 * 供开发者参考和维护。
 * 
 * ============================================================
 * 一、模块概述
 * ============================================================
 * 
 * CanvasManager 是编辑器的核心渲染层，负责：
 * 1. Fabric.js 画布的初始化和配置
 * 2. 幻灯片元素的渲染与更新
 * 3. 用户交互事件处理（选择、移动、缩放、文本编辑等）
 * 4. 智能参考线（Smart Guides）功能
 * 5. 画布缩放与视图控制
 * 
 * 依赖：
 * - Fabric.js: 画布渲染引擎
 * - EditorStore (store.js): 状态管理
 * 
 * ============================================================
 * 二、核心属性
 * ============================================================
 * 
 * canvas: fabric.Canvas|null     - Fabric.js 画布实例
 * slideWidth: number             - 幻灯片宽度（默认 1200px）
 * slideHeight: number            - 幻灯片高度（默认 675px，16:9 比例）
 * smartGuidesEnabled: boolean    - 是否启用智能参考线
 * guideLines: { horizontal: [], vertical: [] } - 参考线存储
 * guideColor: string             - 参考线颜色（默认 '#00a8ff'）
 * guideThreshold: number         - 吸附阈值（默认 8px）
 * zoomLevel: number              - 当前缩放级别（默认 1）
 * minZoom: number                - 最小缩放（默认 0.25）
 * maxZoom: number                - 最大缩放（默认 4）
 * _isUpdating: boolean           - 更新标志，防止循环调用
 * 
 * ============================================================
 * 三、文本模式说明
 * ============================================================
 * 
 * 文本元素支持两种模式，通过 textMode 属性区分：
 * 
 * 1. fixed（文本框模式）- 默认模式
 *    - 使用 fabric.Textbox
 *    - 可拖动调整大小
 *    - 宽度固定，文本自动换行
 * 
 * 2. auto（纯文本模式）
 *    - 使用 fabric.IText
 *    - 根据文本内容自动调整大小
 *    - 不可拖动调整宽度
 * 
 * 示例：
 * { type: 'textbox', textMode: 'fixed', content: '标题', style: {...} }
 * { type: 'textbox', textMode: 'auto', content: '纯文本', style: {...} }
 * 
 * ============================================================
 * 四、核心方法
 * ============================================================
 * 
 * 4.1 init() - 初始化画布
 * --------------------------
 * 创建 Fabric.js 画布实例，绑定事件监听器。
 * 
 * 事件绑定：
 * - object:modified  → onObjectModified
 * - selection:created → onSelectionChanged
 * - selection:updated → onSelectionChanged
 * - selection:cleared → onSelectionCleared
 * - text:changed     → onTextChanged
 * - mouse:down       → onMouseDown
 * - object:moving    → onObjectMoving
 * - mouse:up         → clearGuideLines
 * 
 * 4.2 render(state, store) - 渲染幻灯片
 * ----------------------------------------
 * 核心渲染方法，将数据模型转换为可视元素。
 * 
 * 渲染策略：
 * 1. 增量更新：只更新变化的元素
 * 2. 智能复用：已存在的对象只更新属性
 * 3. 模式切换：文本模式变化时自动重建对象
 * 
 * 关键逻辑：
 * - 使用 _isUpdating 标志防止循环调用
 * - 比较现有对象 ID 和新元素 ID，删除不存在的对象
 * - 更新或创建元素时，检查是否在多选组中
 * 
 * 4.3 createFabricObject(element, commonProps) - 创建对象
 * ---------------------------------------------------------
 * 根据元素数据创建对应的 Fabric.js 对象。
 * 
 * 支持的类型：
 * - textbox: 文本框（根据 textMode 选择 Textbox 或 IText）
 * - shape: 形状（矩形、圆形、三角形、线条）
 * - button: 按钮
 * - media/image: 媒体
 * 
 * 4.4 onObjectModified(e) - 对象修改事件
 * -----------------------------------------
 * 处理移动、缩放、旋转等修改操作。
 * 
 * 单选处理：
 * - 更新元素的 x, y, width, height, angle
 * - 重置对象的 scaleX/scaleY 为 1
 * 
 * 多选处理（activeSelection）：
 * - 使用 calcTransformMatrix() 获取变换矩阵
 * - 使用 qrDecompose() 分解矩阵得到实际位置
 * - 批量更新所有选中元素
 * - 同步更新画布对象位置（防止偏移）
 * 
 * 4.5 onSelectionChanged(e) - 选择变化事件
 * -------------------------------------------
 * 处理选择状态变化。
 * 
 * 多选检测：
 * - activeObject.type === 'activeSelection' 表示多选
 * - 多选时不更新 activeElementId
 * 
 * 防循环调用：
 * - 检查 _isUpdating 标志
 * - 检查是否已是当前选中元素
 * 
 * 4.6 onObjectMoving(e) - 对象移动事件
 * ---------------------------------------
 * 处理智能参考线显示。
 * 
 * 对齐点：
 * - 画布边缘（左、右、上、下）
 * - 画布中心
 * - 其他对象的边缘和中心
 * 
 * 多选处理：
 * - 使用 getCenterPoint() 获取绝对坐标
 * - 计算选择组的边界框
 * 
 * ============================================================
 * 五、循环调用防护
 * ============================================================
 * 
 * 潜在的循环调用链：
 * 用户点击 → selection:created → onSelectionChanged 
 * → store.selectElement → notify → render 
 * → setActiveObject → selection:created → ...
 * 
 * 防护措施：
 * 
 * 1. _isUpdating 标志
 *    - 在 onObjectModified、onTextChanged、render 中设置
 *    - 在 onSelectionChanged、onSelectionCleared 中检查
 * 
 * 2. 状态比较
 *    - onSelectionChanged: 检查 state.activeElementId !== selectedObj.elementId
 *    - onSelectionCleared: 检查 state.activeElementId !== null
 * 
 * 3. try-finally 包裹
 *    - 确保 _isUpdating 标志正确重置
 * 
 * 示例代码：
 * 
 * onSelectionChanged(e) {
 *     if (this._isUpdating) return;
 *     
 *     const store = window.editor?.store;
 *     const state = store?.getState();
 *     
 *     if (e.selected && e.selected.length > 0) {
 *         const selectedObj = e.selected[0];
 *         if (selectedObj.elementId) {
 *             if (state.activeElementId !== selectedObj.elementId) {
 *                 store.selectElement(selectedObj.elementId);
 *             }
 *         }
 *     }
 * }
 * 
 * ============================================================
 * 六、多选拖动位置偏移问题
 * ============================================================
 * 
 * 问题现象：
 * 多选拖动后点击空白处取消选择，元素位置偏移。
 * 
 * 根本原因：
 * onObjectModified 中只更新了 store 数据，
 * 但画布对象的位置没有同步更新。
 * 取消选择后，render 用旧的画布对象位置覆盖了新位置。
 * 
 * 解决方案：
 * 在 onObjectModified 的多选处理中，更新 store 后立即同步画布对象：
 * 
 * // 1. 收集更新数据
 * const updates = [];
 * objects.forEach((o) => {
 *     const matrix = o.calcTransformMatrix();
 *     const decomposed = fabric.util.qrDecompose(matrix);
 *     updates.push({
 *         elementId: o.elementId,
 *         style: { x: decomposed.translateX, y: decomposed.translateY, ... },
 *         newLeft: decomposed.translateX,
 *         newTop: decomposed.translateY
 *     });
 * });
 * 
 * // 2. 批量更新 store
 * updates.forEach(update => {
 *     store.updateElement(state.activeSlideId, update.elementId, { style: update.style });
 * });
 * 
 * // 3. 同步更新画布对象（关键！）
 * objects.forEach((o) => {
 *     const update = updates.find(u => u.elementId === o.elementId);
 *     if (update) {
 *         o.set({ left: update.newLeft, top: update.newTop, scaleX: 1, scaleY: 1 });
 *         o.setCoords();
 *     }
 * });
 * 
 * ============================================================
 * 七、智能参考线实现
 * ============================================================
 * 
 * 7.1 基本原理
 * -------------
 * 当对象移动时，计算其对齐点与画布/其他对象对齐点的距离。
 * 如果距离小于阈值（guideThreshold），则吸附并显示参考线。
 * 
 * 7.2 对齐点计算
 * ---------------
 * 对于每个对象，计算以下对齐点：
 * - 左边缘：left
 * - 水平中心：left + width/2
 * - 右边缘：left + width
 * - 上边缘：top
 * - 垂直中心：top + height/2
 * - 下边缘：top + height
 * 
 * 7.3 多选参考线
 * ---------------
 * 多选时，对象的 left/top 是相对于组的坐标。
 * 需要使用 getCenterPoint() 获取绝对坐标。
 * 
 * handleActiveSelectionMoving(target, threshold, canvasCenterX, canvasCenterY) {
 *     const objects = target.getObjects();
 *     
 *     // 计算选择组的边界（使用绝对坐标）
 *     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
 *     objects.forEach(obj => {
 *         const center = obj.getCenterPoint();
 *         const width = obj.getScaledWidth();
 *         const height = obj.getScaledHeight();
 *         const left = center.x - width / 2;
 *         const top = center.y - height / 2;
 *         minX = Math.min(minX, left);
 *         minY = Math.min(minY, top);
 *         maxX = Math.max(maxX, left + width);
 *         maxY = Math.max(maxY, top + height);
 *     });
 *     
 *     // 使用边界进行对齐计算...
 * }
 * 
 * ============================================================
 * 八、缩放功能
 * ============================================================
 * 
 * 8.1 滚轮缩放
 * -------------
 * 使用 Alt+滚轮 进行缩放。
 * 
 * onWheel(e) {
 *     e.preventDefault();
 *     
 *     const delta = e.deltaY > 0 ? -0.1 : 0.1;
 *     const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
 *     
 *     if (newZoom !== this.zoomLevel) {
 *         this.zoomLevel = newZoom;
 *         this.canvas.setDimensions({ 
 *             width: this.slideWidth * newZoom, 
 *             height: this.slideHeight * newZoom 
 *         });
 *         this.canvas.setZoom(newZoom);
 *         this.canvas.renderAll();
 *         this.updateZoomDisplay();
 *     }
 * }
 * 
 * 8.2 自适应大小
 * ---------------
 * resize() 方法根据容器大小自适应调整画布。
 * 保持 16:9 比例。
 * 
 * ============================================================
 * 九、常见问题排查
 * ============================================================
 * 
 * Q1: 元素位置偏移
 * A: 检查 onObjectModified 中是否正确同步了画布对象位置。
 *    确保调用了 obj.setCoords()。
 * 
 * Q2: 选择状态异常
 * A: 检查 _isUpdating 标志是否正确设置和重置。
 *    检查 onSelectionChanged 中的状态比较逻辑。
 * 
 * Q3: 循环调用导致堆栈溢出
 * A: 检查 render 中的 setActiveObject/discardActiveObject 是否用 _isUpdating 包裹。
 *    检查 onSelectionChanged/onSelectionCleared 是否检查 _isUpdating。
 * 
 * Q4: 文本模式切换不生效
 * A: 检查 createFabricObject 中是否正确判断 textMode。
 *    检查 render 中的 needsRecreate 逻辑。
 * 
 * Q5: 智能参考线不显示
 * A: 检查 smartGuidesEnabled 是否为 true。
 *    检查 guideThreshold 是否合理（默认 8px）。
 * 
 * ============================================================
 * 十、版本历史
 * ============================================================
 * 
 * v1.0 - 初始版本
 * - 基本的画布渲染和交互
 * 
 * v1.1 - 文本模式支持
 * - 添加 textMode 属性区分文本框和纯文本
 * - fixed 模式使用 fabric.Textbox
 * - auto 模式使用 fabric.IText
 * 
 * v1.2 - 多选支持
 * - 修复多选拖动后位置偏移问题
 * - 添加多选智能参考线支持
 * 
 * v1.3 - 循环调用防护
 * - 添加 _isUpdating 标志
 * - 添加状态比较逻辑
 * - 防止堆栈溢出
 */

// 导出模块
window.CanvasManager = CanvasManager;
