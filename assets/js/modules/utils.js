/**
 * 公共工具函数模块
 * 
 * 提供项目中常用的工具函数，避免重复代码。
 */

const Utils = {
    /**
     * 从状态中获取当前激活的幻灯片
     * @param {Object} state - 应用状态
     * @returns {Object|null} 当前幻灯片对象
     */
    getActiveSlide(state) {
        if (!state?.presentation?.slides || !state?.activeSlideId) {
            return null;
        }
        return state.presentation.slides.find(s => s.id === state.activeSlideId);
    },

    /**
     * 从状态中获取指定的元素
     * @param {Object} state - 应用状态
     * @param {string} elementId - 元素ID
     * @returns {Object|null} 元素对象
     */
    getElement(state, elementId) {
        const slide = this.getActiveSlide(state);
        if (!slide?.elements || !elementId) {
            return null;
        }
        return slide.elements.find(e => e.id === elementId);
    },

    /**
     * 从幻灯片中获取指定的元素
     * @param {Object} slide - 幻灯片对象
     * @param {string} elementId - 元素ID
     * @returns {Object|null} 元素对象
     */
    getElementFromSlide(slide, elementId) {
        if (!slide?.elements || !elementId) {
            return null;
        }
        return slide.elements.find(e => e.id === elementId);
    },

    /**
     * 检查元素是否是文本类元素（textbox 或 button）
     * @param {Object} element - 元素对象
     * @returns {boolean} 是否是文本类元素
     */
    isTextElement(element) {
        return element && (element.type === 'textbox' || element.type === 'button');
    },

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * 截断字符串，超过最大长度时添加省略号
     * @param {string} str - 原始字符串
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的字符串
     */
    truncateString(str, maxLength = 20) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    },

    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

window.Utils = Utils;
