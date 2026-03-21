"""
HTML PPT 编辑器 - PyQt6 主程序入口

本模块使用 PyQt6 和 QWebEngineView 创建桌面应用程序，
通过 QWebChannel 实现 Python 后端与 JavaScript 前端的通信。

主要功能:
    - 创建 PyQt6 主窗口
    - 加载 HTML/CSS/JavaScript 前端界面
    - 通过 QWebChannel 暴露 Python API 给前端调用
    - 支持演示文稿的创建、编辑、保存和导出

使用方法:
    python main.py

依赖:
    - PyQt6: GUI 框架
    - PyQt6-WebEngine: WebEngine 组件
    - api: 后端 API 模块
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from api import API, get_resource_path

from PyQt6.QtCore import QObject, pyqtSlot, QUrl, QVariant, Qt, QTimer
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtGui import QKeyEvent, QShortcut, QKeySequence


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
    """自定义 WebEnginePage 用于捕获 JavaScript 控制台输出"""
    
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        """重写控制台消息处理方法"""
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
        self.api_wrapper = ApiWrapper(self.api, self.web_view)
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
        self.web_view.setUrl(QUrl.fromLocalFile(html_path))

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
    
    所有使用 @pyqtSlot 装饰器的方法都可以在前端通过
    window.pyApi.methodName() 调用。
    
    Attributes:
        api: API 实例
        web_view: QWebEngineView 实例（用于可能的回调）
    """
    
    def __init__(self, api, web_view):
        """
        初始化 API 包装器
        
        Args:
            api: API 实例
            web_view: QWebEngineView 实例
        """
        super().__init__()
        self.api = api
        self.web_view = web_view

    # ==================== 演示文稿操作 ====================
    
    @pyqtSlot(result='QVariant')
    def get_presentation(self):
        """
        获取当前演示文稿数据
        
        Returns:
            包含演示文稿完整数据的字典
        """
        return self.api.get_presentation()

    @pyqtSlot(result='QVariant')
    def new_presentation(self):
        """
        创建新的演示文稿
        
        Returns:
            新演示文稿的数据
        """
        return self.api.new_presentation()

    @pyqtSlot(str, result='QVariant')
    def load_presentation(self, json_data: str):
        """
        从 JSON 字符串加载演示文稿
        
        Args:
            json_data: JSON 格式的演示文稿数据
            
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_presentation(json_data)

    @pyqtSlot(result=str)
    def save_presentation(self) -> str:
        """
        保存演示文稿为 JSON 字符串
        
        Returns:
            JSON 格式的演示文稿数据
        """
        return self.api.save_presentation()

    # ==================== 幻灯片操作 ====================
    
    @pyqtSlot(str, result='QVariant')
    def add_slide(self, after_slide_id: str = None):
        return self.api.add_slide(after_slide_id)
    
    @pyqtSlot(str, str, result='QVariant')
    def add_slide_with_layout(self, after_slide_id: str, layout: str):
        return self.api.add_slide(after_slide_id, layout)

    @pyqtSlot(str, result='QVariant')
    def remove_slide(self, slide_id: str):
        return self.api.remove_slide(slide_id)

    @pyqtSlot(str, result='QVariant')
    def duplicate_slide(self, slide_id: str):
        return self.api.duplicate_slide(slide_id)

    @pyqtSlot(int, int, result='QVariant')
    def move_slide(self, from_index: int, to_index: int):
        return self.api.move_slide(from_index, to_index)

    @pyqtSlot(int, result='QVariant')
    def set_current_slide(self, index: int):
        return self.api.set_current_slide(index)
    
    @pyqtSlot(result='QVariant')
    def get_layout_templates(self):
        return self.api.get_layout_templates()
    
    @pyqtSlot(str, result='QVariant')
    def set_default_layout(self, layout: str):
        return self.api.set_default_layout(layout)
    
    @pyqtSlot(str, str, result='QVariant')
    def change_slide_layout(self, slide_id: str, layout: str):
        return self.api.change_slide_layout(slide_id, layout)

    # ==================== 元素操作 ====================
    
    @pyqtSlot(str, str, result='QVariant')
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

    @pyqtSlot(str, str, 'QVariant', result='QVariant')
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

    @pyqtSlot(str, str, result='QVariant')
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

    @pyqtSlot(str, str, result='QVariant')
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
    
    @pyqtSlot(str, 'QVariant', result='QVariant')
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

    @pyqtSlot('QVariant', result='QVariant')
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
    
    @pyqtSlot(result=str)
    def export_html(self) -> str:
        """
        导出为 HTML 字符串
        
        Returns:
            完整的 HTML 文档字符串
        """
        return self.api.export_html()

    @pyqtSlot(result=str)
    def export_single_file(self) -> str:
        """
        导出为单文件 HTML
        
        Returns:
            包含所有资源的单文件 HTML 字符串
        """
        return self.api.export_single_file()

    # ==================== 撤销/重做操作 ====================
    
    @pyqtSlot(result='QVariant')
    def undo(self):
        """
        撤销上一步操作
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.undo()

    @pyqtSlot(result='QVariant')
    def redo(self):
        """
        重做已撤销的操作
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.redo()

    # ==================== 文件操作 ====================

    @pyqtSlot(result='QVariant')
    def save_to_file(self):
        """
        保存演示文稿到文件（弹出对话框）
        
        Returns:
            包含 success 和 file_path/message 的字典
        """
        return self.api.save_to_file()

    @pyqtSlot(str, result='QVariant')
    def save_to_file_path(self, file_path: str):
        """
        保存演示文稿到指定路径
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 file_path/message 的字典
        """
        return self.api.save_to_file(file_path)

    @pyqtSlot(result='QVariant')
    def load_from_file(self):
        """
        从文件加载演示文稿（弹出对话框）
        
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_from_file()

    @pyqtSlot(str, result='QVariant')
    def load_from_file_path(self, file_path: str):
        """
        从指定路径加载演示文稿
        
        Args:
            file_path: 文件路径
            
        Returns:
            包含 success 和 data/message 的字典
        """
        return self.api.load_from_file(file_path)

    # ==================== 动画操作 ====================

    @pyqtSlot(str, str, str, result='QVariant')
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

    @pyqtSlot(str, str, str, result='QVariant')
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

    @pyqtSlot(str, 'QVariant', str, result='QVariant')
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

    @pyqtSlot(str, 'QVariant', result='QVariant')
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

    @pyqtSlot(str, result='QVariant')
    def paste_elements(self, target_slide_id: str):
        """
        粘贴剪贴板中的元素
        
        Args:
            target_slide_id: 目标幻灯片 ID
            
        Returns:
            包含 success 和 elements/presentation 的字典
        """
        return self.api.paste_elements(target_slide_id)

    @pyqtSlot(result='QVariant')
    def get_clipboard(self):
        """
        获取剪贴板内容
        
        Returns:
            包含 success 和 clipboard 的字典
        """
        return self.api.get_clipboard()

    @pyqtSlot(result='QVariant')
    def clear_clipboard(self):
        """
        清空剪贴板
        
        Returns:
            包含 success 的字典
        """
        return self.api.clear_clipboard()

    # ==================== 用户设置 ====================

    @pyqtSlot(result='QVariant')
    def get_user_name(self):
        """
        获取用户名
        
        Returns:
            用户名字符串
        """
        return self.api.get_user_name()

    @pyqtSlot(str, result='QVariant')
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

    @pyqtSlot(result='QVariant')
    def get_recent_files(self):
        """
        获取最近文件列表
        
        Returns:
            包含 success 和 files 的字典
        """
        return self.api.get_recent_files()

    @pyqtSlot(str, result='QVariant')
    def add_recent_file(self, path: str):
        """
        添加到最近文件列表
        
        Args:
            path: 文件路径
            
        Returns:
            包含 success 的字典
        """
        return self.api.add_recent_file(path)

    @pyqtSlot(int, result='QVariant')
    def remove_recent_file(self, index: int):
        """
        从最近文件列表移除
        
        Args:
            index: 文件索引
            
        Returns:
            包含 success 的字典
        """
        return self.api.remove_recent_file(index)

    @pyqtSlot(str, result='QVariant')
    def check_file_exists(self, path: str):
        """
        检查文件是否存在
        
        Args:
            path: 文件路径
            
        Returns:
            包含 success 和 exists 的字典
        """
        return self.api.check_file_exists(path)

    # ==================== 放映操作 ====================

    @pyqtSlot(int, result='QVariant')
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

    @pyqtSlot(result='QVariant')
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


def parse_args():
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
    
    return parser.parse_args()


class DebugLogger:
    """最小单元格 Debug 日志器 - 可自由开关"""
    
    _instance = None
    _enabled = False
    _log_level = 'INFO'
    _log_history = []
    _max_history = 1000
    
    LEVELS = {'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def enable(cls, level='INFO'):
        """启用 Debug 输出"""
        cls._enabled = True
        cls._log_level = level
        print(f"\n[Debug] Debug 模式已启用 (级别: {level})")
        
    @classmethod
    def disable(cls):
        """禁用 Debug 输出"""
        cls._enabled = False
        print("\n[Debug] Debug 模式已禁用")
        
    @classmethod
    def is_enabled(cls):
        """检查是否启用"""
        return cls._enabled
        
    @classmethod
    def set_level(cls, level):
        """设置日志级别"""
        if level in cls.LEVELS:
            cls._log_level = level
            
    @classmethod
    def _should_log(cls, level):
        """检查是否应该记录该级别日志"""
        return cls._enabled and cls.LEVELS.get(level, 1) >= cls.LEVELS.get(cls._log_level, 1)
    
    @classmethod
    def log(cls, level, module, message, data=None):
        """记录日志"""
        if not cls._should_log(level):
            return
            
        timestamp = cls._get_timestamp()
        prefix = f"[{timestamp}] [{level}] [{module}]"
        
        if data is not None:
            print(f"{prefix} {message}", data)
        else:
            print(f"{prefix} {message}")
            
        cls._log_history.append({
            'timestamp': timestamp,
            'level': level,
            'module': module,
            'message': message,
            'data': data
        })
        
        if len(cls._log_history) > cls._max_history:
            cls._log_history.pop(0)
    
    @classmethod
    def debug(cls, module, message, data=None):
        """Debug 级别日志"""
        cls.log('DEBUG', module, message, data)
        
    @classmethod
    def info(cls, module, message, data=None):
        """Info 级别日志"""
        cls.log('INFO', module, message, data)
        
    @classmethod
    def warn(cls, module, message, data=None):
        """Warn 级别日志"""
        cls.log('WARN', module, message, data)
        
    @classmethod
    def error(cls, module, message, data=None):
        """Error 级别日志"""
        cls.log('ERROR', module, message, data)
    
    @classmethod
    def _get_timestamp(cls):
        """获取时间戳"""
        from datetime import datetime
        return datetime.now().strftime('%H:%M:%S.%f')[:-3]
    
    @classmethod
    def get_history(cls, level=None, limit=50):
        """获取日志历史"""
        logs = cls._log_history
        if level:
            logs = [l for l in logs if l['level'] == level]
        return logs[-limit:]
    
    @classmethod
    def clear_history(cls):
        """清空日志历史"""
        cls._log_history.clear()
        print("[Debug] 日志历史已清空")


class DebugTracer:
    """函数调用追踪器 - 最小单元格级别"""
    
    def __init__(self, module_name):
        self.module_name = module_name
        self.call_count = 0
        self.error_count = 0
        
    def trace(self, func_name, params=None, result=None, error=None):
        """追踪函数调用"""
        self.call_count += 1
        
        if error:
            self.error_count += 1
            DebugLogger.error(self.module_name, f"{func_name}() 调用失败", {
                'params': params,
                'error': str(error)
            })
        else:
            DebugLogger.debug(self.module_name, f"{func_name}() 调用成功", {
                'params': params,
                'result': result
            })
    
    def get_stats(self):
        """获取统计信息"""
        return {
            'module': self.module_name,
            'call_count': self.call_count,
            'error_count': self.error_count,
            'success_rate': f"{((self.call_count - self.error_count) / self.call_count * 100):.1f}%" if self.call_count > 0 else "N/A"
        }


class DevModeController:
    """开发者模式控制器 - 增强版（含最小单元格 Debug）"""
    
    def __init__(self, api_wrapper, main_window):
        self.api = api_wrapper
        self.main_window = main_window
        self.test_results = []
        self.debug_enabled = False
        self.auto_inspect = False
        self.tracers = {}
        
    def enable_debug(self, level='INFO', auto_inspect=False):
        """启用 Debug 模式"""
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
        """获取或创建追踪器"""
        if module_name not in self.tracers:
            self.tracers[module_name] = DebugTracer(module_name)
        return self.tracers[module_name]
        
    def inspect_state(self):
        """检查当前状态 - 主动性查看"""
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
    web_view.setUrl(QUrl.fromLocalFile(html_path))
    layout.addWidget(web_view)
    
    if args.dev:
        print("\n" + "="*60)
        print("  开发者模式已启用")
        print("  可用命令:")
        print("    --auto-test     自动创建所有版式幻灯片")
        print("    --demo          创建演示文稿示例")
        print("    --new-slides N  创建 N 张幻灯片")
        print("    --layout L      指定版式")
        print("    --export PATH   导出到路径")
        print("    --debug         启用 Debug 模式")
        print("    --debug-level L 设置日志级别 (DEBUG/INFO/WARN/ERROR)")
        print("    --auto-inspect  自动检查状态")
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
            
        # 自动打开放映预览（如果指定）
        if args.preview:
            # 延迟一点时间确保幻灯片已创建
            QTimer.singleShot(1000, lambda: dev_controller.start_preview(args.preview_slide))
    
    if args.dev or args.auto_test or args.demo or args.new_slides > 0 or args.debug or args.preview:
        QTimer.singleShot(2000, run_dev_commands)
    
    return app.exec()


if __name__ == '__main__':
    main()
