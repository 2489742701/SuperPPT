/**
 * 幻灯片面板模块
 * 
 * 负责渲染和管理左侧幻灯片缩略图列表。
 * 
 * 缩略图实现原理：
 * - 当前幻灯片：用 drawImage() 实时复制主画布内容
 * - 其他幻灯片：存储快照图片（切换幻灯片时更新）
 */

const SlidesPanel = {
    store: null,
    slideWidth: 1200,
    slideHeight: 675,
    thumbnailWidth: 160,
    thumbnailHeight: 90,
    _snapshots: {},  // 存储每张幻灯片的快照 { slideId: dataURL }
    
    // 对外暴露 snapshots 对象，方便复制幻灯片时复制快照
    get snapshots() {
        return this._snapshots;
    },
    set snapshots(value) {
        this._snapshots = value;
    },
    
    render(state, store) {
        this.store = store;
        const container = document.getElementById('slides-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        state.presentation.slides.forEach((slide, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = `slide-thumbnail ${slide.id === state.activeSlideId ? 'active' : ''}`;
            thumbnail.dataset.slideId = slide.id;
            thumbnail.innerHTML = `
                <div class="slide-thumbnail-preview">
                    <span class="slide-number">${index + 1}</span>
                    <canvas class="slide-thumbnail-canvas" width="${this.thumbnailWidth}" height="${this.thumbnailHeight}"></canvas>
                </div>
                <button class="slide-delete-btn" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            `;
            
            thumbnail.addEventListener('click', (e) => {
                if (!e.target.closest('.slide-delete-btn')) {
                    store.selectSlide(slide.id);
                }
            });
            
            thumbnail.querySelector('.slide-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                store.deleteSlide(slide.id);
            });
            
            thumbnail.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, slide.id, store);
            });
            
            container.appendChild(thumbnail);
        });
        
        // 渲染完成后更新缩略图
        requestAnimationFrame(() => this.updateThumbnails(state));
    },
    
    /**
     * 更新所有缩略图
     * - 所有幻灯片都使用存储的快照
     * - 只在切换幻灯片时才保存新快照
     */
    updateThumbnails(state) {
        const thumbnails = document.querySelectorAll('.slide-thumbnail-canvas');
        thumbnails.forEach((thumbCanvas) => {
            try {
                const thumbnail = thumbCanvas.closest('.slide-thumbnail');
                const slideId = thumbnail?.dataset.slideId;
                if (!slideId) return;
                
                const ctx = thumbCanvas.getContext('2d');
                if (!ctx) return;
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, this.thumbnailWidth, this.thumbnailHeight);
                
                if (this._snapshots[slideId]) {
                    // 使用快照
                    const img = new Image();
                    img.onload = () => {
                        try {
                            ctx.drawImage(img, 0, 0, this.thumbnailWidth, this.thumbnailHeight);
                        } catch (err) {
                            console.warn('[SlidesPanel] 绘制快照缩略图失败:', err);
                        }
                    };
                    img.onerror = () => {
                        console.warn('[SlidesPanel] 加载快照图片失败:', slideId);
                    };
                    img.src = this._snapshots[slideId];
                }
            } catch (err) {
                console.warn('[SlidesPanel] 更新缩略图时出错:', err);
            }
        });
    },
    
    /**
     * 保存当前幻灯片的快照
     * 在切换幻灯片前调用
     */
    saveSnapshot(slideId) {
        try {
            const mainCanvas = window.CanvasManager?.canvas;
            if (!mainCanvas) return;
            
            // 创建临时 canvas 用于缩小
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.thumbnailWidth;
            tempCanvas.height = this.thumbnailHeight;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) return;
            
            // 复制并缩小主画布内容
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, this.thumbnailWidth, this.thumbnailHeight);
            ctx.drawImage(
                mainCanvas.getElement(),
                0, 0, this.slideWidth, this.slideHeight,
                0, 0, this.thumbnailWidth, this.thumbnailHeight
            );
            
            // 存储快照
            this._snapshots[slideId] = tempCanvas.toDataURL('image/png', 0.7);
        } catch (err) {
            console.warn('[SlidesPanel] 保存快照失败:', err);
        }
    },
    
    /**
     * 删除幻灯片时清理快照
     */
    removeSnapshot(slideId) {
        delete this._snapshots[slideId];
    },
    
    showContextMenu(e, slideId, store) {
        const existing = document.querySelector('.slide-context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'slide-context-menu';
        menu.innerHTML = `
            <div class="slide-menu-item" data-action="copy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                复制幻灯片 (Ctrl+C)
            </div>
            <div class="slide-menu-item" data-action="paste">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                粘贴幻灯片 (Ctrl+V)
            </div>
            <div class="slide-menu-item" data-action="duplicate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                复制为副本
            </div>
            <div class="slide-menu-divider"></div>
            <div class="slide-menu-item has-submenu">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                更改版式
                <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>
                <div class="slide-submenu">
                    <div class="slide-submenu-item" data-layout="title_subtitle">标题和副标题</div>
                    <div class="slide-submenu-item" data-layout="title_content">标题和内容</div>
                    <div class="slide-submenu-item" data-layout="title_content_divider">标题、分隔线和内容</div>
                    <div class="slide-submenu-item" data-layout="two_column">两栏内容</div>
                    <div class="slide-submenu-item" data-layout="section_header">章节标题</div>
                    <div class="slide-submenu-item" data-layout="blank">空白幻灯片</div>
                </div>
            </div>
            <div class="slide-menu-divider"></div>
            <div class="slide-menu-item danger" data-action="delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                删除幻灯片
            </div>
        `;
        
        document.body.appendChild(menu);
        
        const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 10);
        const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 10);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
        
        menu.querySelectorAll('.slide-menu-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                if (action === 'copy') {
                    store.copySlide(slideId);
                } else if (action === 'paste') {
                    store.pasteSlide();
                } else if (action === 'duplicate') {
                    store.duplicateSlide(slideId);
                } else if (action === 'delete') {
                    store.deleteSlide(slideId);
                }
                closeMenu();
            });
        });
        
        menu.querySelectorAll('.slide-submenu-item[data-layout]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                store.changeSlideLayout(slideId, item.dataset.layout);
                closeMenu();
            });
        });
    },

    bindEvents(store) {
        // 幻灯片添加按钮在 toolbar.js 中处理
    }
};

window.SlidesPanel = SlidesPanel;
