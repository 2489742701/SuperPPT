/**
 * 放映预览模块
 * 
 * 负责全屏放映演示文稿。
 * 
 * 主要功能：
 * - 全屏放映幻灯片
 * - 支持键盘和鼠标导航
 * - 支持动画效果
 * 
 * ============================================================
 * 【重要】放映位置计算原理 - 必须使用百分比定位
 * ============================================================
 * 
 * 为什么必须使用百分比定位？
 * --------------------------
 * 1. 主画布尺寸：1200 x 675 像素（固定）
 * 2. 缩略图容器尺寸：动态变化（响应式布局）
 * 3. 放映视图尺寸：全屏（动态变化，可能是 1920x1080、2560x1440 等）
 * 
 * 如果使用固定像素定位（错误做法）：
 * - 假设元素在主画布 x=600（画布中心）
 * - 放映视图宽度假设为 1920px
 * - 错误计算：600 * (1920/1200) = 960px
 * - 问题：放映视图不是 1920px 时位置就错了！
 * 
 * 使用百分比定位（正确做法）：
 * - 元素在主画布 x=600（画布中心）
 * - 百分比位置：600/1200 = 50%
 * - 无论放映视图尺寸是多少，元素永远在 50% 位置（中心）
 * 
 * 核心公式：
 * - left% = (元素x坐标 / 画布宽度) * 100
 * - top% = (元素y坐标 / 画布高度) * 100
 * - width% = (元素宽度 / 画布宽度) * 100
 * - height% = (元素高度 / 画布高度) * 100
 * 
 * 这样可以确保：
 * - 缩略图中的元素位置 = 主画布中的元素位置 = 放映视图中的元素位置
 * - 三者完全一致，不会出现偏移
 * ============================================================
 * 
 * 放映控制：
 * - ESC：退出放映
 * - Space / → / Click：下一页
 * - ← / Right Click：上一页
 */

const Preview = {
    /** @type {number} 幻灯片宽度 - 必须与 canvas.js 和 slides-panel.js 保持一致 */
    slideWidth: 1200,
    
    /** @type {number} 幻灯片高度 - 必须与 canvas.js 和 slides-panel.js 保持一致 */
    slideHeight: 675,
    
    /** @type {boolean} 是否启用动画 */
    animationEnabled: true,
    
    /** @type {boolean} 是否启用点击切换 */
    clickAdvanceEnabled: true,
    
    /** @type {boolean} 是否启用空格切换 */
    spaceAdvanceEnabled: true,
    
    /** @type {EditorStore|null} 状态管理实例 */
    store: null,

    /**
     * 渲染放映视图
     * 
     * @param {Object} state - 当前状态
     * @param {EditorStore} store - 状态管理实例
     */
    render(state, store) {
        this.store = store;
        const overlay = document.getElementById('preview-overlay');
        if (!state.isPreview) {
            overlay?.classList.add('hidden');
            document.body.style.overflow = '';
            return;
        }
        overlay?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        if (!state.presentation || !state.presentation.slides || state.presentation.slides.length === 0) {
            console.error('[Preview] 没有可放映的幻灯片');
            this.exitPreview();
            return;
        }
        
        const settings = state.presentation.settings || {};
        this.animationEnabled = settings.animationEnabled !== false;
        this.clickAdvanceEnabled = settings.clickAdvanceEnabled !== false;
        this.spaceAdvanceEnabled = settings.spaceAdvanceEnabled !== false;
        
        const slideIndex = Math.max(0, Math.min(state.previewSlideIndex || 0, state.presentation.slides.length - 1));
        const slide = state.presentation.slides[slideIndex];
        const previewSlide = document.getElementById('preview-slide');
        const previewCurrent = document.getElementById('preview-current');
        const previewTotal = document.getElementById('preview-total');
        
        if (previewCurrent) {
            previewCurrent.textContent = slideIndex + 1;
        }
        if (previewTotal) {
            previewTotal.textContent = state.presentation.slides.length;
        }
        
        if (slide && previewSlide) {
            try {
                previewSlide.innerHTML = this.renderPreviewContent(slide, settings);
                setTimeout(() => this.scalePreview(), 10);
            } catch (err) {
                console.error('[Preview] 渲染幻灯片失败:', err);
            }
        }
    },

    /**
     * 渲染幻灯片内容
     * 
     * 【关键】使用百分比定位确保位置准确
     * 
     * @param {Object} slide - 幻灯片数据
     * @param {Object} settings - 设置
     * @returns {string} HTML 字符串
     */
    renderPreviewContent(slide, settings) {
        const bgColor = slide.metadata?.backgroundColor || '#ffffff';
        
        let html = `
        <style>
            .preview-slide-container {
                width: ${this.slideWidth}px;
                height: ${this.slideHeight}px;
                background: ${bgColor};
                position: relative;
                overflow: hidden;
                transform-origin: center center;
            }
            .preview-element {
                position: absolute;
                display: flex;
                align-items: flex-start;
                justify-content: flex-start;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes slideInDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes rotateIn { from { transform: rotate(-180deg); opacity: 0; } to { transform: rotate(0); opacity: 1; } }
        </style>
        <div class="preview-slide-container" id="preview-slide-container">`;
        
        const elements = slide.elements || [];
        
        elements.forEach(el => {
            if (!el) return;
            
            try {
                const style = el.style || {};
                const animation = el.animation || { type: 'none', duration: 0.5, delay: 0 };
                const animType = animation.type || 'none';
                const animDuration = animation.duration || 0.5;
                const animDelay = animation.delay || 0;
                
                const x = typeof style.x === 'number' ? style.x : 0;
                const y = typeof style.y === 'number' ? style.y : 0;
                const width = typeof style.width === 'number' ? style.width : 100;
                const height = typeof style.height === 'number' ? style.height : 50;
                const opacity = typeof style.opacity === 'number' ? style.opacity : 1;
                const angle = typeof style.angle === 'number' ? style.angle : 0;
                
                const baseStyle = `position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;opacity:${opacity};transform:rotate(${angle}deg)`;
                
                let animStyle = '';
                let animClass = '';
                
                if (this.animationEnabled && animType && animType !== 'none') {
                    animClass = `animate-${animType}`;
                    animStyle = `animation: ${animType} ${animDuration}s ease-out ${animDelay}s both;`;
                }
                
                const elType = el.type || 'shape';
                
                if (elType === 'textbox' || elType === 'text') {
                    const fontSize = style.fontSize || 24;
                    const color = style.color || '#333';
                    const fontWeight = style.fontWeight || 'normal';
                    const fontStyle = style.fontStyle || 'normal';
                    const textAlign = style.textAlign || 'left';
                    const fontFamily = style.fontFamily || 'Arial';
                    const lineHeight = style.lineHeight || 1.5;
                    const bgColor = style.backgroundColor || 'transparent';
                    const content = el.content || '';
                    
                    const textStyle = `font-size:${fontSize}px;color:${color};font-weight:${fontWeight};font-style:${fontStyle};text-align:${textAlign};font-family:${fontFamily};line-height:${lineHeight};background:${bgColor};white-space:pre-wrap;word-wrap:break-word;width:100%;height:100%;display:flex;align-items:center;`;
                    html += `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}"><div style="${textStyle}">${content}</div></div>`;
                } else if (elType === 'shape') {
                    const fill = style.fill || '#007acc';
                    const strokeWidth = style.strokeWidth || 0;
                    const stroke = style.stroke || 'transparent';
                    const shapeType = el.shapeType || 'rectangle';
                    const borderRadius = shapeType === 'circle' ? '50%' : (style.borderRadius || 0) + 'px';
                    
                    const shapeStyle = `background:${fill};border:${strokeWidth}px solid ${stroke};border-radius:${borderRadius};width:100%;height:100%;`;
                    html += `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}"><div style="${shapeStyle}"></div></div>`;
                } else if (elType === 'image' || elType === 'media') {
                    const src = el.content || '';
                    const objectFit = style.objectFit || 'cover';
                    const borderRadius = style.borderRadius || 0;
                    
                    if (src) {
                        const imgStyle = `width:100%;height:100%;object-fit:${objectFit};border-radius:${borderRadius}px;`;
                        html += `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}"><img src="${src}" style="${imgStyle}" alt=""></div>`;
                    }
                } else if (elType === 'button') {
                    const fill = style.fill || '#3b82f6';
                    const color = style.color || '#fff';
                    const fontSize = style.fontSize || 16;
                    const borderRadius = style.borderRadius || 4;
                    const content = el.content || '按钮';
                    
                    const btnStyle = `background:${fill};color:${color};font-size:${fontSize}px;border-radius:${borderRadius}px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;`;
                    html += `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}"><button style="${btnStyle}">${content}</button></div>`;
                }
            } catch (err) {
                console.error('[Preview] 渲染元素失败:', err, el);
            }
        });
        
        html += '</div>';
        return html;
    },

    /**
     * 缩放预览容器以适应屏幕
     * 
     * 保持 1200x675 的宽高比，通过 CSS scale 缩放
     */
    scalePreview() {
        const container = document.getElementById('preview-slide-container');
        const slideArea = document.getElementById('preview-slide');
        if (!container || !slideArea) return;
        
        try {
            const containerRect = slideArea.getBoundingClientRect();
            if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return;
            
            const scaleX = (containerRect.width - 40) / this.slideWidth;
            const scaleY = (containerRect.height - 40) / this.slideHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            
            if (scale > 0 && isFinite(scale)) {
                container.style.transform = `scale(${scale})`;
            }
        } catch (err) {
            console.error('[Preview] 缩放失败:', err);
        }
    },

    /**
     * 切换到下一页
     */
    nextSlide() {
        if (!this.store) return;
        const state = this.store.getState();
        if (state.previewSlideIndex < state.presentation.slides.length - 1) {
            this.store.setPreview(true, state.previewSlideIndex + 1);
        }
    },

    /**
     * 切换到上一页
     */
    prevSlide() {
        if (!this.store) return;
        const state = this.store.getState();
        if (state.previewSlideIndex > 0) {
            this.store.setPreview(true, state.previewSlideIndex - 1);
        }
    },

    /**
     * 退出放映
     */
    exitPreview() {
        if (!this.store) return;
        this.store.setPreview(false);
    },

    /**
     * 显示右键菜单
     * 
     * @param {number} x - 菜单显示的X坐标
     * @param {number} y - 菜单显示的Y坐标
     */
    showContextMenu(x, y) {
        const menu = document.getElementById('preview-context-menu');
        if (!menu) return;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
    },

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        const menu = document.getElementById('preview-context-menu');
        if (menu) menu.classList.add('hidden');
    },

    /**
     * 绑定事件处理器
     * 
     * @param {EditorStore} store - 状态管理实例
     */
    bindEvents(store) {
        this.store = store;
        
        const exitBtn = document.getElementById('btn-exit-preview');
        if (exitBtn) {
            exitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exitPreview();
            });
        }
        
        const prevBtn = document.getElementById('btn-prev-slide');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.prevSlide();
            });
        }
        
        const nextBtn = document.getElementById('btn-next-slide');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextSlide();
            });
        }

        const leftClickZone = document.getElementById('preview-click-left');
        if (leftClickZone) {
            leftClickZone.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.prevSlide();
            });
        }

        const rightClickZone = document.getElementById('preview-click-right');
        if (rightClickZone) {
            rightClickZone.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextSlide();
            });
        }

        const overlay = document.getElementById('preview-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                const target = e.target;
                const isClickZone = target.closest('.preview-click-zone');
                const isControls = target.closest('.preview-controls');
                const isContextMenu = target.closest('.preview-context-menu');
                
                if (isContextMenu) return;
                
                this.hideContextMenu();
                
                // 只有在非点击区域、非控制区域时才响应
                if (!isClickZone && !isControls) {
                    if (this.clickAdvanceEnabled) {
                        this.nextSlide();
                    }
                }
            });
            
            overlay.addEventListener('contextmenu', (e) => {
                const target = e.target;
                const isControls = target.closest('.preview-controls');
                const isClickZone = target.closest('.preview-click-zone');
                
                // 在控制栏和点击区域不显示右键菜单
                if (isControls) return;
                
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e.clientX, e.clientY);
            });
        }

        // 绑定右键菜单项点击事件
        document.querySelectorAll('.preview-context-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = btn.dataset.action;
                
                switch (action) {
                    case 'prev':
                        this.prevSlide();
                        break;
                    case 'next':
                        this.nextSlide();
                        break;
                    case 'exit':
                        this.exitPreview();
                        break;
                }
                
                this.hideContextMenu();
            });
        });

        document.addEventListener('keydown', (e) => {
            const state = store.getState();
            if (!state.isPreview) return;
            
            if (e.key === 'Escape') {
                this.hideContextMenu();
                this.exitPreview();
            } else if (e.key === ' ' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (this.spaceAdvanceEnabled || e.key === 'ArrowRight') {
                    this.nextSlide();
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevSlide();
            }
        });

        window.addEventListener('resize', () => this.scalePreview());
        
        const previewSlide = document.getElementById('preview-slide');
        if (previewSlide) {
            const observer = new MutationObserver(() => {
                this.scalePreview();
            });
            observer.observe(previewSlide, { childList: true });
        }
    }
};

window.Preview = Preview;
