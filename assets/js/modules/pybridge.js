/**
 * Python 后端桥接模块
 * 
 * 本模块提供统一的后端 API 接口，支持两种运行环境：
 * 1. PyQt6 + QWebEngineView: 通过 QWebChannel 通信
 * 2. pywebview: 通过 window.pywebview.api 通信
 * 
 * 使用方法:
 *     // 初始化
 *     await PyBridge.init();
 *     
 *     // 调用 API
 *     const result = await PyBridge.call('get_presentation');
 *     const slides = await PyBridge.call('add_slide', slideId);
 */

const PyBridge = {
    /**
     * 后端 API 对象引用
     * 初始化后会被设置为 pyApi (PyQt6) 或 pywebview.api
     */
    api: null,
    
    /**
     * 当前运行环境类型
     * 'pyqt6' | 'pywebview' | 'browser'
     */
    environment: null,
    
    /**
     * 初始化状态
     */
    initialized: false,
    
    /**
     * 初始化 Promise 解决函数列表
     * 用于处理并发初始化请求
     */
    initResolvers: [],

    /**
     * 初始化后端连接
     * 
     * 自动检测运行环境并建立连接。
     * 对于 PyQt6，需要等待 QWebChannel 初始化完成。
     * 对于 pywebview，需要等待 DOMContentLoaded 事件。
     * 
     * @returns {Promise<boolean>} 初始化是否成功
     * 
     * @example
     *     await PyBridge.init();
     *     console.log('后端已连接:', PyBridge.environment);
     */
    init: function() {
        const self = this;
        
        // 如果已经初始化，直接返回
        if (this.initialized && this.api) {
            return Promise.resolve(true);
        }
        
        // 如果正在初始化，返回同一个 Promise
        return new Promise((resolve, reject) => {
            self.initResolvers.push({ resolve, reject });
            
            // 只执行一次初始化逻辑
            if (self.initResolvers.length === 1) {
                self._doInit();
            }
        });
    },

    /**
     * 执行实际的初始化逻辑
     * @private
     */
    _doInit: function() {
        const self = this;
        
        console.log('[PyBridge] 开始初始化...');
        console.log('[PyBridge] QWebChannel 存在:', typeof QWebChannel !== 'undefined');
        console.log('[PyBridge] qt 存在:', typeof qt !== 'undefined');
        console.log('[PyBridge] qt.webChannelTransport 存在:', typeof qt !== 'undefined' && typeof qt.webChannelTransport !== 'undefined');
        
        // 检测 PyQt6 环境 (QWebChannel)
        if (typeof QWebChannel !== 'undefined' && typeof qt !== 'undefined' && typeof qt.webChannelTransport !== 'undefined') {
            console.log('[PyBridge] 检测到 PyQt6 环境');
            this.environment = 'pyqt6';
            
            // QWebChannel 需要通过 qt.webChannelTransport 通信
            new QWebChannel(qt.webChannelTransport, function(channel) {
                console.log('[PyBridge] QWebChannel 回调执行');
                console.log('[PyBridge] channel.objects:', channel.objects);
                
                // 获取注册的 pyApi 对象
                self.api = channel.objects.pyApi;
                console.log('[PyBridge] pyApi 对象:', self.api);
                
                if (self.api) {
                    console.log('[PyBridge] pyApi 属性:', Object.keys(self.api));
                }
                
                self.initialized = true;
                console.log('[PyBridge] PyQt6 QWebChannel 已连接');
                
                // 解决所有等待的初始化 Promise
                self._resolveAll(true);
            });
            return;
        }
        
        // 等待 qt 对象加载（PyQt6 可能延迟注入）
        if (typeof QWebChannel !== 'undefined') {
            console.log('[PyBridge] QWebChannel 存在，等待 qt 对象...');
            
            // 检查 qt 对象是否在 window 上
            let checkCount = 0;
            const self = this;
            this._checkQtInterval = setInterval(function() {
                checkCount++;
                console.log('[PyBridge] 检查 qt 对象...', checkCount);
                
                if (typeof qt !== 'undefined' && typeof qt.webChannelTransport !== 'undefined') {
                    clearInterval(self._checkQtInterval);
                    self._checkQtInterval = null;
                    console.log('[PyBridge] qt 对象已就绪');
                    self.environment = 'pyqt6';
                    
                    new QWebChannel(qt.webChannelTransport, function(channel) {
                        console.log('[PyBridge] QWebChannel 回调执行');
                        console.log('[PyBridge] channel.objects:', channel.objects);
                        
                        self.api = channel.objects.pyApi;
                        console.log('[PyBridge] pyApi 对象:', self.api);
                        
                        if (self.api) {
                            console.log('[PyBridge] pyApi 属性:', Object.keys(self.api));
                        }
                        
                        self.initialized = true;
                        console.log('[PyBridge] PyQt6 QWebChannel 已连接');
                        self._resolveAll(true);
                    });
                } else if (checkCount > 50) {
                    // 超时 5 秒
                    clearInterval(self._checkQtInterval);
                    self._checkQtInterval = null;
                    console.log('[PyBridge] qt 对象等待超时，使用浏览器模式');
                    self._initBrowserMode();
                }
            }, 100);
            return;
        }
        
        // 检测 pywebview 环境
        if (typeof pywebview !== 'undefined' && pywebview.api) {
            console.log('[PyBridge] 检测到 pywebview 环境');
            this.environment = 'pywebview';
            this.api = pywebview.api;
            this.initialized = true;
            this._resolveAll(true);
            return;
        }
        
        // 等待 pywebview 初始化（pywebview 可能延迟加载）
        if (typeof pywebview !== 'undefined') {
            console.log('[PyBridge] 等待 pywebview.api 初始化...');
            
            // 监听 pywebview 的 domready 事件
            window.addEventListener('pywebviewready', function() {
                console.log('[PyBridge] pywebview 已就绪');
                self.environment = 'pywebview';
                self.api = pywebview.api;
                self.initialized = true;
                self._resolveAll(true);
            });
            
            // 设置超时，防止无限等待
            setTimeout(function() {
                if (!self.initialized) {
                    console.warn('[PyBridge] pywebview 初始化超时，使用浏览器模式');
                    self._initBrowserMode();
                }
            }, 5000);
            return;
        }
        
        // 浏览器模式（无后端）
        console.log('[PyBridge] 未检测到 Python 后端，使用浏览器模式');
        this._initBrowserMode();
    },

    /**
     * 初始化浏览器模式（无后端连接）
     * @private
     */
    _initBrowserMode: function() {
        this.environment = 'browser';
        this.api = this._createMockApi();
        this.initialized = true;
        this._resolveAll(true);
    },

    /**
     * 解决所有等待的 Promise
     * @private
     * @param {boolean} success - 是否成功
     */
    _resolveAll: function(success) {
        const resolvers = this.initResolvers;
        this.initResolvers = [];
        resolvers.forEach(function(r) {
            r.resolve(success);
        });
    },
    
    /**
     * 销毁 PyBridge（清理资源）
     */
    destroy: function() {
        // 清理检查定时器
        if (this._checkQtInterval) {
            clearInterval(this._checkQtInterval);
            this._checkQtInterval = null;
        }
        
        // 清理等待的 Promise
        this.initResolvers = [];
        this.initialized = false;
        this.api = null;
        
        console.log('[PyBridge] 资源已清理');
    },

    /**
     * 创建模拟 API（用于浏览器模式测试）
     * @private
     * @returns {Object} 模拟的 API 对象
     */
    _createMockApi: function() {
        return {
            get_presentation: function() {
                return { slides: [], settings: {} };
            },
            new_presentation: function() {
                return { success: true };
            },
            add_slide: function() {
                return { success: true, slide: { id: 'mock-slide' } };
            },
            remove_slide: function() {
                return { success: true };
            },
            save_presentation: function() {
                return JSON.stringify({ slides: [] });
            },
            load_presentation: function() {
                return { success: true };
            }
        };
    },

    /**
     * 调用后端 API 方法
     * 
     * 提供统一的 API 调用接口，自动处理不同环境的差异。
     * 
     * @param {string} method - API 方法名
     * @param {...any} args - 方法参数
     * @returns {Promise<any>} API 调用结果
     * 
     * @example
     *     // 无参数调用
     *     const presentation = await PyBridge.call('get_presentation');
     *     
     *     // 带参数调用
     *     const result = await PyBridge.call('add_slide', slideId);
     *     
     *     // 多参数调用
     *     const result = await PyBridge.call('update_element', slideId, elementId, style);
     */
    call: function(method) {
        const self = this;
        const args = Array.prototype.slice.call(arguments, 1);
        
        return new Promise(function(resolve, reject) {
            // 确保已初始化
            if (!self.initialized) {
                self.init().then(function() {
                    self._invokeMethod(method, args, resolve, reject);
                }).catch(reject);
            } else {
                self._invokeMethod(method, args, resolve, reject);
            }
        });
    },

    /**
     * 实际调用 API 方法
     * @private
     */
    _invokeMethod: function(method, args, resolve, reject) {
        if (!this.api) {
            reject(new Error('后端 API 未初始化'));
            return;
        }
        
        try {
            if (this.environment === 'pyqt6') {
                if (typeof this.api.invoke === 'function') {
                    this.api.invoke(method, args || [], function(result) {
                        resolve(result);
                    });
                } else {
                    reject(new Error('QWebChannel invoke 方法不可用'));
                }
            } 
            else if (this.environment === 'pywebview') {
                const apiMethod = this.api[method];
                if (typeof apiMethod !== 'function') {
                    reject(new Error('未知的 API 方法: ' + method));
                    return;
                }
                
                const result = apiMethod.apply(this.api, args);
                
                if (result && typeof result.then === 'function') {
                    result.then(resolve).catch(reject);
                } else {
                    resolve(result);
                }
            } 
            else {
                const apiMethod = this.api[method];
                if (typeof apiMethod !== 'function') {
                    reject(new Error('未知的 API 方法: ' + method));
                    return;
                }
                const result = apiMethod.apply(this.api, args);
                resolve(result);
            }
        } catch (error) {
            console.error('[PyBridge] API 调用错误:', method, error);
            reject(error);
        }
    },

    /**
     * 检查是否已连接到后端
     * @returns {boolean}
     */
    isConnected: function() {
        return this.initialized && this.api !== null;
    },

    /**
     * 获取当前运行环境
     * @returns {string} 'pyqt6' | 'pywebview' | 'browser'
     */
    getEnvironment: function() {
        return this.environment;
    }
};

// 导出模块（兼容不同的模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PyBridge;
} else if (typeof window !== 'undefined') {
    window.PyBridge = PyBridge;
}
