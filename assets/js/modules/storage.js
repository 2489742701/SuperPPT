/**
 * 数据存储模块
 * 
 * 提供统一的数据存储接口，支持多种存储后端：
 * - PyQt6/pywebview: 使用 Python 后端 API
 * - 浏览器模式: 使用 localStorage
 * 
 * 使用方法:
 *     // 初始化
 *     await Storage.init();
 *     
 *     // 保存数据
 *     await Storage.save(data);
 *     
 *     // 加载数据
 *     const data = await Storage.load();
 */

const Storage = {
    /** @type {string} 存储键名 */
    STORAGE_KEY: 'ppt_editor_data',
    
    /** @type {boolean} 是否已初始化 */
    initialized: false,
    
    /** @type {string} 当前环境 */
    environment: null,

    /**
     * 初始化存储模块
     * 
     * @returns {Promise<boolean>}
     */
    init: function() {
        const self = this;
        
        return new Promise(function(resolve) {
            if (PyBridge.initialized) {
                self.environment = PyBridge.environment;
                self.initialized = true;
                resolve(true);
            } else {
                PyBridge.init().then(function() {
                    self.environment = PyBridge.environment;
                    self.initialized = true;
                    resolve(true);
                });
            }
        });
    },

    /**
     * 保存演示文稿数据
     * 
     * @param {Object} data - 演示文稿数据
     * @returns {Promise<boolean>}
     */
    save: function(data) {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            if (self.environment === 'browser') {
                try {
                    localStorage.setItem(self.STORAGE_KEY, JSON.stringify(data));
                    resolve(true);
                } catch (error) {
                    console.error('[Storage] 保存失败:', error);
                    reject(error);
                }
            } else {
                PyBridge.call('load_presentation', JSON.stringify(data)).then(function(result) {
                    resolve(result.success);
                }).catch(reject);
            }
        });
    },

    /**
     * 加载演示文稿数据
     * 
     * @returns {Promise<Object|null>}
     */
    load: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            if (self.environment === 'browser') {
                try {
                    const data = localStorage.getItem(self.STORAGE_KEY);
                    if (data) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('[Storage] 加载失败:', error);
                    reject(error);
                }
            } else {
                PyBridge.call('get_presentation').then(resolve).catch(reject);
            }
        });
    },

    /**
     * 清除数据
     * 
     * @returns {Promise<boolean>}
     */
    clear: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            if (self.environment === 'browser') {
                try {
                    localStorage.removeItem(self.STORAGE_KEY);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            } else {
                PyBridge.call('new_presentation').then(function() {
                    resolve(true);
                }).catch(reject);
            }
        });
    },

    /**
     * 导出为 JSON 字符串
     * 
     * @returns {Promise<string>}
     */
    exportJSON: function() {
        return PyBridge.call('save_presentation');
    },

    /**
     * 从 JSON 字符串导入
     * 
     * @param {string} jsonData - JSON 字符串
     * @returns {Promise<boolean>}
     */
    importJSON: function(jsonData) {
        return PyBridge.call('load_presentation', jsonData);
    }
};

Storage.autoSave = function(data, delay) {
    delay = delay || 1000;
    
    if (Storage._autoSaveTimeout) {
        clearTimeout(Storage._autoSaveTimeout);
    }
    
    Storage._autoSaveTimeout = setTimeout(function() {
        Storage.save(data);
    }, delay);
};

window.Storage = Storage;
