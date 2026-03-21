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
                } else if (panel === 'smart-guides') {
                    this.toggleSmartGuides();
                }
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

        document.getElementById('btn-add-button')?.addEventListener('click', () => {
            this.handleAddAction('add-button');
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
                    <div class="layout-item" data-layout="section_header">
                        <div class="layout-preview">
                            <div class="layout-preview-section-title"></div>
                            <div class="layout-preview-divider-center"></div>
                        </div>
                        <span>章节标题</span>
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
        const dotSmartGuides = document.getElementById('dot-smart-guides');
        
        if (dotClick) dotClick.classList.toggle('active', settings.clickAdvanceEnabled !== false);
        if (dotSpace) dotSpace.classList.toggle('active', settings.spaceAdvanceEnabled !== false);
        if (dotAnim) dotAnim.classList.toggle('active', settings.animationEnabled !== false);
        if (dotSmartGuides) dotSmartGuides.classList.toggle('active', settings.smartGuidesEnabled !== false);
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
            'add-table': { 
                type: 'table', 
                content: 'Table', 
                style: { x: 100, y: 100, width: 300, height: 150, fill: '#f4f4f5', stroke: '#d4d4d8', strokeWidth: 1 } 
            },
            'add-icon': { 
                type: 'icon', 
                iconName: 'smile', 
                style: { x: 100, y: 100, width: 64, height: 64, color: '#000000' } 
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
    }
};

window.Toolbar = Toolbar;
