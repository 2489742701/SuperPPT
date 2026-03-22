const Toolbar = {
    init(store) {
        this.store = store;
        this.bindEvents();
        this.bindKeyboardShortcuts();
    },

    bindEvents() {
        document.getElementById('btn-undo')?.addEventListener('click', () => this.store.undo());
        document.getElementById('btn-redo')?.addEventListener('click', () => this.store.redo());
        document.getElementById('btn-align')?.addEventListener('click', () => this.store.toggleAlignment());
        document.getElementById('btn-add-slide')?.addEventListener('click', () => this.showLayoutSelector());
        
        document.getElementById('btn-language')?.addEventListener('click', () => {
            const state = this.store.getState();
            this.store.setLanguage(state.language === 'en' ? 'zh' : 'en');
            this.updateLanguage();
        });
        
        document.getElementById('btn-preview')?.addEventListener('click', () => {
            this.startFullscreenPresentation();
        });

        document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
            this.openShortcutsModal();
        });

        document.querySelectorAll('.toolbar-dropdown').forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(dropdown);
                });
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.toolbar-dropdown')) {
                this.closeAllDropdowns();
            }
        });

        document.querySelectorAll('.dropdown-item[data-action^="add-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleAddAction(btn.dataset.action);
                this.closeAllDropdowns();
            });
        });
        
        document.querySelectorAll('.dropdown-item[data-action^="toggle-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.action.replace('toggle-', '');
                if (panel === 'left' || panel === 'bottom') {
                    this.store.togglePanel(panel);
                } else if (panel === 'click-advance') {
                    this.toggleSetting('clickAdvanceEnabled');
                } else if (panel === 'space-advance') {
                    this.toggleSetting('spaceAdvanceEnabled');
                } else if (panel === 'animation') {
                    this.toggleSetting('animationEnabled');
                } else if (panel === 'transition') {
                    this.toggleSetting('transitionEnabled');
                } else if (panel === 'smart-guides') {
                    this.toggleSmartGuides();
                }
                this.closeAllDropdowns();
            });
        });
        
        document.querySelectorAll('.dropdown-item[data-action^="transition-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.action.replace('transition-', '');
                this.setTransitionType(type);
                this.closeAllDropdowns();
            });
        });
        
        document.querySelectorAll('.dropdown-item[data-action^="theme-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.action.replace('theme-', '');
                this.setTheme(theme);
                this.closeAllDropdowns();
            });
        });
        
        document.querySelectorAll('.dropdown-item[data-action^="panel-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.action.replace('panel-', '');
                this.store.setPropertyPanelPosition(position);
                this.closeAllDropdowns();
            });
        });
        
        document.querySelectorAll('.dropdown-item[data-action^="animation-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const animationType = btn.dataset.action.replace('animation-', '');
                this.setElementAnimation(animationType);
                this.closeAllDropdowns();
            });
        });

        document.getElementById('btn-add-button')?.addEventListener('click', () => {
            this.handleAddAction('add-button');
        });
        
        document.querySelector('[data-action="export-pdf"]')?.addEventListener('click', () => {
            this.exportToPdf();
            this.closeAllDropdowns();
        });
        
        document.querySelector('[data-action="export-images"]')?.addEventListener('click', () => {
            this.exportToImages();
            this.closeAllDropdowns();
        });
        
        document.querySelector('[data-action="export-html-file"]')?.addEventListener('click', () => {
            this.exportToHtmlFile();
            this.closeAllDropdowns();
        });
        
        document.querySelector('[data-action="print"]')?.addEventListener('click', () => {
            this.printPresentation();
            this.closeAllDropdowns();
        });

        this.bindShortcutsEvents();
    },
    
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') {
                    const state = this.store.getState();
                    if (state.activeSlideId) {
                        e.preventDefault();
                        this.store.copySlide(state.activeSlideId);
                    }
                } else if (e.key === 'v') {
                    e.preventDefault();
                    this.store.pasteSlide();
                }
            }
        });
    },
    
    showLayoutSelector() {
        const existing = document.querySelector('.layout-selector-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'layout-selector-modal';
        modal.innerHTML = `
            <div class="layout-selector-content">
                <div class="layout-selector-header">
                    <h3>选择幻灯片版式</h3>
                    <button class="layout-close-btn">&times;</button>
                </div>
                <div class="layout-grid">
                    <div class="layout-item" data-layout="title_subtitle">
                        <div class="layout-preview">
                            <div class="layout-preview-title"></div>
                            <div class="layout-preview-subtitle"></div>
                        </div>
                        <span>标题和副标题</span>
                    </div>
                    <div class="layout-item" data-layout="title_content">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-content"></div>
                        </div>
                        <span>标题和内容</span>
                    </div>
                    <div class="layout-item" data-layout="title_content_divider">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-divider"></div>
                            <div class="layout-preview-content"></div>
                        </div>
                        <span>标题、分隔线和内容</span>
                    </div>
                    <div class="layout-item" data-layout="two_column">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-columns">
                                <div class="layout-preview-col"></div>
                                <div class="layout-preview-col"></div>
                            </div>
                        </div>
                        <span>两栏内容</span>
                    </div>
                    <div class="layout-item" data-layout="three_column">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-columns">
                                <div class="layout-preview-col"></div>
                                <div class="layout-preview-col"></div>
                                <div class="layout-preview-col"></div>
                            </div>
                        </div>
                        <span>三栏内容</span>
                    </div>
                    <div class="layout-item" data-layout="section_header">
                        <div class="layout-preview">
                            <div class="layout-preview-section-title"></div>
                            <div class="layout-preview-divider-center"></div>
                        </div>
                        <span>章节标题</span>
                    </div>
                    <div class="layout-item" data-layout="quote">
                        <div class="layout-preview">
                            <div class="layout-preview-quote-line"></div>
                            <div class="layout-preview-quote-text"></div>
                        </div>
                        <span>引用/名言</span>
                    </div>
                    <div class="layout-item" data-layout="comparison">
                        <div class="layout-preview">
                            <div class="layout-preview-compare-box left"></div>
                            <div class="layout-preview-compare-box right"></div>
                        </div>
                        <span>对比样式</span>
                    </div>
                    <div class="layout-item" data-layout="timeline">
                        <div class="layout-preview">
                            <div class="layout-preview-timeline-line"></div>
                            <div class="layout-preview-timeline-dots"></div>
                        </div>
                        <span>时间线</span>
                    </div>
                    <div class="layout-item" data-layout="image_left">
                        <div class="layout-preview">
                            <div class="layout-preview-image-box left"></div>
                            <div class="layout-preview-text-box right"></div>
                        </div>
                        <span>图片在左</span>
                    </div>
                    <div class="layout-item" data-layout="image_right">
                        <div class="layout-preview">
                            <div class="layout-preview-text-box left"></div>
                            <div class="layout-preview-image-box right"></div>
                        </div>
                        <span>图片在右</span>
                    </div>
                    <div class="layout-item" data-layout="bullet_points">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-bullets"></div>
                        </div>
                        <span>要点列表</span>
                    </div>
                    <div class="layout-item" data-layout="numbered_list">
                        <div class="layout-preview">
                            <div class="layout-preview-title-left"></div>
                            <div class="layout-preview-numbers"></div>
                        </div>
                        <span>编号列表</span>
                    </div>
                    <div class="layout-item" data-layout="blank">
                        <div class="layout-preview layout-preview-blank"></div>
                        <span>空白幻灯片</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.layout-close-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelectorAll('.layout-item').forEach(item => {
            item.addEventListener('click', () => {
                const layout = item.dataset.layout;
                this.store.addSlideWithLayout(layout);
                modal.remove();
            });
        });
    },

    bindShortcutsEvents() {
        const modal = document.getElementById('shortcuts-modal');
        
        document.getElementById('btn-close-shortcuts')?.addEventListener('click', () => {
            modal?.classList.add('hidden');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    },

    toggleSetting(key) {
        const state = this.store.getState();
        const settings = state.presentation.settings || {};
        const newValue = !settings[key];
        this.store.updateSettings({ [key]: newValue });
        this.updateSettingsDots();
    },

    toggleSmartGuides() {
        const state = this.store.getState();
        const settings = state.presentation.settings || {};
        const newValue = settings.smartGuidesEnabled !== false ? false : true;
        this.store.updateSettings({ smartGuidesEnabled: newValue });
        if (window.CanvasManager) {
            window.CanvasManager.smartGuidesEnabled = newValue;
        }
        this.updateSettingsDots();
    },

    updateSettingsDots() {
        const state = this.store.getState();
        const settings = state.presentation.settings || {};
        
        const dotClick = document.getElementById('dot-click-advance');
        const dotSpace = document.getElementById('dot-space-advance');
        const dotAnim = document.getElementById('dot-animation');
        const dotTrans = document.getElementById('dot-transition');
        const dotSmartGuides = document.getElementById('dot-smart-guides');
        
        if (dotClick) dotClick.classList.toggle('active', settings.clickAdvanceEnabled !== false);
        if (dotSpace) dotSpace.classList.toggle('active', settings.spaceAdvanceEnabled !== false);
        if (dotAnim) dotAnim.classList.toggle('active', settings.animationEnabled !== false);
        if (dotTrans) dotTrans.classList.toggle('active', settings.transitionEnabled !== false);
        if (dotSmartGuides) dotSmartGuides.classList.toggle('active', settings.smartGuidesEnabled !== false);
        
        const transType = settings.transitionType || 'fade';
        ['fade', 'slide', 'zoom', 'flip', 'cube'].forEach(type => {
            const dot = document.getElementById(`dot-trans-${type}`);
            if (dot) dot.classList.toggle('active', transType === type);
        });
    },

    setTransitionType(type) {
        this.store.updateSettings({ transitionType: type });
        this.updateSettingsDots();
    },

    setTheme(theme) {
        if (!window.ThemeManager) return;
        
        if (theme === 'auto') {
            ThemeManager.setAutoSwitch(true);
        } else {
            ThemeManager.setAutoSwitch(false);
            ThemeManager.setTheme(theme);
        }
        
        this.updateThemeDots();
    },

    updateThemeDots() {
        const isDark = ThemeManager.isDark();
        const isAuto = ThemeManager.autoSwitch;
        
        document.getElementById('dot-theme-light')?.classList.toggle('active', !isDark && !isAuto);
        document.getElementById('dot-theme-dark')?.classList.toggle('active', isDark && !isAuto);
        document.getElementById('dot-theme-auto')?.classList.toggle('active', isAuto);
    },

    openShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        modal?.classList.remove('hidden');
    },

    toggleDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        this.closeAllDropdowns();
        if (!isOpen) dropdown.classList.add('open');
    },

    closeAllDropdowns() {
        document.querySelectorAll('.toolbar-dropdown').forEach(d => d.classList.remove('open'));
    },

    handleAddAction(action) {
        const state = this.store.getState();
        if (!state.activeSlideId) return;
        
        const actions = {
            'add-heading': { 
                type: 'textbox', 
                content: 'Heading', 
                textMode: 'fixed',
                style: { x: 400, y: 200, width: 400, height: 80, fontSize: 48, color: '#000000' } 
            },
            'add-body': { 
                type: 'textbox', 
                content: 'Body text', 
                textMode: 'fixed',
                style: { x: 400, y: 300, width: 400, height: 50, fontSize: 24, color: '#000000' } 
            },
            'add-text': { 
                type: 'textbox', 
                content: 'Text', 
                textMode: 'auto',
                style: { x: 400, y: 300, fontSize: 24, color: '#000000' } 
            },
            'add-rectangle': { 
                type: 'shape', 
                shapeType: 'rectangle', 
                style: { x: 100, y: 100, width: 200, height: 150, fill: '#007acc' } 
            },
            'add-square': { 
                type: 'shape', 
                shapeType: 'rectangle', 
                style: { x: 100, y: 100, width: 150, height: 150, fill: '#007acc' } 
            },
            'add-circle': { 
                type: 'shape', 
                shapeType: 'circle', 
                style: { x: 100, y: 100, width: 150, height: 150, fill: '#007acc' } 
            },
            'add-triangle': { 
                type: 'shape', 
                shapeType: 'triangle', 
                style: { x: 100, y: 100, width: 150, height: 150, fill: '#007acc' } 
            },
            'add-line': { 
                type: 'shape', 
                shapeType: 'line', 
                style: { x: 100, y: 100, width: 200, height: 4, fill: '#007acc' } 
            },
            'add-star': { 
                type: 'shape', 
                shapeType: 'star', 
                style: { x: 100, y: 100, width: 100, height: 100, fill: '#007acc' } 
            },
            'add-polygon': { 
                type: 'shape', 
                shapeType: 'polygon', 
                style: { x: 100, y: 100, width: 100, height: 100, fill: '#007acc' } 
            },
            'add-image': () => {
                const url = prompt('输入图片 URL:', 'https://picsum.photos/400/300');
                if (url) return { type: 'media', mediaType: 'image', content: url, style: { x: 100, y: 100, width: 400, height: 300 } };
                return null;
            },
            'add-video': () => {
                const url = prompt('输入视频 URL (mp4):', 'https://www.w3schools.com/html/mov_bbb.mp4');
                if (url) return { type: 'media', mediaType: 'video', content: url, style: { x: 100, y: 100, width: 400, height: 300 } };
                return null;
            },
            'add-audio': () => {
                const url = prompt('输入音频 URL (mp3):', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
                if (url) return { type: 'media', mediaType: 'audio', content: url, style: { x: 100, y: 100, width: 300, height: 50 } };
                return null;
            },
            'add-screenshot': () => {
                this.takeScreenshot();
                return null;
            },
            'add-album': () => {
                this.openAlbum();
                return null;
            },
            'add-table': () => {
                this.openTableModal();
                return null;
            },
            'add-icon': { 
                type: 'icon', 
                iconName: 'smile', 
                style: { x: 100, y: 100, width: 64, height: 64, color: '#000000' } 
            },
            'add-chart': () => {
                this.openChartModal();
                return null;
            },
            'add-button': () => {
                const action = prompt('输入按钮动作 (例如: "next", "prev", "url"):', 'next') || 'next';
                return { type: 'button', content: 'Click Me', action, style: { x: 100, y: 100, width: 120, height: 40, fill: '#3b82f6', color: '#ffffff', fontSize: 16 } };
            }
        };
        
        const element = typeof actions[action] === 'function' ? actions[action]() : actions[action];
        if (element) this.store.addElement(state.activeSlideId, element);
    },

    async takeScreenshot() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve(null);
                };
            });

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                const state = this.store.getState();
                if (state.activeSlideId) {
                    this.store.addElement(state.activeSlideId, { 
                        type: 'media', 
                        mediaType: 'image', 
                        content: dataUrl, 
                        style: { x: 50, y: 50, width: 600, height: 400 } 
                    });
                }
            }
            
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error('截图失败:', err);
        }
    },

    openAlbum() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.onchange = (e) => {
            const files = e.target.files;
            if (files && this.store) {
                const state = this.store.getState();
                let offset = 0;
                Array.from(files).forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (event.target?.result && state.activeSlideId) {
                            this.store.addElement(state.activeSlideId, { 
                                type: 'media', 
                                mediaType: 'image', 
                                content: event.target.result, 
                                style: { x: 100 + offset, y: 100 + offset, width: 300, height: 200 } 
                            });
                            offset += 20;
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        };
        input.click();
    },

    updateLanguage() {
        const state = this.store.getState();
        const t = getTranslation(state.language);
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const keys = key.split('.');
            let value = t;
            for (const k of keys) {
                value = value?.[k];
            }
            if (value) el.textContent = value;
        });
        
        document.getElementById('lang-label').textContent = state.language.toUpperCase();
    },

    updateUI(state) {
        document.getElementById('btn-undo').disabled = !state.canUndo;
        document.getElementById('btn-redo').disabled = !state.canRedo;
        
        document.getElementById('dot-panel-top')?.classList.toggle('active', state.panels.propertyPanelPosition === 'top');
        document.getElementById('dot-panel-right')?.classList.toggle('active', state.panels.propertyPanelPosition === 'right');
        document.getElementById('dot-panel-hidden')?.classList.toggle('active', state.panels.propertyPanelPosition === 'hidden');
        
        this.updateSettingsDots();
    },
    
    /**
     * 导出为 PDF
     * 
     * 实现方式：
     * 1. 遍历所有幻灯片
     * 2. 将每张幻灯片渲染为图片
     * 3. 调用后端保存为 PDF（如果可用）
     * 4. 否则下载为图片压缩包
     */
    async exportToPdf() {
        const state = this.store.getState();
        const slides = state.presentation.slides;
        
        if (!slides || slides.length === 0) {
            alert('没有可导出的幻灯片');
            return;
        }
        
        // 显示进度提示
        const progressEl = document.createElement('div');
        progressEl.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8); color: white; padding: 20px 40px;
            border-radius: 8px; z-index: 10000; font-size: 16px;
        `;
        progressEl.textContent = `正在导出... (0/${slides.length})`;
        document.body.appendChild(progressEl);
        
        try {
            // 尝试使用后端导出
            if (window.PyBridge && window.PyBridge.isConnected()) {
                const result = await window.PyBridge.call('export_pdf');
                if (result && result.success) {
                    progressEl.textContent = '导出成功！';
                    setTimeout(() => progressEl.remove(), 1500);
                    return;
                }
            }
            
            // 前端导出：将每张幻灯片导出为图片
            const canvas = window.CanvasManager?.canvas;
            if (!canvas) {
                throw new Error('画布未初始化');
            }
            
            const currentSlideId = state.activeSlideId;
            const images = [];
            
            for (let i = 0; i < slides.length; i++) {
                progressEl.textContent = `正在导出... (${i + 1}/${slides.length})`;
                
                // 切换到目标幻灯片
                this.store.selectSlide(slides[i].id);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 导出为图片
                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    quality: 1,
                    multiplier: 2
                });
                
                images.push({
                    name: `slide_${i + 1}.png`,
                    data: dataUrl
                });
            }
            
            // 恢复原来的幻灯片
            this.store.selectSlide(currentSlideId);
            
            // 下载图片（如果没有后端 PDF 支持）
            images.forEach((img, index) => {
                const link = document.createElement('a');
                link.download = img.name;
                link.href = img.data;
                link.click();
                
                // 延迟下载，避免浏览器阻止
                if (index < images.length - 1) {
                    setTimeout(() => {}, 100);
                }
            });
            
            progressEl.textContent = `已导出 ${slides.length} 张图片`;
            setTimeout(() => progressEl.remove(), 2000);
            
        } catch (err) {
            console.error('[Toolbar] 导出失败:', err);
            progressEl.textContent = '导出失败: ' + err.message;
            progressEl.style.background = 'rgba(200,0,0,0.8)';
            setTimeout(() => progressEl.remove(), 3000);
        }
    },

    async startFullscreenPresentation() {
        const state = this.store.getState();
        const slideIndex = state.presentation.slides.findIndex(s => s.id === state.activeSlideId);
        const startSlide = slideIndex >= 0 ? slideIndex : 0;
        
        if (window.PyBridge && window.PyBridge.isConnected()) {
            try {
                const result = await window.PyBridge.call('start_presentation', startSlide);
                if (result.success) {
                    console.log('[Toolbar] 全屏放映窗口已启动');
                } else {
                    console.error('[Toolbar] 启动放映失败:', result.message);
                }
            } catch (err) {
                console.error('[Toolbar] 启动放映失败:', err);
                this.store.setPreview(true, startSlide);
            }
        } else {
            console.log('[Toolbar] PyBridge 不可用，使用内置预览');
            this.store.setPreview(true, startSlide);
        }
    },

    openTableModal() {
        const modal = document.getElementById('table-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        this.initTableGridSelector();
        
        document.getElementById('btn-cancel-table').onclick = () => modal.classList.add('hidden');
        document.getElementById('btn-create-table').onclick = () => {
            this.createTable();
            modal.classList.add('hidden');
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    },

    initTableGridSelector() {
        const container = document.getElementById('table-grid-selector');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'table-grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('mouseenter', () => {
                    this.highlightTableGrid(row, col);
                });
                
                cell.addEventListener('click', () => {
                    document.getElementById('table-rows').value = row + 1;
                    document.getElementById('table-cols').value = col + 1;
                    this.highlightTableGrid(row, col);
                });
                
                container.appendChild(cell);
            }
        }
    },

    highlightTableGrid(maxRow, maxCol) {
        const cells = document.querySelectorAll('.table-grid-cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            cell.classList.toggle('selected', row <= maxRow && col <= maxCol);
        });
        
        const label = document.getElementById('table-size-label');
        if (label) label.textContent = `${maxRow + 1} x ${maxCol + 1} 表格`;
    },

    createTable() {
        const rows = parseInt(document.getElementById('table-rows').value) || 3;
        const cols = parseInt(document.getElementById('table-cols').value) || 4;
        const cellWidth = parseInt(document.getElementById('table-cell-width').value) || 100;
        const cellHeight = parseInt(document.getElementById('table-cell-height').value) || 40;
        
        const tableData = [];
        for (let r = 0; r < rows; r++) {
            const rowData = [];
            for (let c = 0; c < cols; c++) {
                rowData.push('');
            }
            tableData.push(rowData);
        }
        
        const element = {
            type: 'table',
            content: tableData,
            style: {
                x: 100,
                y: 100,
                width: cols * cellWidth,
                height: rows * cellHeight,
                cellWidth,
                cellHeight,
                fill: '#ffffff',
                stroke: '#000000',
                strokeWidth: 1
            }
        };
        
        const state = this.store.getState();
        if (state.activeSlideId) {
            this.store.addElement(state.activeSlideId, element);
        }
    },

    openChartModal() {
        const modal = document.getElementById('chart-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
        
        document.getElementById('btn-cancel-chart').onclick = () => modal.classList.add('hidden');
        document.getElementById('btn-create-chart').onclick = () => {
            this.createChart();
            modal.classList.add('hidden');
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    },

    createChart() {
        const activeBtn = document.querySelector('.chart-type-btn.active');
        const chartType = activeBtn?.dataset.type || 'bar';
        
        const dataStr = document.getElementById('chart-data').value || '30, 50, 40, 60, 35';
        const labelsStr = document.getElementById('chart-labels').value || '一月, 二月, 三月, 四月, 五月';
        const title = document.getElementById('chart-title').value || '';
        
        const data = dataStr.split(',').map(v => parseFloat(v.trim()) || 0);
        const labels = labelsStr.split(',').map(v => v.trim());
        
        const element = {
            type: 'chart',
            chartType,
            content: { data, labels, title },
            style: {
                x: 100,
                y: 100,
                width: 400,
                height: 300,
                fill: '#3b82f6'
            }
        };
        
        const state = this.store.getState();
        if (state.activeSlideId) {
            this.store.addElement(state.activeSlideId, element);
        }
    },
    
    setElementAnimation(animationType) {
        const state = this.store.getState();
        if (!state.activeSlideId || !state.activeElementId) {
            return;
        }
        
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        const element = slide?.elements.find(e => e.id === state.activeElementId);
        if (!element) return;
        
        this.store.updateElement(state.activeSlideId, state.activeElementId, {
            animation: {
                type: animationType,
                duration: element.animation?.duration || 0.5,
                delay: element.animation?.delay || 0
            }
        });
        
        this.updateAnimationDots(animationType);
    },
    
    updateAnimationDots(activeType) {
        const types = ['none', 'fadeIn', 'slideInLeft', 'slideInRight', 'slideInUp', 'slideInDown', 'scaleIn'];
        types.forEach(type => {
            const dot = document.getElementById(`dot-anim-${type}`);
            if (dot) dot.classList.toggle('active', type === activeType);
        });
    },
    
    async exportToImages() {
        if (!window.pyApi) {
            alert('导出图片功能需要后端支持');
            return;
        }
        
        try {
            const result = await window.pyApi.export_images();
            
            if (result.success) {
                alert(`成功导出 ${result.count} 张图片到:\n${result.directory}`);
            } else {
                alert('导出失败: ' + (result.message || '未知错误'));
            }
        } catch (e) {
            alert('导出失败: ' + e.message);
        }
    },
    
    async exportToHtmlFile() {
        if (!window.pyApi) {
            alert('导出HTML功能需要后端支持');
            return;
        }
        
        try {
            const html = await window.pyApi.export_single_file();
            
            // 创建下载
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'presentation.html';
            a.click();
            URL.revokeObjectURL(url);
            
            alert('HTML 文件已导出');
        } catch (e) {
            alert('导出失败: ' + e.message);
        }
    },
    
    async printPresentation() {
        if (!window.pyApi) {
            // 使用浏览器打印
            window.print();
            return;
        }
        
        try {
            const result = await window.pyApi.print_presentation();
            
            if (!result.success && result.message !== '用户取消') {
                alert('打印失败: ' + (result.message || '未知错误'));
            }
        } catch (e) {
            // 回退到浏览器打印
            window.print();
        }
    }
};

window.Toolbar = Toolbar;
