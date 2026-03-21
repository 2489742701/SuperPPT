/**
 * HTML PPT 编辑器主应用程序
 * 
 * 本模块是编辑器的入口点，负责：
 * - 初始化所有子模块
 * - 管理状态订阅和渲染
 * - 绑定全局事件和快捷键
 * - 与 Python 后端通信
 * 
 * 依赖模块：
 * - store.js: 状态管理
 * - canvas.js: 画布管理
 * - toolbar.js: 工具栏
 * - slides-panel.js: 幻灯片面板
 * - property-panel.js: 属性面板
 * - preview.js: 预览模式
 * - context-menu.js: 右键菜单
 * - link-modal.js: 链接弹窗
 * - pybridge.js: Python 后端桥接
 * 
 * ============================================================
 * 【重要】初始化流程说明
 * ============================================================
 * 
 * 初始化顺序非常关键，必须按以下顺序执行：
 * 
 * 1. initBackend() - 连接后端，加载数据
 *    - 必须先执行，因为后续渲染依赖数据
 *    - 如果有后端数据，会更新 store.presentation
 * 
 * 2. CanvasManager.init() - 初始化画布
 *    - 创建 Fabric.js 实例
 *    - 绑定画布事件
 * 
 * 3. store.subscribe() - 订阅状态变化
 *    - 注册渲染回调函数
 *    - 注意：订阅只是注册，不会立即触发渲染
 * 
 * 4. 初始化各 UI 模块
 *    - Toolbar, SlidesPanel, Preview 等
 * 
 * 5. 【关键】触发初始渲染
 *    - 必须调用 store.notify() 或 render(state)
 *    - 否则画布和面板不会显示初始内容
 *    - 这是很多开发者容易遗漏的步骤！
 * 
 * 为什么需要主动触发渲染？
 * --------------------------
 * - subscribe() 只是注册监听器，不会调用回调
 * - 状态变化时（如 addSlide）才会触发 notify()
 * - 初始化时状态没有"变化"，所以不会自动渲染
 * - 必须手动调用一次 notify() 或 render() 来触发首次渲染
 * 
 * 常见错误：
 * - 忘记调用 notify()：画布空白，必须操作后才显示
 * - 在 subscribe 之前调用 notify：监听器未注册，渲染无效
 * - 在 CanvasManager.init() 之前调用 notify：画布未创建，渲染失败
 * ============================================================
 */

class PPTEditor {
    /**
     * 创建编辑器实例
     * 
     * 初始化状态存储和画布引用。
     */
    constructor() {
        /** @type {EditorStore} 状态存储实例 */
        this.store = new EditorStore();
        
        /** @type {fabric.Canvas|null} Fabric.js 画布实例 */
        this.canvas = null;
        
        /** @type {boolean} 是否已连接到后端 */
        this.backendConnected = false;
    }

    /**
     * 初始化编辑器
     * 
     * 执行以下初始化步骤：
     * 1. 初始化 Python 后端连接
     * 2. 初始化画布
     * 3. 订阅状态变化
     * 4. 初始化各 UI 模块
     * 5. 绑定事件和快捷键
     * 6. 【关键】触发初始渲染
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        console.log('[PPTEditor] 开始初始化编辑器...');
        
        // 步骤1: 连接后端并加载数据
        // 必须先执行，因为后续渲染依赖数据
        await this.initBackend();
        
        // 步骤2: 初始化画布
        // 创建 Fabric.js 实例，绑定画布事件
        console.log('[PPTEditor] 初始化画布...');
        await CanvasManager.init();
        this.canvas = CanvasManager.canvas;

        // 步骤3: 订阅状态变化
        // 注册渲染回调函数，当状态变化时自动调用 render()
        // 注意：这里只是注册，不会立即执行 render()
        this.store.subscribe((state) => this.render(state));

        // 步骤4: 初始化各 UI 模块
        Toolbar.init(this.store);
        SlidesPanel.bindEvents(this.store);
        Preview.bindEvents(this.store);
        ContextMenu.bindEvents(this.store);
        LinkModal.init();

        // 步骤5: 绑定事件和快捷键
        this.bindKeyboardShortcuts();
        this.bindPanelEvents();
        this.bindWindowEvents();

        // 更新语言显示
        Toolbar.updateLanguage();
        
        // 调整画布大小
        CanvasManager.resize();
        
        // 初始化欢迎页面模块
        if (WelcomePage && typeof WelcomePage.init === 'function') {
            WelcomePage.init();
        }
        
        // 检查是否显示欢迎页面
        this.checkShowWelcome();
        
        // 【关键】步骤6: 触发初始渲染
        // 必须在所有模块初始化完成后调用
        // 否则画布和面板不会显示初始内容
        console.log('[PPTEditor] 触发初始渲染...');
        this.store.notify();
        
        console.log('[PPTEditor] 编辑器初始化完成');
    }

    /**
     * 检查是否显示欢迎页面
     * 
     * 如果没有有效的演示文稿数据，显示欢迎页面。
     * 否则隐藏欢迎页面，显示编辑界面。
     */
    checkShowWelcome() {
        const shouldShowWelcome = !this.store.presentation || 
                                  !this.store.presentation.slides || 
                                  this.store.presentation.slides.length === 0 ||
                                  !this.store.presentation.metadata?.filePath;
        
        if (shouldShowWelcome) {
            // 显示欢迎页面
            if (WelcomePage && typeof WelcomePage.show === 'function') {
                WelcomePage.show();
            }
        } else {
            // 隐藏欢迎页面，显示编辑界面
            if (WelcomePage && typeof WelcomePage.hide === 'function') {
                WelcomePage.hide();
            }
            // 注意：这里不需要调用 notify()，因为 init() 最后会统一调用
        }
    }

    /**
     * 初始化 Python 后端连接
     * 
     * 尝试连接 PyQt6 或 pywebview 后端。
     * 如果连接成功，从后端加载初始数据。
     * 
     * @async
     * @returns {Promise<void>}
     */
    async initBackend() {
        console.log('[PPTEditor] 开始初始化后端连接...');
        
        try {
            // 等待 DOM 完全加载
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 初始化 PyBridge
            console.log('[PPTEditor] 调用 PyBridge.init()...');
            const connected = await PyBridge.init();
            console.log('[PPTEditor] PyBridge.init() 返回:', connected);
            
            if (connected) {
                this.backendConnected = true;
                console.log('[PPTEditor] 后端已连接:', PyBridge.getEnvironment());
                
                // 从后端加载演示文稿数据
                console.log('[PPTEditor] 尝试调用 get_presentation...');
                const presentation = await PyBridge.call('get_presentation');
                console.log('[PPTEditor] get_presentation 返回:', presentation);
                
                if (presentation && presentation.slides && presentation.slides.length > 0) {
                    // 使用后端数据更新状态
                    this.store.presentation = presentation;
                    this.store.activeSlideId = presentation.slides[0]?.id || null;
                    console.log('[PPTEditor] 从后端加载了', presentation.slides.length, '个幻灯片');
                }
            } else {
                console.log('[PPTEditor] 未连接后端，使用本地模式');
            }
        } catch (error) {
            console.warn('[PPTEditor] 后端连接失败:', error);
            this.backendConnected = false;
        }
    }

    /**
     * 渲染函数
     * 
     * 当状态变化时被调用，更新所有 UI 组件。
     * 使用防抖机制避免频繁渲染。
     * 
     * @param {Object} state - 当前状态对象
     */
    render(state) {
        // 清除之前的渲染定时器
        if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
        }
        
        // 立即更新面板状态（不需要防抖）
        this.updatePanels(state);
        
        // 防抖渲染（16ms ≈ 60fps）
        this._renderTimeout = setTimeout(() => {
            SlidesPanel.render(state, this.store);
            CanvasManager.render(state, this.store);
            PropertyPanel.render(state, this.store);
            Preview.render(state, this.store);
            Toolbar.updateUI(state);
            this.updateCodeEditor(state);
            
            // 同步到后端（如果已连接）
            this.syncToBackend(state);
        }, 16);
    }

    /**
     * 同步数据到后端
     * 
     * 当演示文稿数据变化时，自动同步到 Python 后端。
     * 使用防抖机制避免频繁同步。
     * 
     * @param {Object} state - 当前状态
     */
    syncToBackend(state) {
        if (!this.backendConnected) return;
        
        // 清除之前的定时器
        if (this._syncTimeout) {
            clearTimeout(this._syncTimeout);
        }
        
        // 延迟同步，避免频繁调用
        this._syncTimeout = setTimeout(async () => {
            try {
                const jsonData = JSON.stringify(state.presentation);
                await PyBridge.call('load_presentation', jsonData);
            } catch (error) {
                console.warn('[PPTEditor] 同步到后端失败:', error);
            }
        }, 500); // 500ms 防抖延迟
    }

    /**
     * 更新面板显示状态
     * 
     * 根据状态切换各面板的显示/隐藏。
     * 
     * @param {Object} state - 当前状态
     */
    updatePanels(state) {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const bottomPanel = document.getElementById('bottom-panel');
        const topPanel = document.getElementById('property-panel-top');

        leftPanel?.classList.toggle('hidden', !state.panels.left);
        rightPanel?.classList.toggle('hidden', state.panels.propertyPanelPosition !== 'right');
        bottomPanel?.classList.toggle('hidden', !state.panels.bottom);
        topPanel?.classList.toggle('hidden', state.panels.propertyPanelPosition !== 'top');

        const alignmentPanel = document.getElementById('alignment-panel');
        alignmentPanel?.classList.toggle('hidden', !state.showAlignment);
    }

    /**
     * 更新代码编辑器内容
     * 
     * 将当前演示文稿数据显示为 JSON 格式。
     * 
     * @param {Object} state - 当前状态
     */
    updateCodeEditor(state) {
        const editor = document.getElementById('code-editor');
        if (editor) {
            editor.value = JSON.stringify(state.presentation, null, 2);
        }
    }

    /**
     * 绑定面板事件
     * 
     * 为面板关闭按钮和对齐按钮绑定事件处理。
     */
    bindPanelEvents() {
        // 面板关闭按钮
        document.getElementById('btn-close-left')?.addEventListener('click', () => this.store.togglePanel('left'));
        document.getElementById('btn-close-bottom')?.addEventListener('click', () => this.store.togglePanel('bottom'));
        document.getElementById('btn-close-right')?.addEventListener('click', () => this.store.setPropertyPanelPosition('hidden'));
        document.getElementById('btn-close-panel-top')?.addEventListener('click', () => this.store.setPropertyPanelPosition('hidden'));

        // 画布右下角工具按钮
        document.getElementById('btn-canvas-settings')?.addEventListener('click', () => {
            // 切换设置面板
            const panel = document.getElementById('property-panel-top');
            if (panel) {
                panel.classList.toggle('hidden');
            }
        });
        
        document.getElementById('btn-canvas-layers')?.addEventListener('click', () => {
            // 切换右侧属性面板
            const panel = document.getElementById('right-panel');
            if (panel) {
                panel.classList.toggle('hidden');
            }
        });
        
        document.getElementById('btn-canvas-close')?.addEventListener('click', () => {
            // 关闭所有面板
            this.store.togglePanel('left');
            document.getElementById('right-panel')?.classList.add('hidden');
            document.getElementById('bottom-panel')?.classList.add('hidden');
        });

        // 对齐按钮
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const state = this.store.getState();
                if (state.activeElementId) {
                    this.store.alignElements(state.activeSlideId, [state.activeElementId], btn.dataset.align);
                }
                this.store.toggleAlignment();
            });
        });
    }

    /**
     * 绑定窗口事件
     * 
     * 处理窗口大小变化等事件。
     */
    bindWindowEvents() {
        // 窗口大小变化时调整画布
        window.addEventListener('resize', () => CanvasManager.resize());
        CanvasManager.resize();
    }

    /**
     * 绑定键盘快捷键
     * 
     * 处理撤销、重做、删除等快捷键。
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 忽略输入框中的按键
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            // Ctrl/Cmd + Z: 撤销
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.store.redo();
                } else {
                    this.store.undo();
                }
            }
            
            // Ctrl/Cmd + Y: 重做
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.store.redo();
            }
            
            // Delete/Backspace: 删除选中元素
            if (e.key === 'Delete' || e.key === 'Backspace') {
                CanvasManager.deleteSelected();
            }
            
            // Escape: 退出预览/关闭菜单
            if (e.key === 'Escape') {
                this.store.setPreview(false);
                ContextMenu.hide();
            }
        });
    }
}

/**
 * 应用程序入口
 * 
 * 在 DOM 加载完成后初始化编辑器。
 */
window.addEventListener('DOMContentLoaded', () => {
    // 创建全局编辑器实例
    window.editor = new PPTEditor();
    window.editor.init();
});
