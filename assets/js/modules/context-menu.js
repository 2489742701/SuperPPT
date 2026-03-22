/**
 * 右键菜单模块
 * 
 * 负责管理画布上的右键菜单。
 * 
 * 主要功能：
 * - 显示/隐藏右键菜单
 * - 处理菜单项操作（复制、粘贴、删除、退出等）
 * - 显示/隐藏面板（属性栏、左侧栏、底部栏等）
 * 
 * 菜单项说明：
 * - 上移一层：将元素在图层中上移
 * - 下移一层：将元素在图层中下移
 * - 复制：复制选中元素到剪贴板
 * - 粘贴：从剪贴板粘贴元素
 * - 重置：重置元素到初始状态
 * - 超链接：设置元素链接
 * - 删除：删除选中元素
 * - 显示/隐藏面板：控制界面面板的显示
 * - 退出：关闭应用程序（通过后端）
 */

const ContextMenu = {
    /** @type {string|null} 当前操作的元素ID */
    elementId: null,

    /**
     * 显示右键菜单
     * 
     * @param {number} x - 菜单显示的X坐标
     * @param {number} y - 菜单显示的Y坐标
     * @param {string|null} elementId - 当前操作的元素ID
     */
    show(x, y, elementId) {
        const menu = document.getElementById('context-menu');
        if (!menu) return;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
        this.elementId = elementId;
        
        this.updateMenuItems();
        
        // 根据元素是否锁定显示/隐藏菜单项
        const store = window.editor?.store;
        const state = store?.getState();
        let isLocked = false;
        
        if (state && elementId) {
            const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
            const element = slide?.elements.find(e => e.id === elementId);
            isLocked = element && element.locked;
            
            const lockBtn = menu.querySelector('[data-action="lock"]');
            const unlockBtn = menu.querySelector('[data-action="unlock"]');
            
            if (isLocked) {
                if (lockBtn) lockBtn.classList.add('hidden');
                if (unlockBtn) unlockBtn.classList.remove('hidden');
            } else {
                if (lockBtn) lockBtn.classList.remove('hidden');
                if (unlockBtn) unlockBtn.classList.add('hidden');
            }
        }
        
        // 禁用锁定元素的其他操作（除了解锁）
        const otherActions = ['bring-forward', 'send-backward', 'copy', 'reset', 'hyperlink', 'delete', 'group', 'ungroup'];
        otherActions.forEach(action => {
            const btn = menu.querySelector(`[data-action="${action}"]`);
            if (btn) {
                if (isLocked) {
                    btn.classList.add('disabled');
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                } else {
                    btn.classList.remove('disabled');
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                }
            }
        });
    },

    /**
     * 根据当前状态更新菜单项
     */
    updateMenuItems() {
        const store = window.editor?.store;
        const state = store?.getState();
        if (!state) return;
        
        const leftPanelItem = document.getElementById('dot-ctx-left');
        const bottomPanelItem = document.getElementById('dot-ctx-bottom');
        const propertyPanelItem = document.getElementById('dot-ctx-property');
        
        if (leftPanelItem) {
            leftPanelItem.classList.toggle('active', state.panels.left);
        }
        if (bottomPanelItem) {
            bottomPanelItem.classList.toggle('active', state.panels.bottom);
        }
        if (propertyPanelItem) {
            propertyPanelItem.classList.toggle('active', state.panels.propertyPanelPosition !== 'hidden');
        }
    },

    /**
     * 隐藏右键菜单
     */
    hide() {
        const menu = document.getElementById('context-menu');
        if (menu) menu.classList.add('hidden');
    },

    /**
     * 绑定事件处理器
     * 
     * @param {EditorStore} store - 状态管理实例
     */
    bindEvents(store) {
        // 为所有菜单项绑定点击事件
        document.querySelectorAll('.context-item').forEach(btn => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action, store));
        });

        // 点击其他区域时隐藏菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.canvas-wrapper')) {
                this.hide();
            }
        });
    },

    /**
     * 处理菜单项操作
     * 
     * @param {string} action - 操作类型
     * @param {EditorStore} store - 状态管理实例
     */
    handleAction(action, store) {
        const state = store.getState();
        
        switch (action) {
            case 'bring-forward':
                // 上移一层
                if (this.elementId) {
                    store.reorderElement(state.activeSlideId, this.elementId, 'up');
                }
                break;
                
            case 'send-backward':
                // 下移一层
                if (this.elementId) {
                    store.reorderElement(state.activeSlideId, this.elementId, 'down');
                }
                break;
                
            case 'copy':
                // 复制元素
                if (this.elementId) {
                    const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                    const element = slide?.elements.find(e => e.id === this.elementId);
                    if (element && !element.locked) store.copyElement(element);
                }
                break;
                
            case 'paste':
                // 粘贴元素
                store.pasteElement(state.activeSlideId);
                break;
                
            case 'reset':
                // 重置元素
                if (this.elementId) {
                    store.resetElement(state.activeSlideId, this.elementId);
                }
                break;
                
            case 'hyperlink':
                // 设置超链接
                if (this.elementId) {
                    const slideEl = state.presentation.slides.find(s => s.id === state.activeSlideId);
                    const el = slideEl?.elements.find(e => e.id === this.elementId);
                    if (el && window.LinkModal) {
                        window.LinkModal.open(el.style.link || '', (value) => {
                            store.updateElement(state.activeSlideId, this.elementId, { style: { link: value } });
                        });
                    }
                }
                break;
                
            case 'group':
                // 打组
                if (state.selectedElementIds && state.selectedElementIds.length >= 2) {
                    store.groupElements(state.activeSlideId, state.selectedElementIds);
                } else if (this.elementId) {
                    const activeObj = window.CanvasManager?.canvas?.getActiveObject();
                    if (activeObj && activeObj.type === 'activeSelection') {
                        const ids = activeObj.getObjects()
                            .filter(o => o.elementId)
                            .map(o => o.elementId);
                        if (ids.length >= 2) {
                            store.groupElements(state.activeSlideId, ids);
                        }
                    }
                }
                break;
                
            case 'ungroup':
                // 解组
                const currentElementId = this.elementId || state.activeElementId;
                if (currentElementId) {
                    const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                    const element = slide?.elements.find(e => e.id === currentElementId);
                    if (element && element.type === 'group') {
                        store.ungroupElement(state.activeSlideId, currentElementId);
                    }
                }
                break;
                
            case 'lock':
                // 锁定
                const lockElementId = this.elementId || state.activeElementId;
                if (lockElementId) {
                    store.lockElement(state.activeSlideId, lockElementId);
                }
                break;
                
            case 'unlock':
                // 解锁
                const unlockElementId = this.elementId || state.activeElementId;
                if (unlockElementId) {
                    store.unlockElement(state.activeSlideId, unlockElementId);
                }
                break;
                
            case 'delete':
                // 删除元素
                if (this.elementId) {
                    store.deleteElement(state.activeSlideId, this.elementId);
                }
                break;
            
            case 'toggle-left-panel':
                // 切换左侧栏
                store.togglePanel('left');
                break;
                
            case 'toggle-bottom-panel':
                // 切换底部栏
                store.togglePanel('bottom');
                break;
                
            case 'toggle-property-panel':
                // 切换属性面板
                if (state.panels.propertyPanelPosition === 'hidden') {
                    store.setPropertyPanelPosition('top');
                } else {
                    store.setPropertyPanelPosition('hidden');
                }
                break;
                
            case 'exit':
                // 退出应用程序
                this.exitApplication();
                break;
        }
        
        this.hide();
    },

    /**
     * 退出应用程序
     * 
     * 尝试通过后端关闭窗口，如果后端不可用则显示提示。
     */
    async exitApplication() {
        try {
            if (window.pyApi && typeof window.pyApi.close_window === 'function') {
                await window.pyApi.close_window();
            } else if (window.PyBridge && window.PyBridge.isConnected()) {
                await window.PyBridge.call('close_window');
            } else {
                alert('请使用 Alt+F4 或点击窗口关闭按钮退出');
            }
        } catch (error) {
            console.warn('[ContextMenu] 退出失败:', error);
            alert('请使用 Alt+F4 或点击窗口关闭按钮退出');
        }
    }
};

window.ContextMenu = ContextMenu;
