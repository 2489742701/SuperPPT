"""
HTML PPT 编辑器 - PySide6 主程序入口

本模块使用 PySide6 和 QWebEngineView 创建桌面应用程序，
通过 QWebChannel 实现 Python 后端与 JavaScript 前端的通信。

主要功能:
    - 创建 PySide6 主窗口
    - 加载 HTML/CSS/JavaScript 前端界面
    - 通过 QWebChannel 暴露 Python API 给前端调用
    - 支持演示文稿的创建、编辑、保存和导出

使用方法:
    python main.py

依赖:
    - PySide6: GUI 框架（LGPL 许可证，商业友好）
    - PySide6-WebEngine: WebEngine 组件
    - api: 后端 API 模块
"""

import sys
import os
import argparse
import json
import time
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from api import API, get_resource_path
from dev_tools import DebugLogger, DebugTracer, APITester, PerformanceMonitor, trace_function
from example_generator import ExampleGenerator

from PySide6.QtCore import QObject, Slot, QUrl, QUrlQuery, Qt, QTimer
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtGui import QKeyEvent, QShortcut, QKeySequence


class PresentationWindow(QMainWindow):
    """
    全屏放映窗口类
    
    创建一个独立的全屏窗口用于演示幻灯片。
    该窗口具有以下特点：
        - 无边框、无工具栏，提供沉浸式演示体验
        - 自动全屏显示（类似浏览器 F11 效果）
        - 幻灯片内容自适应填满整个屏幕
        - 支持键盘快捷键控制
    
    快捷键说明:
        - ESC: 退出放映窗口
        - F11: 切换全屏/窗口模式
        - 左箭头/右箭头: 切换幻灯片（由前端 JavaScript 处理）
        - 空格: 下一页（由前端 JavaScript 处理）
    
    Attributes:
        web_view (QWebEngineView): 用于显示幻灯片内容的 Web 视图
        start_slide (int): 起始幻灯片索引（从 0 开始）
    """
    
    def __init__(self, html_content: str, start_slide: int = 0):
        """
        初始化全屏放映窗口
        
        Args:
            html_content (str): 要显示的 HTML 内容，包含完整的幻灯片数据
            start_slide (int, optional): 起始幻灯片索引。默认为 0（第一页）
        
        Note:
            窗口创建后会自动进入全屏模式
        """
        super().__init__()
        
        # 设置窗口标题
        self.setWindowTitle("演示模式")
        
        # 设置窗口标志：独立窗口 + 无边框
        # Window: 创建一个独立的顶层窗口
        # FramelessWindowHint: 移除标题栏和边框
        self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.FramelessWindowHint)
        
        # 创建中央部件和布局
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)  # 移除边距，让内容填满窗口
        
        # 创建 WebEngineView 用于显示幻灯片
        self.web_view = QWebEngineView()
        
        # 设置 HTML 内容
        # 使用 QUrl.fromLocalFile 设置基础 URL，确保相对路径资源可以正确加载
        base_url = QUrl.fromLocalFile(os.path.dirname(os.path.abspath(__file__)) + "/")
        self.web_view.setHtml(html_content, base_url)
        
        # 将 web_view 添加到布局
        layout.addWidget(self.web_view)
        
        # 配置 WebEngine 设置
        settings = self.web_view.page().settings()
        # 启用 JavaScript 支持
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        # 允许 JavaScript 激活窗口
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowWindowActivationFromJavaScript, True)
        
        # 禁用右键菜单，让 JavaScript 处理右键事件
        self.web_view.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        
        # 设置快捷键
        self.esc_shortcut = QShortcut(QKeySequence(Qt.Key.Key_Escape), self)
        self.esc_shortcut.activated.connect(self.close)
        
        self.f11_shortcut = QShortcut(QKeySequence(Qt.Key.Key_F11), self)
        self.f11_shortcut.activated.connect(self.toggle_fullscreen)
        
        # 保存起始幻灯片索引
        self.start_slide = start_slide
        
        # 连接加载完成信号
        self.web_view.loadFinished.connect(self._on_load_finished)
    
    def _on_load_finished(self, success: bool):
        if success and self.start_slide > 0:
            self.web_view.page().runJavaScript(f"showSlide({self.start_slide});")
    
    def toggle_fullscreen(self):
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()
    
    def showEvent(self, event):
        """
        窗口显示事件处理
        
        当窗口显示时自动进入全屏模式。
        
        Args:
            event: 显示事件对象
        """
        super().showEvent(event)
        # 自动进入全屏模式
        self.showFullScreen()
    
    def closeEvent(self, event):
        """
        窗口关闭事件处理
        
        清理资源，确保窗口正确关闭。
        
        Args:
            event: 关闭事件对象
        """
        # 停止页面加载
        self.web_view.stop()
        # 接受关闭事件
        event.accept()


class WebEnginePage(QWebEnginePage):
    """
    自定义 WebEnginePage 用于捕获 JavaScript 控制台输出
    
    继承自 QWebEnginePage，重写 javaScriptConsoleMessage 方法，
    将 JavaScript 控制台消息重定向到 Python 标准输出。
    
    这在调试前端代码时非常有用，可以在终端中看到 JavaScript 的
    console.log、console.warn、console.error 等输出。
    
    Attributes:
        无额外属性，继承自 QWebEnginePage
    
    Example:
        >>> web_view = QWebEngineView()
        >>> custom_page = WebEnginePage(web_view)
        >>> web_view.setPage(custom_page)
        # 现在 JavaScript 的 console.log 会输出到 Python 终端
    """
    
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        """
        重写 JavaScript 控制台消息处理方法
        
        当 JavaScript 执行 console.log/warn/error 时，此方法会被调用。
        消息会被格式化后输出到 Python 标准输出。
        
        Args:
            level: 消息级别枚举值
                - InfoMessageLevel: 普通信息
                - WarningMessageLevel: 警告
                - ErrorMessageLevel: 错误
            message: 消息内容
            lineNumber: 消息所在行号
            sourceID: 消息来源文件路径
        
        Note:
            输出格式: [JS LEVEL] message (line N, source)
        """
        level_name = {
            QWebEnginePage.JavaScriptConsoleMessageLevel.InfoMessageLevel: 'INFO',
            QWebEnginePage.JavaScriptConsoleMessageLevel.WarningMessageLevel: 'WARN',
            QWebEnginePage.JavaScriptConsoleMessageLevel.ErrorMessageLevel: 'ERROR',
        }.get(level, 'LOG')
        print(f"[JS {level_name}] {message} (line {lineNumber}, {sourceID})")


def get_asset_path(filename: str) -> str:
    """
    获取 assets 目录下资源的绝对路径
    
    Args:
        filename: 资源文件名（相对于 assets 目录）
        
    Returns:
        资源文件的绝对路径
        
    Note:
        此函数兼容 PyInstaller 打包后的路径解析
    """
    return get_resource_path(os.path.join("assets", filename))


class MainWindow:
    """
    PyQt6 主窗口管理类
    
    负责创建和管理应用程序的主窗口，包括:
        - 初始化 QApplication
        - 创建 QMainWindow 和 QWebEngineView
        - 设置 QWebChannel 通信
        - 加载前端 HTML 页面
        
    Attributes:
        api: API 实例，提供后端功能
        window: QMainWindow 实例
        web_view: QWebEngineView 实例
        channel: QWebChannel 实例
        api_wrapper: ApiWrapper 实例，用于暴露 API 给前端
    """
    
    def __init__(self):
        """初始化主窗口管理器"""
        # 初始化后端 API
        self.api = API()
        
        # 窗口和视图引用
        self.window = None
        self.web_view = None
        
        # WebChannel 相关
        self.channel = None
        self.api_wrapper = None
        self._front_debug = False

    def set_front_debug(self, enabled: bool):
        """启用或禁用前端调试模式"""
        self._front_debug = enabled

    def run(self) -> int:
        """
        启动应用程序主循环
        
        创建并显示主窗口，加载前端页面，启动 Qt 事件循环。
        
        Returns:
            应用程序退出代码（0 表示正常退出）
        """
        # 创建 QApplication 实例
        # QApplication 是 Qt 应用程序的核心，管理 GUI 应用程序的控制流和主要设置
        app = QApplication(sys.argv)
        app.setApplicationName("HTML PPT 编辑器")

        # 创建主窗口
        main_window = QMainWindow()
        main_window.setWindowTitle("HTML PPT 编辑器")
        main_window.resize(1400, 900)  # 默认窗口大小
        main_window.setMinimumSize(1024, 768)  # 最小窗口大小

        # 创建中央部件和布局
        # QMainWindow 需要一个中央部件来容纳其他控件
        central_widget = QWidget()
        main_window.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)  # 移除边距，让 WebView 填满窗口

        # 创建 QWebEngineView
        # QWebEngineView 基于 Chromium，提供现代 Web 浏览器功能
        self.web_view = QWebEngineView()
        
        # 使用自定义的 WebEnginePage 来捕获 JS 控制台输出
        self.web_page = WebEnginePage(self.web_view)
        self.web_view.setPage(self.web_page)
        
        # 配置 WebEngine 设置
        # 获取页面的 profile 和 settings 对象
        profile = self.web_view.page().profile()
        settings = profile.settings()
        
        # 启用必要的 Web 功能
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)  # 启用本地存储
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)  # 启用 JavaScript
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowWindowActivationFromJavaScript, True)  # 允许 JS 激活窗口

        # 设置 QWebChannel
        # QWebChannel 允许 Qt 和 JavaScript 之间的双向通信
        self.channel = QWebChannel()
        
        # 创建 API 包装器并注册到 Channel
        # 注册名称 'pyApi' 将在前端通过 window.pyApi 访问
        self.api_wrapper = ApiWrapper(self.api, self.web_view, main_window)
        self.api.set_file_dialog_parent(main_window)
        self.channel.registerObject('pyApi', self.api_wrapper)
        
        # 调试：打印注册的对象
        print(f"[PyQt6] 注册的 API 对象: pyApi")
        print(f"[PyQt6] API 方法: {[m for m in dir(self.api_wrapper) if not m.startswith('_')]}")
        
        # 将 Channel 绑定到页面
        self.web_view.page().setWebChannel(self.channel)

        # 额外的页面设置
        self.web_view.page().settings().setAttribute(
            QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True
        )

        # 加载前端 HTML 页面
        # 使用 QUrl.fromLocalFile 加载本地文件
        # 注意：必须在设置 WebChannel 之后加载页面
        html_path = get_asset_path("index.html")
        html_url = QUrl.fromLocalFile(html_path)
        
        # 如果启用了前端调试模式，添加 URL 参数
        if hasattr(self, '_front_debug') and self._front_debug:
            url_query = QUrlQuery()
            url_query.addQueryItem("debug", "true")
            html_url.setQuery(url_query)
            print("[PyQt6] 前端调试模式已启用")
        
        self.web_view.setUrl(html_url)

        # 将 WebView 添加到布局
        layout.addWidget(self.web_view)

        # 显示主窗口（最大化）
        main_window.showMaximized()

        # 保存窗口引用
        self.window = main_window
        
        # 启动 Qt 事件循环
        # app.exec() 会阻塞，直到窗口关闭
        return app.exec()

    def close(self):
        """关闭主窗口"""
        if self.window:
            self.window.close()


class ApiWrapper(QObject):
    """
    API 包装器类
    
    将后端 API 方法包装为 Qt 槽函数，使其可以通过 QWebChannel
    被 JavaScript 调用。
    
    所有使用 @Slot 装饰器的方法都可以在前端通过
    window.pyApi.methodName() 调用。
    
    Attributes:
        api: API 实例
        web_view: QWebEngineView 实例（用于可能的回调）
    """
    
    def __init__(self, api, web_view, window=None):
        """
        初始化 API 包装器
        
        Args:
            api: API 实例
            web_view: QWebEngineView 实例
            window: 主窗口实例（可选）
        """
        super().__init__()
        self.api = api
        self.web_view = web_view
        self.window = window

    # ==================== 演示文稿操作 ====================
    
    @Slot(result='QVariant')
    def get_presentation(self):
        """
        获取当前演示文稿数据
        
        Returns:
            包含演示文稿完整数据的字典
        """
        return self.api.get_presentation()

    @Slot(result='QVariant')
    def new_presentation(self):
        """
        创建新的演示文稿
        
        Returns:
            新演示文稿的数据
        """
        return self.api.new_presentation()

    @Slot(str, result='QVariant')
    def load_presentation(self, json_data: str):
        """
        从 JSON 字符串加载演示文稿
        
        Args:
            json_data: JSON 格式的演示文稿数据
            
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_presentation(json_data)

    @Slot(result=str)
    def save_presentation(self) -> str:
        """
        保存演示文稿为 JSON 字符串
        
        Returns:
            JSON 格式的演示文稿数据
        """
        return self.api.save_presentation()

    # ==================== 幻灯片操作 ====================
    
    @Slot(str, result='QVariant')
    def add_slide(self, after_slide_id: str = None):
        return self.api.add_slide(after_slide_id)
    
    @Slot(str, str, result='QVariant')
    def add_slide_with_layout(self, after_slide_id: str, layout: str):
        return self.api.add_slide(after_slide_id, layout)

    @Slot(str, result='QVariant')
    def remove_slide(self, slide_id: str):
        return self.api.remove_slide(slide_id)

    @Slot(str, result='QVariant')
    def duplicate_slide(self, slide_id: str):
        return self.api.duplicate_slide(slide_id)

    @Slot(int, int, result='QVariant')
    def move_slide(self, from_index: int, to_index: int):
        return self.api.move_slide(from_index, to_index)

    @Slot(int, result='QVariant')
    def set_current_slide(self, index: int):
        return self.api.set_current_slide(index)
    
    @Slot(result='QVariant')
    def get_layout_templates(self):
        return self.api.get_layout_templates()
    
    @Slot(str, result='QVariant')
    def set_default_layout(self, layout: str):
        return self.api.set_default_layout(layout)
    
    @Slot(str, str, result='QVariant')
    def change_slide_layout(self, slide_id: str, layout: str):
        return self.api.change_slide_layout(slide_id, layout)

    # ==================== 母版操作 ====================

    @Slot(result='QVariant')
    def get_slide_masters(self):
        """获取所有母版"""
        return self.api.get_slide_masters()

    @Slot(str, result='QVariant')
    def get_slide_master(self, master_id: str):
        """获取指定母版"""
        return self.api.get_slide_master(master_id)

    @Slot('QVariant', result='QVariant')
    def add_slide_master(self, master):
        """添加新母版"""
        return self.api.add_slide_master(master)

    @Slot(str, 'QVariant', result='QVariant')
    def update_slide_master(self, master_id: str, master):
        """更新母版"""
        return self.api.update_slide_master(master_id, master)

    @Slot(str, result='QVariant')
    def delete_slide_master(self, master_id: str):
        """删除母版"""
        return self.api.delete_slide_master(master_id)

    @Slot(str, str, result='QVariant')
    def apply_master_to_slide(self, slide_id: str, master_id: str):
        """将母版应用到幻灯片"""
        return self.api.apply_master_to_slide(slide_id, master_id)

    # ==================== 元素操作 ====================
    
    @Slot(str, str, result='QVariant')
    def add_element(self, slide_id: str, element_type: str):
        """
        向幻灯片添加元素
        
        Args:
            slide_id: 幻灯片 ID
            element_type: 元素类型（text, shape, image 等）
            
        Returns:
            包含新元素和更新后演示文稿的字典
        """
        return self.api.add_element(slide_id, element_type)

    @Slot(str, str, 'QVariant', result='QVariant')
    def update_element(self, slide_id: str, element_id: str, style):
        """
        更新元素样式
        
        Args:
            slide_id: 幻灯片 ID
            element_id: 元素 ID
            style: 新的样式字典
            
        Returns:
            包含更新后元素和演示文稿的字典
        """
        return self.api.update_element(slide_id, element_id, style)

    @Slot(str, str, result='QVariant')
    def remove_element(self, slide_id: str, element_id: str):
        """
        删除元素
        
        Args:
            slide_id: 幻灯片 ID
            element_id: 元素 ID
            
        Returns:
            包含 success 和更新后演示文稿的字典
        """
        return self.api.remove_element(slide_id, element_id)

    @Slot(str, str, result='QVariant')
    def duplicate_element(self, slide_id: str, element_id: str):
        """
        复制元素
        
        Args:
            slide_id: 幻灯片 ID
            element_id: 元素 ID
            
        Returns:
            包含新元素和更新后演示文稿的字典
        """
        return self.api.duplicate_element(slide_id, element_id)

    # ==================== 元数据操作 ====================
    
    @Slot(str, 'QVariant', result='QVariant')
    def update_slide_metadata(self, slide_id: str, metadata):
        """
        更新幻灯片元数据
        
        Args:
            slide_id: 幻灯片 ID
            metadata: 新的元数据字典
            
        Returns:
            包含 success 和更新后演示文稿的字典
        """
        return self.api.update_slide_metadata(slide_id, metadata)

    @Slot('QVariant', result='QVariant')
    def update_presentation_metadata(self, metadata):
        """
        更新演示文稿元数据
        
        Args:
            metadata: 新的元数据字典
            
        Returns:
            包含 success 和更新后演示文稿的字典
        """
        return self.api.update_presentation_metadata(metadata)

    # ==================== 导出操作 ====================
    
    @Slot(result=str)
    def export_html(self) -> str:
        """
        导出为 HTML 字符串
        
        Returns:
            完整的 HTML 文档字符串
        """
        return self.api.export_html()

    @Slot(result=str)
    def export_single_file(self) -> str:
        """
        导出为单文件 HTML
        
        Returns:
            包含所有资源的单文件 HTML 字符串
        """
        return self.api.export_single_file()

    @Slot(result='QVariant')
    def export_images(self):
        """
        导出为图片
        
        Returns:
            包含 success 和 paths 的字典
        """
        return self.api.export_images()

    @Slot(str, result='QVariant')
    def export_images_to_dir(self, output_dir: str):
        """
        导出为图片到指定目录
        
        Args:
            output_dir: 输出目录
            
        Returns:
            包含 success 和 paths 的字典
        """
        return self.api.export_images(output_dir)

    @Slot(result='QVariant')
    def print_presentation(self):
        """
        打印演示文稿
        
        Returns:
            包含 success 的字典
        """
        return self.api.print_presentation()

    # ==================== 撤销/重做操作 ====================
    
    @Slot(result='QVariant')
    def undo(self):
        """
        撤销上一步操作
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.undo()

    @Slot(result='QVariant')
    def redo(self):
        """
        重做已撤销的操作
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.redo()

    # ==================== 文件操作 ====================

    @Slot(result='QVariant')
    def save_to_file(self):
        """
        保存演示文稿到文件（弹出对话框）
        
        Returns:
            包含 success 和 file_path/message 的字典
        """
        return self.api.save_to_file()

    @Slot(str, result='QVariant')
    def save_to_file_path(self, file_path: str):
        """
        保存演示文稿到指定路径
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 file_path/message 的字典
        """
        return self.api.save_to_file(file_path)

    @Slot(result='QVariant')
    def load_from_file(self):
        """
        从文件加载演示文稿（弹出对话框）
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_from_file()

    @Slot(str, result='QVariant')
    def load_from_file_path(self, file_path: str):
        """
        从指定路径加载演示文稿
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_from_file(file_path)

    # ==================== 工程文件操作 ====================

    @Slot(result='QVariant')
    def save_project(self):
        """
        保存为工程文件（.hppt 格式，ZIP 压缩包）
        
        所有资源（图片、视频、音频）都会嵌入到文件中。
        .hppt 是 HTML PPT 的专属格式，不会被其他软件误打开。
        
        Returns:
            包含 success 和 path 的字典
        """
        return self.api.save_project()

    @Slot(str, result='QVariant')
    def save_project_to_path(self, file_path: str):
        """
        保存工程文件到指定路径
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 path 的字典
        """
        return self.api.save_project(file_path)

    @Slot(result='QVariant')
    def load_project(self):
        """
        从工程文件加载演示文稿（.hppt 格式）
        
        Returns:
            包含 success 和 presentation 的字典
        """
        return self.api.load_project()

    @Slot(str, result='QVariant')
    def load_project_from_path(self, file_path: str):
        """
        从指定工程文件路径加载
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 presentation 的字典
        """
        return self.api.load_project(file_path)

    @Slot(result='QVariant')
    def export_project_to_folder(self):
        """
        导出为工程文件夹（解压状态）
        
        Returns:
            包含 success 和 path 的字典
        """
        return self.api.export_project_to_folder()

    # ==================== 动画操作 ====================

    @Slot(str, str, str, result='QVariant')
    def set_element_animation(self, slide_id: str, element_id: str, animation_type: str):
        """
        设置元素动画
        
        Args:
            slide_id: 幻灯片 ID
            element_id: 元素 ID
            animation_type: 动画类型
            
        Returns:
            包含 success 和 element/presentation 的字典
        """
        return self.api.set_element_animation(slide_id, element_id, animation_type)

    # ==================== 元素层级操作 ====================

    @Slot(str, str, str, result='QVariant')
    def reorder_element(self, slide_id: str, element_id: str, direction: str):
        """
        调整元素层级
        
        Args:
            slide_id: 幻灯片 ID
            element_id: 元素 ID
            direction: 方向
            
        Returns:
            包含 success 和 presentation 的字典
        """
        return self.api.reorder_element(slide_id, element_id, direction)

    # ==================== 对齐操作 ====================

    @Slot(str, 'QVariant', str, result='QVariant')
    def align_elements(self, slide_id: str, element_ids, align_type: str):
        """
        对齐多个元素
        
        Args:
            slide_id: 幻灯片 ID
            element_ids: 元素 ID 列表
            align_type: 对齐类型
            
        Returns:
            包含 success 和 presentation 的字典
        """
        return self.api.align_elements(slide_id, list(element_ids), align_type)

    # ==================== 剪贴板操作 ====================

    @Slot(str, 'QVariant', result='QVariant')
    def copy_elements(self, slide_id: str, element_ids):
        """
        复制元素到剪贴板
        
        Args:
            slide_id: 幻灯片 ID
            element_ids: 元素 ID 列表
            
        Returns:
            包含 success 和 count 的字典
        """
        return self.api.copy_elements(slide_id, list(element_ids))

    @Slot(str, result='QVariant')
    def paste_elements(self, target_slide_id: str):
        """
        粘贴剪贴板中的元素
        
        Args:
            target_slide_id: 目标幻灯片 ID
            
        Returns:
            包含 success 和 elements/presentation 的字典
        """
        return self.api.paste_elements(target_slide_id)

    @Slot(result='QVariant')
    def get_clipboard(self):
        """
        获取剪贴板内容
        
        Returns:
            包含 success 和 clipboard 的字典
        """
        return self.api.get_clipboard()

    @Slot(result='QVariant')
    def clear_clipboard(self):
        """
        清空剪贴板
        
        Returns:
            包含 success 的字典
        """
        return self.api.clear_clipboard()

    # ==================== 用户设置 ====================

    @Slot(result='QVariant')
    def get_user_name(self):
        """
        获取用户名
        
        Returns:
            用户名字符串
        """
        return self.api.get_user_name()

    @Slot(str, result='QVariant')
    def set_user_name(self, name: str):
        """
        设置用户名
        
        Args:
            name: 用户名
            
        Returns:
            包含 success 和 userName 的字典
        """
        return self.api.set_user_name(name)

    # ==================== 最近文件 ====================

    @Slot(result='QVariant')
    def get_recent_files(self):
        """
        获取最近文件列表
        
        Returns:
            包含 success 和 files 的字典
        """
        return self.api.get_recent_files()

    @Slot(str, result='QVariant')
    def add_recent_file(self, path: str):
        """
        添加到最近文件列表
        
        Args:
            path: 文件路径
            
        Returns:
            包含 success 的字典
        """
        return self.api.add_recent_file(path)

    @Slot(int, result='QVariant')
    def remove_recent_file(self, index: int):
        """
        从最近文件列表移除
        
        Args:
            index: 文件索引
            
        Returns:
            包含 success 的字典
        """
        return self.api.remove_recent_file(index)

    @Slot(str, result='QVariant')
    def check_file_exists(self, path: str):
        """
        检查文件是否存在
        
        Args:
            path: 文件路径
            
        Returns:
            包含 success 和 exists 的字典
        """
        return self.api.check_file_exists(path)

    # ==================== 日志操作 ====================

    @Slot(str, str, str, str, result='QVariant')
    def write_log(self, level: str, module: str, message: str, data: str = ""):
        """
        写入日志到文件
        
        Args:
            level: 日志级别
            module: 模块名称
            message: 日志消息
            data: 额外数据
            
        Returns:
            包含 success 的字典
        """
        return self.api.write_log(level, module, message, data)

    @Slot(result='QVariant')
    def clear_log(self):
        """清空日志文件"""
        return self.api.clear_log()

    @Slot(result='QVariant')
    def is_packaged(self):
        """检查是否在打包环境中运行"""
        return self.api.is_packaged()

    # ==================== 放映操作 ====================

    @Slot(int, result='QVariant')
    def start_presentation(self, start_slide: int = 0):
        """
        启动全屏放映窗口
        
        创建一个新的独立全屏窗口用于演示幻灯片。
        该窗口与编辑器窗口完全独立，提供沉浸式的演示体验。
        
        功能特点:
            - 独立窗口: 不影响编辑器窗口的正常使用
            - 全屏显示: 自动进入全屏模式，类似浏览器 F11 效果
            - 无边框: 移除标题栏和边框，最大化显示区域
            - 自适应缩放: 幻灯片内容自动填满整个屏幕
            - 快捷键支持: ESC 退出，F11 切换全屏
        
        Args:
            start_slide (int, optional): 起始幻灯片索引。
                - 0: 从第一页开始（默认）
                - N: 从第 N+1 页开始
                - 通常传入当前编辑的幻灯片索引
        
        Returns:
            dict: 包含执行结果的字典
                - success (bool): 是否成功启动
                - message (str): 如果失败，包含错误信息
        
        Example:
            # 从第一页开始放映
            result = await pyApi.start_presentation(0)
            
            # 从当前幻灯片开始放映
            current_index = 3
            result = await pyApi.start_presentation(current_index)
        
        Note:
            - 放映窗口是独立的 QMainWindow 实例
            - 窗口引用保存在 self._presentation_window 中
            - 每次调用会创建新窗口，旧窗口会被替换
        """
        try:
            # 导出当前演示文稿为 HTML
            html_content = self.api.export_html()
            
            # 创建全屏放映窗口
            self._presentation_window = PresentationWindow(html_content, start_slide)
            
            # 显示窗口（会自动进入全屏模式）
            self._presentation_window.show()
            
            return {"success": True}
        except Exception as e:
            # 记录错误日志
            print(f"[PyQt6] 启动放映失败: {e}")
            return {"success": False, "message": str(e)}

    @Slot(result='QVariant')
    def close_window(self):
        """
        关闭主窗口
        
        关闭整个应用程序窗口。
        
        Returns:
            dict: 包含执行结果的字典
                - success (bool): 是否成功关闭
        """
        try:
            if self.window:
                self.window.close()
            return {"success": True}
        except Exception as e:
            print(f"[PyQt6] 关闭窗口失败: {e}")
            return {"success": False, "message": str(e)}

    @Slot(result='QVariant')
    def export_pdf(self):
        """
        导出演示文稿为 PDF 文件
        
        Returns:
            dict: 包含执行结果的字典
        """
        try:
            result = self.api.export_pdf()
            return result
        except Exception as e:
            print(f"[PyQt6] PDF导出失败: {e}")
            return {"success": False, "message": str(e)}


def parse_args():
    """
    解析命令行参数
    
    使用 argparse 模块解析命令行参数，支持多种运行模式和调试选项。
    
    Returns:
        argparse.Namespace: 解析后的参数对象，包含以下属性：
        
        基本参数:
            - dev (bool): 启用开发者模式
            - -auto_test (bool): 自动测试模式
            - new_slides (int): 自动创建的幻灯片数量
            - layout (str): 新建幻灯片的版式
            - export (str): 导出路径
            - open_file (str): 打开的项目文件路径
            - headless (bool): 无头模式
            - demo (bool): 演示模式
            - preview (bool): 自动打开放映预览
            - preview_slide (int): 放映起始幻灯片索引
        
        调试参数:
            - debug (bool): 启用 Debug 模式
            - debug_level (str): Debug 日志级别
            - auto_inspect (bool): 自动检查状态
            - debug_stats (bool): 显示 Debug 统计
            - front_debug (bool): 前端调试模式
        
        测试参数:
            - api_test (bool): 运行 API 测试
            - benchmark (int): 性能基准测试迭代次数
            - export_debug (str): 调试信息导出路径
        
        启动场景参数:
            - skip_welcome (bool): 跳过欢迎页
            - quick_start (bool): 快速启动模式
        
        示例生成参数:
            - create_examples (bool): 创建所有示例
            - create_intro (bool): 创建软件介绍 PPT
            - create_demo (bool): 创建功能演示 PPT
            - create_minimal (bool): 创建最小测试 PPT
    
    Example:
        >>> args = parse_args()
        >>> if args.dev:
        ...     print("开发者模式已启用")
    """
    parser = argparse.ArgumentParser(description='HTML PPT 编辑器 - 演示文稿制作工具')
    parser.add_argument('--dev', action='store_true', help='启用开发者模式')
    parser.add_argument('--auto-test', action='store_true', help='自动测试模式：自动创建所有版式的幻灯片')
    parser.add_argument('--new-slides', type=int, default=0, help='自动创建指定数量的幻灯片')
    parser.add_argument('--layout', type=str, default='title_subtitle', 
                        choices=['title_subtitle', 'title_content', 'title_content_divider', 'two_column', 'section_header', 'blank'],
                        help='指定新建幻灯片的版式')
    parser.add_argument('--export', type=str, default=None, help='导出演示文稿到指定路径')
    parser.add_argument('--open', type=str, default=None, dest='open_file', help='打开指定的项目文件 (.pptjson)')
    parser.add_argument('--headless', action='store_true', help='无头模式：不显示窗口，仅执行命令')
    parser.add_argument('--demo', action='store_true', help='演示模式：创建示例演示文稿')
    parser.add_argument('--preview', action='store_true', help='自动打开放映预览模式')
    parser.add_argument('--preview-slide', type=int, default=0, help='从指定幻灯片开始放映（默认第1页）')
    
    # Debug 相关参数
    parser.add_argument('--debug', action='store_true', help='启用 Debug 模式（最小单元格级别日志）')
    parser.add_argument('--debug-level', type=str, default='INFO',
                        choices=['DEBUG', 'INFO', 'WARN', 'ERROR'],
                        help='设置 Debug 日志级别 (默认: INFO)')
    parser.add_argument('--auto-inspect', action='store_true', help='自动检查状态：启动后定时输出程序状态')
    parser.add_argument('--debug-stats', action='store_true', help='启动时显示 Debug 统计信息')
    parser.add_argument('--front-debug', action='store_true', help='启用前端调试模式（输出详细前端日志）')
    
    # API 测试参数
    parser.add_argument('--api-test', action='store_true', help='运行 API 测试套件')
    parser.add_argument('--benchmark', type=int, nargs='?', const=100, metavar='N',
                        help='运行性能基准测试（默认 100 次迭代）')
    parser.add_argument('--export-debug', type=str, nargs='?', const='debug_info.json', metavar='PATH',
                        help='导出调试信息到文件')
    
    # 启动场景参数
    parser.add_argument('--skip-welcome', action='store_true', help='跳过欢迎页，直接进入编辑场景')
    parser.add_argument('--quick-start', action='store_true', help='快速启动：跳过欢迎页并创建新演示文稿')
    
    # 示例生成参数
    parser.add_argument('--create-examples', action='store_true', help='创建示例 PPT 文件到 examples 目录')
    parser.add_argument('--create-intro', action='store_true', help='创建软件介绍 PPT')
    parser.add_argument('--create-demo', action='store_true', help='创建功能演示 PPT')
    parser.add_argument('--create-minimal', action='store_true', help='创建最小测试 PPT')
    
    return parser.parse_args()


class DevModeController:
    """
    开发者模式控制器 - 增强版（含最小单元格 Debug）
    
    提供开发者模式下的各种调试、测试和自动化功能。
    通过命令行参数触发不同的开发者命令。
    
    主要功能:
        - Debug 模式: 启用详细日志记录和状态检查
        - 自动测试: 创建所有版式的幻灯片进行测试
        - 性能基准: 测试 API 调用性能
        - 示例生成: 创建示例演示文稿
        - 预览模式: 自动启动放映预览
    
    Attributes:
        api (ApiWrapper): API 包装器实例
        main_window (QMainWindow): 主窗口实例
        test_results (list): 测试结果列表
        debug_enabled (bool): Debug 模式是否启用
        auto_inspect (bool): 是否自动检查状态
        tracers (dict): 模块追踪器字典
    
    Example:
        >>> dev_controller = DevModeController(api_wrapper, main_window)
        >>> dev_controller.enable_debug(level='DEBUG', auto_inspect=True)
        >>> dev_controller.run_auto_test()
    """
    
    def __init__(self, api_wrapper, main_window):
        """
        初始化开发者模式控制器
        
        Args:
            api_wrapper: API 包装器实例，用于调用后端 API
            main_window: 主窗口实例，用于访问 UI 组件
        """
        self.api = api_wrapper
        self.main_window = main_window
        self.test_results = []
        self.debug_enabled = False
        self.auto_inspect = False
        self.tracers = {}
        
    def enable_debug(self, level='INFO', auto_inspect=False):
        """
        启用 Debug 模式
        
        启用详细的日志记录功能，可选择自动检查状态。
        
        Args:
            level (str): 日志级别，可选值: DEBUG, INFO, WARN, ERROR
            auto_inspect (bool): 是否启用自动状态检查，默认 False
        
        Note:
            启用后，DebugLogger 会记录所有日志到历史记录中，
            可以通过 show_debug_stats() 查看统计信息。
        """
        self.debug_enabled = True
        self.auto_inspect = auto_inspect
        DebugLogger.enable(level)
        
        print("\n" + "="*60)
        print("  [开发者模式] Debug 系统已启用")
        print(f"  日志级别: {level}")
        print(f"  自动检查: {'开启' if auto_inspect else '关闭'}")
        print("="*60 + "\n")
        
        if auto_inspect:
            QTimer.singleShot(3000, self.inspect_state)
            
    def disable_debug(self):
        """禁用 Debug 模式"""
        self.debug_enabled = False
        DebugLogger.disable()
        
    def get_tracer(self, module_name):
        """
        获取或创建追踪器
        
        追踪器用于记录 API 调用的统计信息，包括调用次数、
        成功率等。
        
        Args:
            module_name (str): 模块名称，用于标识追踪器
        
        Returns:
            DebugTracer: 追踪器实例
        """
        if module_name not in self.tracers:
            self.tracers[module_name] = DebugTracer(module_name)
        return self.tracers[module_name]
        
    def inspect_state(self):
        """
        检查当前状态 - 主动性查看
        
        打印当前演示文稿的状态信息，包括：
            - 元数据（标题、作者）
            - 幻灯片数量和详情
            - API 调用统计
        
        如果启用了 auto_inspect，会定时自动执行状态检查。
        """
        if not self.debug_enabled:
            return
            
        print("\n" + "="*60)
        print("  [Debug] 自动状态检查")
        print("="*60)
        
        try:
            presentation = self.api.api.get_presentation()
            slides = presentation.get('slides', [])
            metadata = presentation.get('metadata', {})
            
            print(f"\n  📊 演示文稿状态:")
            print(f"     标题: {metadata.get('title', '未命名')}")
            print(f"     作者: {metadata.get('author', '未知')}")
            print(f"     幻灯片数量: {len(slides)}")
            
            if slides:
                print(f"\n  📑 幻灯片详情:")
                for i, slide in enumerate(slides[:5]):
                    elements = slide.get('elements', [])
                    layout = slide.get('metadata', {}).get('layout', 'unknown')
                    print(f"     [{i+1}] ID: {slide.get('id', 'N/A')[:20]}... | 版式: {layout} | 元素: {len(elements)}")
                if len(slides) > 5:
                    print(f"     ... 还有 {len(slides) - 5} 张幻灯片")
                    
            print(f"\n  🔍 API 调用统计:")
            for name, tracer in self.tracers.items():
                stats = tracer.get_stats()
                print(f"     {stats['module']}: {stats['call_count']} 次调用, 成功率 {stats['success_rate']}")
                
        except Exception as e:
            DebugLogger.error('DevModeController', '状态检查失败', str(e))
            
        print("="*60 + "\n")
        
        if self.auto_inspect:
            QTimer.singleShot(5000, self.inspect_state)
        
    def run_auto_test(self):
        """运行自动化测试：创建所有版式的幻灯片"""
        tracer = self.get_tracer('AutoTest')
        
        print("\n" + "="*60)
        print("[开发者模式] 开始自动化测试...")
        print("="*60)
        
        layouts = ['title_subtitle', 'title_content', 'title_content_divider', 'two_column', 'section_header', 'blank']
        
        for i, layout in enumerate(layouts):
            print(f"\n[测试 {i+1}/{len(layouts)}] 创建版式: {layout}")
            try:
                result = self.api.add_slide_with_layout(None, layout)
                tracer.trace('add_slide_with_layout', {'layout': layout}, result)
                
                if result.get('success'):
                    print(f"  ✓ 成功创建幻灯片 (版式: {layout})")
                    self.test_results.append(('create_slide', layout, True))
                else:
                    print(f"  ✗ 创建失败: {result.get('message', '未知错误')}")
                    self.test_results.append(('create_slide', layout, False))
            except Exception as e:
                tracer.trace('add_slide_with_layout', {'layout': layout}, error=e)
                print(f"  ✗ 异常: {str(e)}")
                self.test_results.append(('create_slide', layout, False))
        
        print("\n" + "="*60)
        print("[开发者模式] 自动化测试完成!")
        print(f"  总计: {len(self.test_results)} 项测试")
        print(f"  成功: {sum(1 for r in self.test_results if r[2])} 项")
        print(f"  失败: {sum(1 for r in self.test_results if not r[2])} 项")
        print("="*60 + "\n")
        
    def create_demo_presentation(self):
        """创建演示文稿示例"""
        tracer = self.get_tracer('Demo')
        
        print("\n[开发者模式] 创建演示文稿示例...")
        
        layouts = ['title_subtitle', 'title_content', 'title_content_divider', 'two_column', 'section_header']
        for layout in layouts:
            try:
                result = self.api.add_slide_with_layout(None, layout)
                tracer.trace('add_slide_with_layout', {'layout': layout}, result)
                print(f"  ✓ 已创建: {layout}")
            except Exception as e:
                tracer.trace('add_slide_with_layout', {'layout': layout}, error=e)
                print(f"  ✗ 创建失败: {str(e)}")
        
        print("[开发者模式] 演示文稿创建完成!\n")
        
    def create_slides(self, count, layout):
        """创建指定数量的幻灯片"""
        tracer = self.get_tracer('CreateSlides')
        
        print(f"\n[开发者模式] 创建 {count} 张幻灯片 (版式: {layout})...")
        for i in range(count):
            try:
                result = self.api.add_slide_with_layout(None, layout)
                tracer.trace('add_slide_with_layout', {'layout': layout, 'index': i}, result)
                if result.get('success'):
                    print(f"  ✓ 幻灯片 {i+1}/{count} 创建成功")
            except Exception as e:
                tracer.trace('add_slide_with_layout', {'layout': layout, 'index': i}, error=e)
                print(f"  ✗ 幻灯片 {i+1}/{count} 创建失败: {str(e)}")
        print("[开发者模式] 完成!\n")
        
    def export_presentation(self, path):
        """导出演示文稿"""
        tracer = self.get_tracer('Export')
        
        print(f"\n[开发者模式] 导出演示文稿到: {path}")
        try:
            result = self.api.save_to_file_path(path)
            tracer.trace('save_to_file_path', {'path': path}, result)
            if result.get('success'):
                print(f"  ✓ 导出成功: {path}")
            else:
                print(f"  ✗ 导出失败: {result.get('message', '未知错误')}")
        except Exception as e:
            tracer.trace('save_to_file_path', {'path': path}, error=e)
            print(f"  ✗ 导出异常: {str(e)}")
            
    def show_debug_stats(self):
        """显示 Debug 统计信息"""
        print("\n" + "="*60)
        print("  [Debug] 统计信息")
        print("="*60)
        
        print(f"\n  📈 API 追踪统计:")
        for name, tracer in self.tracers.items():
            stats = tracer.get_stats()
            print(f"     {stats['module']}:")
            print(f"       - 调用次数: {stats['call_count']}")
            print(f"       - 错误次数: {stats['error_count']}")
            print(f"       - 成功率: {stats['success_rate']}")
            
        print(f"\n  📝 日志历史:")
        history = DebugLogger.get_history(limit=10)
        for log in history:
            print(f"     [{log['timestamp']}] {log['level']} - {log['module']}: {log['message'][:50]}")
            
        print("="*60 + "\n")
        
    def run_api_test(self):
        """运行 API 测试套件"""
        print("\n" + "="*60)
        print("  [开发者模式] 运行 API 测试")
        print("="*60)
        
        tester = APITester(self.api.api)
        results = tester.run_all_tests()
        
        # 保存测试报告
        report = tester.get_test_report()
        report_path = f"api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\n  测试报告已保存: {report_path}")
        except Exception as e:
            print(f"\n  保存报告失败: {e}")
            
        return results
        
    def benchmark_api(self, iterations=100):
        """API 性能基准测试"""
        print("\n" + "="*60)
        print("  [开发者模式] API 性能基准测试")
        print(f"  迭代次数: {iterations}")
        print("="*60)
        
        import time
        
        # 测试 1: 创建幻灯片性能
        times = []
        for i in range(iterations):
            start = time.time()
            self.api.add_slide_with_layout(None, 'title_content')
            times.append(time.time() - start)
            
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print(f"\n  📊 创建幻灯片性能:")
        print(f"     平均: {avg_time*1000:.2f}ms")
        print(f"     最小: {min_time*1000:.2f}ms")
        print(f"     最大: {max_time*1000:.2f}ms")
        print(f"     总耗时: {sum(times):.3f}s")
        
        # 测试 2: 获取演示文稿性能
        times = []
        for i in range(iterations):
            start = time.time()
            self.api.get_presentation()
            times.append(time.time() - start)
            
        avg_time = sum(times) / len(times)
        print(f"\n  📊 获取演示文稿性能:")
        print(f"     平均: {avg_time*1000:.2f}ms")
        print(f"     最小: {min_time*1000:.2f}ms")
        print(f"     最大: {max_time*1000:.2f}ms")
        
        print("="*60 + "\n")
        
    def export_debug_info(self, path='debug_info.json'):
        """导出调试信息到文件"""
        debug_info = {
            'timestamp': datetime.now().isoformat(),
            'api_stats': {name: tracer.get_stats() for name, tracer in self.tracers.items()},
            'logs': DebugLogger.get_history(limit=100),
            'presentation': self.api.api.get_presentation()
        }
        
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(debug_info, f, ensure_ascii=False, indent=2, default=str)
            print(f"\n  ✓ 调试信息已导出: {path}")
        except Exception as e:
            print(f"\n  ✗ 导出失败: {e}")
            
    def create_example_intro(self):
        """创建软件介绍示例 PPT"""
        print("\n" + "="*60)
        print("  [开发者模式] 创建软件介绍 PPT")
        print("="*60)
        
        try:
            generator = ExampleGenerator()
            presentation = generator.create_software_intro()
            
            # 加载到当前 API
            json_data = json.dumps(presentation, ensure_ascii=False)
            result = self.api.api.load_presentation(json_data)
            
            if result.get('success'):
                print("  ✓ 软件介绍 PPT 已创建并加载")
                print(f"    幻灯片数量: {len(presentation['slides'])}")
            else:
                print(f"  ✗ 加载失败: {result.get('message')}")
                
        except Exception as e:
            print(f"  ✗ 创建失败: {e}")
            
    def create_example_demo(self):
        """创建功能演示示例 PPT"""
        print("\n" + "="*60)
        print("  [开发者模式] 创建功能演示 PPT")
        print("="*60)
        
        try:
            generator = ExampleGenerator()
            presentation = generator.create_feature_demo()
            
            # 加载到当前 API
            json_data = json.dumps(presentation, ensure_ascii=False)
            result = self.api.api.load_presentation(json_data)
            
            if result.get('success'):
                print("  ✓ 功能演示 PPT 已创建并加载")
                print(f"    幻灯片数量: {len(presentation['slides'])}")
            else:
                print(f"  ✗ 加载失败: {result.get('message')}")
                
        except Exception as e:
            print(f"  ✗ 创建失败: {e}")
            
    def create_example_minimal(self):
        """创建最小测试示例 PPT"""
        print("\n" + "="*60)
        print("  [开发者模式] 创建最小测试 PPT")
        print("="*60)
        
        try:
            generator = ExampleGenerator()
            presentation = generator.create_minimal_test()
            
            # 加载到当前 API
            json_data = json.dumps(presentation, ensure_ascii=False)
            result = self.api.api.load_presentation(json_data)
            
            if result.get('success'):
                print("  ✓ 最小测试 PPT 已创建并加载")
                print(f"    幻灯片数量: {len(presentation['slides'])}")
            else:
                print(f"  ✗ 加载失败: {result.get('message')}")
                
        except Exception as e:
            print(f"  ✗ 创建失败: {e}")
            
    def create_all_examples_to_files(self):
        """创建所有示例到文件"""
        print("\n" + "="*60)
        print("  [开发者模式] 创建所有示例文件")
        print("="*60)
        
        try:
            import os
            
            output_dir = "examples"
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
                
            generator = ExampleGenerator()
            
            # 创建软件介绍
            intro = generator.create_software_intro()
            intro_path = os.path.join(output_dir, "软件介绍.pptjson")
            generator.save_to_file(intro, intro_path)
            
            # 创建功能演示
            demo = generator.create_feature_demo()
            demo_path = os.path.join(output_dir, "功能演示.pptjson")
            generator.save_to_file(demo, demo_path)
            
            # 创建最小测试
            minimal = generator.create_minimal_test()
            minimal_path = os.path.join(output_dir, "最小测试.pptjson")
            generator.save_to_file(minimal, minimal_path)
            
            print(f"\n  ✓ 所有示例已创建完成")
            print(f"    输出目录: {os.path.abspath(output_dir)}")
            print(f"    文件数量: 3")
            
        except Exception as e:
            print(f"  ✗ 创建失败: {e}")
            
    def interactive_debug_shell(self):
        """启动交互式调试 shell"""
        print("\n" + "="*60)
        print("  [开发者模式] 交互式调试 Shell")
        print("="*60)
        print("  可用命令:")
        print("    api     - 访问 API 对象")
        print("    store   - 获取当前状态")
        print("    logs    - 查看日志历史")
        print("    stats   - 查看统计信息")
        print("    test    - 运行 API 测试")
        print("    exit    - 退出 shell")
        print("="*60 + "\n")
        
        # 注意：实际交互式 shell 需要在主线程外运行
        # 这里提供一个简化的命令执行接口
        self._debug_shell_active = True
        
    def execute_debug_command(self, command):
        """执行调试命令"""
        if not hasattr(self, '_debug_shell_active') or not self._debug_shell_active:
            return
            
        parts = command.strip().split()
        if not parts:
            return
            
        cmd = parts[0].lower()
        args = parts[1:]
        
        try:
            if cmd == 'api':
                print(f"API 对象: {self.api.api}")
                print(f"可用方法: {[m for m in dir(self.api.api) if not m.startswith('_')]}")
            elif cmd == 'store':
                state = self.api.api.get_presentation()
                print(json.dumps(state, indent=2, ensure_ascii=False, default=str)[:1000])
            elif cmd == 'logs':
                logs = DebugLogger.get_history(limit=20)
                for log in logs:
                    print(f"[{log['timestamp']}] {log['level']}: {log['message']}")
            elif cmd == 'stats':
                self.show_debug_stats()
            elif cmd == 'test':
                self.run_api_test()
            elif cmd == 'exit':
                self._debug_shell_active = False
                print("已退出调试 shell")
            else:
                print(f"未知命令: {cmd}")
        except Exception as e:
            print(f"执行错误: {e}")
        
    def start_preview(self, slide_index=0):
        """启动放映预览模式"""
        tracer = self.get_tracer('Preview')
        
        print("\n" + "="*60)
        print("  [开发者模式] 启动放映预览")
        print("="*60)
        print(f"  起始幻灯片: 第 {slide_index + 1} 页")
        print("="*60 + "\n")
        
        try:
            # 调用后端 API 启动放映
            result = self.api.start_presentation(slide_index)
            tracer.trace('start_presentation', {'slide_index': slide_index}, result)
            
            if result.get('success'):
                print(f"  ✓ 放映窗口已启动")
            else:
                print(f"  ✗ 启动失败: {result.get('message', '未知错误')}")
                # 如果后端启动失败，尝试通过前端启动
                self._start_preview_via_frontend(slide_index)
        except Exception as e:
            tracer.trace('start_presentation', {'slide_index': slide_index}, error=e)
            print(f"  ✗ 启动异常: {str(e)}")
            # 尝试通过前端启动
            self._start_preview_via_frontend(slide_index)
            
    def _start_preview_via_frontend(self, slide_index=0):
        """通过前端 JavaScript 启动预览模式"""
        print("  [备用方案] 尝试通过前端启动预览...")
        
        # 获取 web_view 并执行 JavaScript
        if self.main_window:
            web_view = None
            for child in self.main_window.findChildren(QWebEngineView):
                web_view = child
                break
                
            if web_view:
                # 执行 JavaScript 启动预览
                js_code = f"""
                (function() {{
                    if (window.store && window.store.setPreview) {{
                        window.store.setPreview(true, {slide_index});
                        console.log('[DevMode] 预览模式已通过前端启动');
                        return {{success: true}};
                    }} else {{
                        return {{success: false, message: 'store 未初始化'}};
                    }}
                }})();
                """
                web_view.page().runJavaScript(js_code, lambda result: print(f"  前端启动结果: {result}"))
            else:
                print("  ✗ 未找到 WebView 组件")


def main():
    """
    应用程序主入口函数
    
    初始化并启动 HTML PPT 编辑器应用程序。
    根据命令行参数执行不同的启动模式。
    
    启动流程:
        1. 解析命令行参数
        2. 创建 QApplication 实例
        3. 如果是无头模式，执行导出后退出
        4. 创建主窗口和 WebView 组件
        5. 配置 WebEngine 设置（本地存储、JavaScript 等）
        6. 设置 QWebChannel 通信
        7. 加载前端 HTML 页面
        8. 根据参数执行开发者命令
        9. 启动 Qt 事件循环
    
    支持的启动模式:
        - 正常模式: 显示欢迎页，用户手动操作
        - 开发者模式 (--dev): 启用调试功能
        - 快速启动 (--quick-start): 跳过欢迎页并创建新演示文稿
        - 无头模式 (--headless): 不显示窗口，执行命令后退出
        - 预览模式 (--preview): 自动打开放映预览
    
    Returns:
        int: 应用程序退出代码
            - 0: 正常退出
            - 非 0: 异常退出
    
    Example:
        # 正常启动
        $ python main.py
        
        # 开发者模式启动
        $ python main.py --dev
        
        # 快速启动并创建演示文稿
        $ python main.py --quick-start
        
        # 无头模式导出
        $ python main.py --headless --demo --export output.pptjson
    """
    args = parse_args()
    
    app = QApplication(sys.argv)
    app.setApplicationName("HTML PPT 编辑器")
    
    if args.headless and args.export:
        print("[无头模式] 导出演示文稿...")
        api = API()
        api.new_presentation()
        if args.demo or args.auto_test:
            layouts = ['title_subtitle', 'title_content', 'title_content_divider', 'two_column', 'section_header']
            for layout in layouts:
                api.add_slide(None, layout)
        result = api.save_to_file(args.export)
        if result.get('success'):
            print(f"✓ 导出成功: {args.export}")
        else:
            print(f"✗ 导出失败: {result.get('message', '未知错误')}")
        return 0
    
    main_window = QMainWindow()
    main_window.setWindowTitle("HTML PPT 编辑器" + (" [开发者模式]" if args.dev else ""))
    main_window.resize(1400, 900)
    main_window.setMinimumSize(1024, 768)

    central_widget = QWidget()
    main_window.setCentralWidget(central_widget)
    layout = QVBoxLayout(central_widget)
    layout.setContentsMargins(0, 0, 0, 0)

    web_view = QWebEngineView()
    web_page = WebEnginePage(web_view)
    web_view.setPage(web_page)
    
    profile = web_view.page().profile()
    settings = profile.settings()
    settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
    settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
    settings.setAttribute(QWebEngineSettings.WebAttribute.AllowWindowActivationFromJavaScript, True)

    channel = QWebChannel()
    api = API()
    api_wrapper = ApiWrapper(api, web_view)
    api.set_file_dialog_parent(main_window)
    channel.registerObject('pyApi', api_wrapper)
    
    web_view.page().setWebChannel(channel)
    web_view.page().settings().setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)

    html_path = get_asset_path("index.html")
    html_url = QUrl.fromLocalFile(html_path)
    
    # 构建 URL 参数
    url_query = QUrlQuery()
    need_query = False
    
    # 前端调试模式
    if args.front_debug:
        url_query.addQueryItem("debug", "true")
        need_query = True
        print("[PyQt6] 前端调试模式已启用")
    
    # 跳过欢迎页
    if args.skip_welcome or args.quick_start:
        url_query.addQueryItem("skip-welcome", "true")
        need_query = True
        print("[PyQt6] 跳过欢迎页")
    
    # 快速启动
    if args.quick_start:
        url_query.addQueryItem("quick-start", "true")
        need_query = True
        print("[PyQt6] 快速启动模式")
    
    if need_query:
        html_url.setQuery(url_query)
    
    web_view.setUrl(html_url)
    layout.addWidget(web_view)
    
    if args.dev:
        print("\n" + "="*60)
        print("  开发者模式已启用")
        print("  可用命令:")
        print("    --auto-test        自动创建所有版式幻灯片")
        print("    --demo             创建演示文稿示例")
        print("    --new-slides N     创建 N 张幻灯片")
        print("    --layout L         指定版式")
        print("    --export PATH      导出到路径")
        print("    --preview          自动打开放映预览")
        print("    --preview-slide N  从第 N 页开始放映")
        print("")
        print("  启动场景命令:")
        print("    --skip-welcome     跳过欢迎页，直接进入编辑")
        print("    --quick-start      快速启动：跳过欢迎页并创建新演示文稿")
        print("")
        print("  示例生成命令:")
        print("    --create-examples  创建所有示例 PPT 文件到 examples 目录")
        print("    --create-intro     创建软件介绍 PPT（7页）")
        print("    --create-demo      创建功能演示 PPT（4页）")
        print("    --create-minimal   创建最小测试 PPT（1页）")
        print("")
        print("  Debug 命令:")
        print("    --debug            启用 Debug 模式")
        print("    --debug-level L    设置日志级别 (DEBUG/INFO/WARN/ERROR)")
        print("    --auto-inspect     自动检查状态")
        print("    --debug-stats      显示 Debug 统计信息")
        print("    --front-debug      启用前端调试模式（输出详细前端日志）")
        print("")
        print("  API 测试命令:")
        print("    --api-test         运行 API 测试套件")
        print("    --benchmark [N]    运行性能基准测试 (默认 100 次)")
        print("    --export-debug [P] 导出调试信息到文件")
        print("="*60 + "\n")
    
    main_window.showMaximized()
    
    dev_controller = DevModeController(api_wrapper, main_window)
    
    def run_dev_commands():
        # 启用 Debug 模式（如果指定）
        if args.debug:
            dev_controller.enable_debug(level=args.debug_level, auto_inspect=args.auto_inspect)
        
        # 执行开发者命令
        if args.auto_test:
            dev_controller.run_auto_test()
        elif args.demo:
            dev_controller.create_demo_presentation()
        elif args.new_slides > 0:
            dev_controller.create_slides(args.new_slides, args.layout)
        if args.export:
            dev_controller.export_presentation(args.export)
            
        # 显示 Debug 统计（如果指定）
        if args.debug_stats and args.debug:
            dev_controller.show_debug_stats()
            
        # 运行 API 测试（如果指定）
        if args.api_test:
            dev_controller.run_api_test()
            
        # 运行性能基准测试（如果指定）
        if args.benchmark:
            dev_controller.benchmark_api(args.benchmark)
            
        # 导出调试信息（如果指定）
        if args.export_debug:
            dev_controller.export_debug_info(args.export_debug)
            
        # 快速启动：创建新演示文稿
        if args.quick_start:
            dev_controller.create_demo_presentation()
            
        # 创建示例 PPT
        if args.create_examples:
            dev_controller.create_all_examples_to_files()
        if args.create_intro:
            dev_controller.create_example_intro()
        if args.create_demo:
            dev_controller.create_example_demo()
        if args.create_minimal:
            dev_controller.create_example_minimal()
            
        # 自动打开放映预览（如果指定）
        if args.preview:
            # 延迟一点时间确保幻灯片已创建
            QTimer.singleShot(1000, lambda: dev_controller.start_preview(args.preview_slide))
    
    if args.dev or args.auto_test or args.demo or args.new_slides > 0 or args.debug or args.preview or args.api_test or args.benchmark or args.export_debug or args.skip_welcome or args.quick_start or args.create_examples or args.create_intro or args.create_demo or args.create_minimal:
        QTimer.singleShot(2000, run_dev_commands)
    
    return app.exec()


if __name__ == '__main__':
    main()
