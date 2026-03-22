/**
 * 放映预览模块
 * 
 * 负责全屏放映演示文稿。
 * 
 * 主要功能：
 * - 全屏放映幻灯片
 * - 支持键盘和鼠标导航
 * - 支持元素动画效果
 * - 支持幻灯片切换动画（淡入、推入、翻转等）
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
 * 使用百分比定位可以确保三个视图中的元素位置完全一致。
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
    
    /** @type {boolean} 是否启用元素动画 */
    animationEnabled: true,
    
    /** @type {boolean} 是否启用幻灯片切换动画 */
    transitionEnabled: true,
    
    /** @type {string} 当前切换动画类型 */
    transitionType: 'fade',
    
    /** @type {number} 切换动画时长（秒） */
    transitionDuration: 0.5,
    
    /** @type {boolean} 是否启用点击切换 */
    clickAdvanceEnabled: true,
    
    /** @type {boolean} 是否启用空格切换 */
    spaceAdvanceEnabled: true,
    
    /** @type {EditorStore|null} 状态管理实例 */
    store: null,
    
    /** @type {boolean} 是否正在播放切换动画 */
    isTransitioning: false,
    
    /** @type {number|null} 切换动画定时器 */
    _transitionTimeout: null,
    
    /** @type {number|null} 进入动画定时器 */
    _enterTimeout: null,
    
    /** @type {MutationObserver|null} 内容变化观察器 */
    _observer: null,
    
    /** @type {Function|null} resize 处理器引用 */
    _resizeHandler: null,

    /**
     * 渲染放映视图
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
        this.transitionEnabled = settings.transitionEnabled !== false;
        this.transitionType = settings.transitionType || 'fade';
        this.transitionDuration = settings.transitionDuration || 0.5;
        this.clickAdvanceEnabled = settings.clickAdvanceEnabled !== false;
        this.spaceAdvanceEnabled = settings.spaceAdvanceEnabled !== false;
        
        const slideIndex = Math.max(0, Math.min(state.previewSlideIndex || 0, state.presentation.slides.length - 1));
        const slide = state.presentation.slides[slideIndex];
        const previewSlide = document.getElementById('preview-slide');
        const previewCurrent = document.getElementById('preview-current');
        const previewTotal = document.getElementById('preview-total');
        
        if (previewCurrent) previewCurrent.textContent = slideIndex + 1;
        if (previewTotal) previewTotal.textContent = state.presentation.slides.length;
        
        if (slide && previewSlide) {
            try {
                previewSlide.innerHTML = this.renderPreviewContent(slide, settings);
                setTimeout(() => {
                    this.scalePreview();
                    this.playPathAnimations();
                }, 10);
            } catch (err) {
                console.error('[Preview] 渲染幻灯片失败:', err);
            }
        }
    },

    /**
     * 渲染幻灯片内容
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
            /* 元素动画 */
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes slideInDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes rotateIn { from { transform: rotate(-180deg); opacity: 0; } to { transform: rotate(0); opacity: 1; } }
            /* 幻灯片切换动画 */
            @keyframes slideTransitionFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideTransitionFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideTransitionSlideInLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
            @keyframes slideTransitionSlideInRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            @keyframes slideTransitionSlideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
            @keyframes slideTransitionSlideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
            @keyframes slideTransitionZoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes slideTransitionZoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8); opacity: 0; } }
            @keyframes slideTransitionFlipIn { from { transform: perspective(1000px) rotateY(-90deg); opacity: 0; } to { transform: perspective(1000px) rotateY(0); opacity: 1; } }
            @keyframes slideTransitionFlipOut { from { transform: perspective(1000px) rotateY(0); opacity: 1; } to { transform: perspective(1000px) rotateY(90deg); opacity: 0; } }
            @keyframes slideTransitionCubeIn { from { transform: perspective(1000px) rotateY(90deg); opacity: 0; } to { transform: perspective(1000px) rotateY(0); opacity: 1; } }
            @keyframes slideTransitionCubeOut { from { transform: perspective(1000px) rotateY(0); opacity: 1; } to { transform: perspective(1000px) rotateY(-90deg); opacity: 0; } }
            .slide-transition-in { animation-fill-mode: both; }
            .slide-transition-out { animation-fill-mode: both; }
        </style>
        <div class="preview-slide-container" id="preview-slide-container">`;
        
        const elements = slide.elements || [];
        
        elements.forEach(el => {
            if (!el) return;
            try {
                const elHtml = this.renderElement(el);
                if (elHtml) html += elHtml;
            } catch (err) {
                console.error('[Preview] 渲染元素失败:', err, el);
            }
        });
        
        html += '</div>';
        return html;
    },

    /**
     * 渲染单个元素
     */
    renderElement(el) {
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
        
        const pathAnimAttr = el.pathAnimation ? `data-path-animation='${JSON.stringify(el.pathAnimation)}'` : '';
        
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
            return `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}><div style="${textStyle}">${content}</div></div>`;
        } else if (elType === 'shape') {
            const fill = style.fill || '#007acc';
            const strokeWidth = style.strokeWidth || 0;
            const stroke = style.stroke || 'transparent';
            const shapeType = el.shapeType || 'rectangle';
            const borderRadius = shapeType === 'circle' ? '50%' : (style.borderRadius || 0) + 'px';
            
            const shapeStyle = `background:${fill};border:${strokeWidth}px solid ${stroke};border-radius:${borderRadius};width:100%;height:100%;`;
            return `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}><div style="${shapeStyle}"></div></div>`;
        } else if (elType === 'image' || elType === 'media') {
            const src = el.content || '';
            const objectFit = style.objectFit || 'cover';
            const borderRadius = style.borderRadius || 0;
            
            if (src) {
                const imgStyle = `width:100%;height:100%;object-fit:${objectFit};border-radius:${borderRadius}px;`;
                return `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}><img src="${src}" style="${imgStyle}" alt=""></div>`;
            }
        } else if (elType === 'button') {
            const fill = style.fill || '#3b82f6';
            const color = style.color || '#fff';
            const fontSize = style.fontSize || 16;
            const borderRadius = style.borderRadius || 4;
            const content = el.content || '按钮';
            
            const btnStyle = `background:${fill};color:${color};font-size:${fontSize}px;border-radius:${borderRadius}px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;`;
            return `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}><button style="${btnStyle}">${content}</button></div>`;
        } else if (elType === 'table') {
            const rows = el.rows || 3;
            const cols = el.cols || 3;
            const cellWidth = width / cols;
            const cellHeight = height / rows;
            const tableFill = style.fill || '#ffffff';
            const tableStroke = style.stroke || '#d4d4d8';
            const tableStrokeWidth = style.strokeWidth || 1;
            
            let tableHtml = `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}>`;
            tableHtml += `<table style="width:100%;height:100%;border-collapse:collapse;">`;
            
            for (let r = 0; r < rows; r++) {
                tableHtml += '<tr>';
                for (let c = 0; c < cols; c++) {
                    tableHtml += `<td style="background:${tableFill};border:${tableStrokeWidth}px solid ${tableStroke};width:${cellWidth}px;height:${cellHeight}px;"></td>`;
                }
                tableHtml += '</tr>';
            }
            
            tableHtml += '</table></div>';
            return tableHtml;
        } else if (elType === 'icon') {
            const iconColor = style.color || '#333333';
            const iconName = el.iconName || 'star';
            
            // 内置 SVG 图标路径
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
            
            const pathData = iconPaths[iconName] || iconPaths.star;
            const iconSize = Math.min(width, height);
            
            return `<div class="preview-element ${animClass}" style="${baseStyle};${animStyle}" ${pathAnimAttr}>
                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="${iconColor}" style="display:block;margin:auto;">
                    <path d="${pathData}"/>
                </svg>
            </div>`;
        }
        return '';
    },

    /**
     * 播放所有路径动画
     */
    playPathAnimations() {
        const elements = document.querySelectorAll('[data-path-animation]');
        elements.forEach(el => {
            try {
                const pathAnim = JSON.parse(el.dataset.pathAnimation);
                if (pathAnim && pathAnim.path && pathAnim.path.length >= 2) {
                    this.playElementPathAnimation(el, pathAnim);
                }
            } catch (e) {
                console.warn('[Preview] 解析路径动画失败:', e);
            }
        });
    },

    /**
     * 播放单个元素的路径动画
     */
    playElementPathAnimation(element, pathAnimation) {
        if (!pathAnimation || !pathAnimation.path || pathAnimation.path.length < 2) return;
        
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
     */
    getPositionOnPath(path, progress) {
        if (path.length < 2) return path[0] || { x: 0, y: 0 };
        
        let totalLength = 0;
        const segments = [];
        
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            segments.push({ start: path[i], end: path[i + 1], length });
            totalLength += length;
        }
        
        const targetLength = progress * totalLength;
        let currentLength = 0;
        
        for (const segment of segments) {
            if (currentLength + segment.length >= targetLength) {
                const segmentProgress = (targetLength - currentLength) / segment.length;
                return {
                    x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
                    y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress
                };
            }
            currentLength += segment.length;
        }
        
        return path[path.length - 1];
    },

    /**
     * 缩放预览容器以适应屏幕
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
     * 获取切换动画CSS类名
     */
    getTransitionAnimation(direction) {
        const type = this.transitionType;
        const duration = this.transitionDuration;
        
        const animations = {
            fade: { in: 'slideTransitionFadeIn', out: 'slideTransitionFadeOut' },
            slide: { 
                in: direction === 'next' ? 'slideTransitionSlideInLeft' : 'slideTransitionSlideInRight',
                out: direction === 'next' ? 'slideTransitionSlideOutLeft' : 'slideTransitionSlideOutRight'
            },
            zoom: { in: 'slideTransitionZoomIn', out: 'slideTransitionZoomOut' },
            flip: { in: 'slideTransitionFlipIn', out: 'slideTransitionFlipOut' },
            cube: { in: 'slideTransitionCubeIn', out: 'slideTransitionCubeOut' }
        };
        
        return animations[type] || animations.fade;
    },

    /**
     * 切换到下一页（带动画）
     */
    nextSlide() {
        if (!this.store || this.isTransitioning) return;
        const state = this.store.getState();
        if (state.previewSlideIndex < state.presentation.slides.length - 1) {
            this.transitionTo(state.previewSlideIndex + 1, 'next');
        }
    },

    /**
     * 切换到上一页（带动画）
     */
    prevSlide() {
        if (!this.store || this.isTransitioning) return;
        const state = this.store.getState();
        if (state.previewSlideIndex > 0) {
            this.transitionTo(state.previewSlideIndex - 1, 'prev');
        }
    },

    /**
     * 跳转到指定页
     */
    goToSlide(index) {
        if (!this.store || this.isTransitioning) return;
        const state = this.store.getState();
        const targetIndex = Math.max(0, Math.min(index, state.presentation.slides.length - 1));
        if (targetIndex !== state.previewSlideIndex) {
            const direction = targetIndex > state.previewSlideIndex ? 'next' : 'prev';
            this.transitionTo(targetIndex, direction);
        }
    },

    /**
     * 执行幻灯片切换动画
     */
    transitionTo(newIndex, direction) {
        if (!this.transitionEnabled) {
            this.store.setPreview(true, newIndex);
            return;
        }
        
        this.isTransitioning = true;
        
        // 清理之前的定时器
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        if (this._enterTimeout) {
            clearTimeout(this._enterTimeout);
            this._enterTimeout = null;
        }
        
        const container = document.getElementById('preview-slide-container');
        if (!container) {
            this.store.setPreview(true, newIndex);
            this.isTransitioning = false;
            return;
        }
        
        const anim = this.getTransitionAnimation(direction);
        const duration = this.transitionDuration;
        
        // 添加退出动画
        container.classList.add('slide-transition-out');
        container.style.animation = `${anim.out} ${duration}s ease-in-out both`;
        
        // 动画结束后切换内容
        this._transitionTimeout = setTimeout(() => {
            this.store.setPreview(true, newIndex);
            this._transitionTimeout = null;
            
            // 添加进入动画
            this._enterTimeout = setTimeout(() => {
                const newContainer = document.getElementById('preview-slide-container');
                if (newContainer) {
                    newContainer.classList.add('slide-transition-in');
                    newContainer.style.animation = `${anim.in} ${duration}s ease-in-out both`;
                }
                this.isTransitioning = false;
                this._enterTimeout = null;
            }, 50);
        }, duration * 1000);
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
     */
    bindEvents(store) {
        this.store = store;
        
        document.getElementById('btn-exit-preview')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exitPreview();
        });
        
        document.getElementById('btn-prev-slide')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.prevSlide();
        });
        
        document.getElementById('btn-next-slide')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.nextSlide();
        });

        document.getElementById('preview-click-left')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.prevSlide();
        });

        document.getElementById('preview-click-right')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.nextSlide();
        });

        const overlay = document.getElementById('preview-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                const target = e.target;
                const isControls = target.closest('.preview-controls');
                const isContextMenu = target.closest('.preview-context-menu');
                
                if (isContextMenu) return;
                this.hideContextMenu();
                
                if (!isControls && this.clickAdvanceEnabled) {
                    this.nextSlide();
                }
            });
            
            overlay.addEventListener('contextmenu', (e) => {
                if (e.target.closest('.preview-controls')) return;
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e.clientX, e.clientY);
            });
        }
        
        const slideElement = document.getElementById('preview-slide');
        if (slideElement) {
            slideElement.addEventListener('click', (e) => {
                if (this.clickAdvanceEnabled) {
                    this.nextSlide();
                }
            });
            
            slideElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.prevSlide();
            });
        }

        document.querySelectorAll('.preview-context-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = btn.dataset.action;
                const state = this.store.getState();
                
                if (action === 'first') {
                    this.goToSlide(0);
                } else if (action === 'last') {
                    this.goToSlide(state.presentation.slides.length - 1);
                } else if (action === 'prev') {
                    this.prevSlide();
                } else if (action === 'next') {
                    this.nextSlide();
                } else if (action === 'exit') {
                    this.exitPreview();
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
        
        if (slideElement) {
            this._observer = new MutationObserver(() => this.scalePreview());
            this._observer.observe(slideElement, { childList: true });
        }
    },
    
    /**
     * 销毁放映预览（清理资源）
     * 
     * 清理所有定时器、事件监听器和观察器。
     */
    destroy() {
        console.log('[Preview] 开始清理资源...');
        
        // 清理定时器
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        if (this._enterTimeout) {
            clearTimeout(this._enterTimeout);
            this._enterTimeout = null;
        }
        
        // 清理观察器
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        
        // 重置状态
        this.isTransitioning = false;
        this.store = null;
        
        console.log('[Preview] 资源清理完成');
    }
};

window.Preview = Preview;
