/**
 * 欢迎页面模块
 * 
 * 功能：
 * - 根据时间显示问候语（早上/中午/下午/晚上/深夜）
 * - 显示最近文件列表
 * - 文件缩略图预览
 * - 文件迁移检测
 */

const WelcomePage = {
    /** @type {string} 用户名 */
    userName: '用户',
    
    /** @type {Array} 最近文件列表 */
    recentFiles: [],
    
    /** @type {number} 最大最近文件数 */
    maxRecentFiles: 18,

    /**
     * 初始化欢迎页面
     */
    init: function() {
        this.loadSettings();
        this.updateGreeting();
        this.bindEvents();
        this.loadRecentFiles();
    },

    /**
     * 加载用户设置
     */
    loadSettings: function() {
        const saved = localStorage.getItem('ppt_user_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.userName = settings.userName || '用户';
            } catch (e) {
                console.error('[WelcomePage] 加载设置失败:', e);
            }
        }
    },

    /**
     * 保存用户设置
     */
    saveSettings: function() {
        localStorage.setItem('ppt_user_settings', JSON.stringify({
            userName: this.userName
        }));
    },

    /**
     * 设置用户名
     * @param {string} name - 用户名
     */
    setUserName: function(name) {
        this.userName = name || '用户';
        this.saveSettings();
        this.updateGreeting();
    },

    /**
     * 根据时间更新问候语
     */
    updateGreeting: function() {
        const hour = new Date().getHours();
        let greeting = '';
        let subtitle = '';
        
        if (hour >= 5 && hour < 9) {
            greeting = `${this.userName}，早上好`;
            subtitle = '新的一天，新的开始';
        } else if (hour >= 9 && hour < 12) {
            greeting = `${this.userName}，上午好`;
            subtitle = '精力充沛，效率最高';
        } else if (hour >= 12 && hour < 14) {
            greeting = `${this.userName}，中午好`;
            subtitle = '休息一下，继续加油';
        } else if (hour >= 14 && hour < 18) {
            greeting = `${this.userName}，下午好`;
            subtitle = '继续努力，创造精彩';
        } else if (hour >= 18 && hour < 22) {
            greeting = `${this.userName}，晚上好`;
            subtitle = '放松心情，享受创作';
        } else {
            greeting = `${this.userName}，夜深了`;
            subtitle = '注意休息，保重身体';
        }
        
        const greetingEl = document.getElementById('welcome-greeting');
        const subtitleEl = document.querySelector('.welcome-subtitle');
        
        if (greetingEl) greetingEl.textContent = greeting;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    },

    /**
     * 绑定事件
     */
    bindEvents: function() {
        const self = this;
        
        document.getElementById('welcome-new')?.addEventListener('click', function() {
            self.createNewPresentation();
        });
        
        document.getElementById('welcome-open')?.addEventListener('click', function() {
            self.openFile();
        });
    },

    /**
     * 显示欢迎页面
     */
    show: function() {
        const page = document.getElementById('welcome-page');
        if (page) {
            page.classList.remove('hidden');
            this.updateGreeting();
            this.loadRecentFiles();
        }
    },

    /**
     * 隐藏欢迎页面
     */
    hide: function() {
        const page = document.getElementById('welcome-page');
        if (page) {
            page.classList.add('hidden');
        }
    },

    /**
     * 创建新演示文稿
     */
    createNewPresentation: async function() {
        this.hide();
        if (window.editor && window.editor.store) {
            await PyBridge.call('new_presentation');
            window.editor.store.notify();
        }
    },

    /**
     * 打开文件
     */
    openFile: async function() {
        const result = await PyBridge.call('load_from_file');
        if (result && result.success) {
            this.hide();
            this.addToRecentFiles(result.file_path, result.data);
            if (window.editor && window.editor.store) {
                window.editor.store.presentation = result.data;
                window.editor.store.notify();
            }
        }
    },

    /**
     * 加载最近文件列表
     */
    loadRecentFiles: async function() {
        const grid = document.getElementById('recent-files-grid');
        if (!grid) return;
        
        try {
            const result = await PyBridge.call('get_recent_files');
            if (result && result.success && result.files) {
                this.recentFiles = result.files;
                this.renderRecentFiles();
            } else {
                this.renderEmptyState();
            }
        } catch (e) {
            console.error('[WelcomePage] 加载最近文件失败:', e);
            this.renderEmptyState();
        }
    },

    /**
     * 渲染最近文件列表
     */
    renderRecentFiles: function() {
        const grid = document.getElementById('recent-files-grid');
        if (!grid) return;
        
        if (!this.recentFiles || this.recentFiles.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        grid.innerHTML = this.recentFiles.map(function(file, index) {
            return `
                <div class="recent-file-card ${file.exists === false ? 'error' : ''}" data-path="${file.path}" data-index="${index}">
                    <div class="recent-file-thumbnail">
                        ${file.exists === false ? 
                            `<div class="recent-file-error">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>文件已移动</span>
                            </div>` :
                            `<img src="${file.thumbnail || ''}" alt="${file.name}" onerror="this.style.display='none'">`
                        }
                    </div>
                    <div class="recent-file-info">
                        <div class="recent-file-name" title="${file.name}">${file.name}</div>
                        <div class="recent-file-meta">${file.modified || ''}</div>
                    </div>
                    <button class="recent-file-delete" data-index="${index}" title="从列表中移除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
        
        this.bindFileEvents();
    },

    /**
     * 渲染空状态
     */
    renderEmptyState: function() {
        const grid = document.getElementById('recent-files-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p>还没有最近的文件</p>
                <p style="font-size: 13px; margin-top: 8px; opacity: 0.7;">创建或打开一个演示文稿开始吧</p>
            </div>
        `;
    },

    /**
     * 绑定文件卡片事件
     */
    bindFileEvents: function() {
        const self = this;
        const grid = document.getElementById('recent-files-grid');
        if (!grid) return;
        
        grid.querySelectorAll('.recent-file-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.recent-file-delete')) return;
                const path = this.dataset.path;
                if (path) {
                    self.openRecentFile(path);
                }
            });
        });
        
        grid.querySelectorAll('.recent-file-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.dataset.index);
                self.removeRecentFile(index);
            });
        });
    },

    /**
     * 打开最近文件
     * @param {string} path - 文件路径
     */
    openRecentFile: async function(path) {
        const result = await PyBridge.call('load_from_file_path', path);
        if (result && result.success) {
            this.hide();
            if (window.editor && window.editor.store) {
                window.editor.store.presentation = result.data;
                window.editor.store.activeSlideId = result.data.slides[0]?.id || null;
                window.editor.store.notify();
            }
        } else {
            alert('无法打开文件: ' + (result.message || '未知错误'));
        }
    },

    /**
     * 添加到最近文件列表
     * @param {string} path - 文件路径
     * @param {Object} data - 演示文稿数据
     */
    addToRecentFiles: async function(path, data) {
        await PyBridge.call('add_recent_file', path, data);
        this.loadRecentFiles();
    },

    /**
     * 从最近文件列表移除
     * @param {number} index - 文件索引
     */
    removeRecentFile: async function(index) {
        await PyBridge.call('remove_recent_file', index);
        this.loadRecentFiles();
    }
};

window.WelcomePage = WelcomePage;
