/**
 * 主题管理器模块
 * 
 * 负责管理应用程序的主题切换。
 * 
 * 功能：
 * - 支持亮色/暗色主题
 * - 根据时间自动切换主题
 * - 手动切换主题
 * - 保存用户偏好
 * 
 * ============================================================
 * 【重要】暗色主题设计原则
 * ============================================================
 * 
 * 暗色主题必须遵循以下规则，避免出现"暗色画面下的亮白色元素"：
 * 
 * 1. 所有背景色必须使用深色（#18181b 到 #3f3f46）
 * 2. 所有文字必须使用浅色（#fafafa 到 #a1a1aa）
 * 3. 边框使用中等灰色（#3f3f46）
 * 4. 阴影使用深色透明度（rgba(0,0,0,0.3)）
 * 5. 强调色保持不变（蓝色 #3b82f6）
 * 
 * 禁止事项：
 * - 禁止在暗色主题中使用 white、#fff、#ffffff
 * - 禁止在暗色主题中使用 #fafafa 作为背景
 * - 禁止在暗色主题中使用 #18181b 作为文字颜色
 * ============================================================
 */

const ThemeManager = {
    /** @type {string} 当前主题 */
    currentTheme: 'light',
    
    /** @type {boolean} 是否自动切换 */
    autoSwitch: true,
    
    /** @type {EditorStore|null} 状态管理实例 */
    store: null,

    /**
     * 初始化主题管理器
     */
    init(store) {
        this.store = store;
        this.loadPreferences();
        this.checkTimeBasedTheme();
        
        // 每分钟检查一次时间（保存引用以便清理）
        this._themeCheckInterval = setInterval(() => this.checkTimeBasedTheme(), 60000);
    },
    
    /**
     * 销毁主题管理器（清理资源）
     */
    destroy() {
        if (this._themeCheckInterval) {
            clearInterval(this._themeCheckInterval);
            this._themeCheckInterval = null;
        }
    },

    /**
     * 加载用户偏好
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('theme-preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.autoSwitch = prefs.autoSwitch !== false;
                if (!this.autoSwitch && prefs.theme) {
                    this.setTheme(prefs.theme);
                }
            }
        } catch (e) {
            console.warn('[ThemeManager] 加载偏好失败:', e);
        }
    },

    /**
     * 保存用户偏好
     */
    savePreferences() {
        try {
            localStorage.setItem('theme-preferences', JSON.stringify({
                theme: this.currentTheme,
                autoSwitch: this.autoSwitch
            }));
        } catch (e) {
            console.warn('[ThemeManager] 保存偏好失败:', e);
        }
    },

    /**
     * 根据时间检查并切换主题
     * 
     * 规则：
     * - 06:00 - 18:00：亮色主题
     * - 18:00 - 06:00：暗色主题
     */
    checkTimeBasedTheme() {
        if (!this.autoSwitch) return;
        
        const hour = new Date().getHours();
        const shouldBeDark = hour >= 18 || hour < 6;
        const targetTheme = shouldBeDark ? 'dark' : 'light';
        
        if (this.currentTheme !== targetTheme) {
            this.setTheme(targetTheme);
        }
    },

    /**
     * 设置主题
     * 
     * @param {string} theme - 'light' 或 'dark'
     */
    setTheme(theme) {
        this.currentTheme = theme;
        
        // 设置 HTML 属性
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新 CSS 变量（备用方案）
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        }
        
        // 更新 meta 标签（移动端状态栏颜色）
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#18181b' : '#ffffff');
        }
        
        this.savePreferences();
        
        console.log(`[ThemeManager] 已切换到${theme === 'dark' ? '暗色' : '亮色'}主题`);
    },

    /**
     * 切换主题
     */
    toggleTheme() {
        this.autoSwitch = false;
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
    },

    /**
     * 启用/禁用自动切换
     */
    setAutoSwitch(enabled) {
        this.autoSwitch = enabled;
        if (enabled) {
            this.checkTimeBasedTheme();
        }
        this.savePreferences();
    },

    /**
     * 获取当前主题
     */
    getTheme() {
        return this.currentTheme;
    },

    /**
     * 是否为暗色主题
     */
    isDark() {
        return this.currentTheme === 'dark';
    }
};

window.ThemeManager = ThemeManager;
