"""
HTML PPT 编辑器 - 导出工具

本模块提供将演示文稿导出为独立 HTML 文件的功能。

导出格式：
    - standalone_html: 独立 HTML 文件（包含所有资源内联）
    - player_html: 播放器 HTML 文件（仅播放功能）
    - zip_package: ZIP 打包（包含所有资源文件）

使用方法：
    from export_html import Exporter
    
    exporter = Exporter()
    html_content = exporter.export_standalone_html(presentation_data)
"""

import os
import sys
import json
import base64
from typing import Dict, Optional

try:
    from jinja2 import Environment, FileSystemLoader, Template
except ImportError:
    Environment = None
    FileSystemLoader = None
    Template = None


def get_resource_path(relative_path: str) -> str:
    """获取资源文件的绝对路径"""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), relative_path)


class Exporter:
    """
    演示文稿导出器
    
    支持将演示文稿导出为多种格式的 HTML 文件。
    """
    
    def __init__(self):
        """初始化导出器"""
        self.template_env = None
        self._init_templates()
    
    def _init_templates(self):
        """初始化 Jinja2 模板环境"""
        if Environment is None:
            return
        
        template_dir = get_resource_path("templates")
        if os.path.exists(template_dir):
            self.template_env = Environment(loader=FileSystemLoader(template_dir))
    
    def _read_file(self, file_path: str) -> str:
        """读取文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"[Exporter] 读取文件失败: {file_path}, {e}")
            return ""
    
    def _read_file_base64(self, file_path: str) -> str:
        """读取文件并转换为 base64"""
        try:
            with open(file_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            print(f"[Exporter] 读取文件失败: {file_path}, {e}")
            return ""
    
    def export_standalone_html(self, presentation_data: dict) -> str:
        """
        导出为独立 HTML 文件
        
        所有资源（CSS、JS、数据）都内联到 HTML 中，
        可以直接在浏览器中打开使用。
        
        Args:
            presentation_data: 演示文稿数据字典
            
        Returns:
            完整的 HTML 字符串
        """
        # 获取资源路径
        assets_dir = get_resource_path("assets")
        
        # 读取 CSS 文件
        css_content = self._read_file(os.path.join(assets_dir, "css", "main.css"))
        
        # 读取 JS 文件
        js_files = [
            "libs/fabric.min.js",
            "js/modules/translations.js",
            "js/modules/store.js",
            "js/modules/pybridge.js",
            "js/modules/storage.js",
            "js/modules/link-modal.js",
            "js/modules/context-menu.js",
            "js/modules/canvas.js",
            "js/modules/property-panel.js",
            "js/modules/slides-panel.js",
            "js/modules/preview.js",
            "js/modules/toolbar.js",
            "js/app.js"
        ]
        
        js_content = ""
        for js_file in js_files:
            js_content += f"\n// ===== {js_file} =====\n"
            js_content += self._read_file(os.path.join(assets_dir, js_file))
        
        # 读取 HTML 模板
        html_template = self._read_file(os.path.join(assets_dir, "index.html"))
        
        # 序列化演示文稿数据
        presentation_json = json.dumps(presentation_data, ensure_ascii=False, indent=2)
        
        # 构建独立 HTML
        standalone_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML PPT 编辑器 - 独立版</title>
    <style>
{css_content}
    </style>
</head>
<body>
    <!-- 内联演示文稿数据 -->
    <script>
        window.__PRESENTATION_DATA__ = {presentation_json};
    </script>
    
    <!-- 内联 JavaScript -->
    <script>
{js_content}
    </script>
</body>
</html>'''
        
        return standalone_html
    
    def export_player_html(self, presentation_data: dict) -> str:
        """
        导出为播放器 HTML 文件
        
        仅包含播放功能，不包含编辑功能。
        适合分享和演示使用。
        
        Args:
            presentation_data: 演示文稿数据字典
            
        Returns:
            播放器 HTML 字符串
        """
        # 获取资源路径
        assets_dir = get_resource_path("assets")
        
        # 读取 CSS 文件（简化版）
        css_content = self._read_file(os.path.join(assets_dir, "css", "main.css"))
        
        # 序列化演示文稿数据
        presentation_json = json.dumps(presentation_data, ensure_ascii=False, indent=2)
        
        # 播放器 HTML（简化版，仅包含播放功能）
        player_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML PPT 播放器</title>
    <style>
{css_content}
        
        /* 播放器特定样式 */
        body {{
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
        }}
        
        .player-container {{
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        .player-slide {{
            width: 100%;
            height: 100%;
            background: white;
            position: relative;
        }}
        
        .player-controls {{
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 1000;
        }}
        
        .player-btn {{
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }}
        
        .player-btn:hover {{
            background: rgba(0, 0, 0, 0.9);
        }}
    </style>
</head>
<body>
    <div class="player-container">
        <canvas id="player-canvas"></canvas>
    </div>
    
    <div class="player-controls">
        <button class="player-btn" id="btn-prev">上一页</button>
        <span id="slide-info">1 / 1</span>
        <button class="player-btn" id="btn-next">下一页</button>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script>
        // 演示文稿数据
        const presentation = {presentation_json};
        
        // 播放器逻辑
        let currentSlideIndex = 0;
        let canvas = null;
        
        function init() {{
            canvas = new fabric.Canvas('player-canvas', {{
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: '#ffffff'
            }});
            
            if (presentation.slides && presentation.slides.length > 0) {{
                renderSlide(0);
            }}
            
            // 绑定事件
            document.getElementById('btn-prev').addEventListener('click', prevSlide);
            document.getElementById('btn-next').addEventListener('click', nextSlide);
            
            // 键盘控制
            document.addEventListener('keydown', function(e) {{
                if (e.key === 'ArrowLeft') prevSlide();
                if (e.key === 'ArrowRight') nextSlide();
                if (e.key === 'Escape') window.close();
            }});
        }}
        
        function renderSlide(index) {{
            if (!presentation.slides || index < 0 || index >= presentation.slides.length) return;
            
            currentSlideIndex = index;
            const slide = presentation.slides[index];
            
            canvas.clear();
            canvas.backgroundColor = slide.backgroundColor || '#ffffff';
            
            // 渲染元素
            if (slide.elements) {{
                slide.elements.forEach(function(el) {{
                    renderElement(el);
                }});
            }}
            
            canvas.renderAll();
            updateSlideInfo();
        }}
        
        function renderElement(el) {{
            // 简化的元素渲染
            let obj = null;
            const style = el.style || {{}};
            
            if (el.type === 'textbox') {{
                obj = new fabric.IText(el.content || '', {{
                    left: style.x || 0,
                    top: style.y || 0,
                    fontSize: style.fontSize || 24,
                    fill: style.color || '#333333'
                }});
            }} else if (el.type === 'shape') {{
                obj = new fabric.Rect({{
                    left: style.x || 0,
                    top: style.y || 0,
                    width: style.width || 100,
                    height: style.height || 100,
                    fill: style.fill || '#007acc'
                }});
            }}
            
            if (obj) {{
                canvas.add(obj);
            }}
        }}
        
        function prevSlide() {{
            if (currentSlideIndex > 0) {{
                renderSlide(currentSlideIndex - 1);
            }}
        }}
        
        function nextSlide() {{
            if (currentSlideIndex < presentation.slides.length - 1) {{
                renderSlide(currentSlideIndex + 1);
            }}
        }}
        
        function updateSlideInfo() {{
            document.getElementById('slide-info').textContent = 
                (currentSlideIndex + 1) + ' / ' + presentation.slides.length;
        }}
        
        // 初始化
        window.addEventListener('load', init);
    </script>
</body>
</html>'''
        
        return player_html
    
    def save_html(self, html_content: str, output_path: str) -> bool:
        """
        保存 HTML 内容到文件
        
        Args:
            html_content: HTML 内容字符串
            output_path: 输出文件路径
            
        Returns:
            是否保存成功
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            return True
        except Exception as e:
            print(f"[Exporter] 保存失败: {e}")
            return False


def export_presentation(presentation_data: dict, output_path: str, mode: str = 'standalone') -> bool:
    """
    导出演示文稿的便捷函数
    
    Args:
        presentation_data: 演示文稿数据
        output_path: 输出文件路径
        mode: 导出模式 ('standalone' 或 'player')
        
    Returns:
        是否导出成功
    """
    exporter = Exporter()
    
    if mode == 'standalone':
        html_content = exporter.export_standalone_html(presentation_data)
    elif mode == 'player':
        html_content = exporter.export_player_html(presentation_data)
    else:
        print(f"[Exporter] 未知的导出模式: {mode}")
        return False
    
    return exporter.save_html(html_content, output_path)


if __name__ == '__main__':
    # 测试导出功能
    test_data = {
        "slides": [
            {
                "id": "slide-1",
                "elements": [
                    {
                        "id": "text-1",
                        "type": "textbox",
                        "content": "Hello World",
                        "style": {"x": 100, "y": 100, "fontSize": 48, "color": "#333333"}
                    }
                ]
            }
        ]
    }
    
    exporter = Exporter()
    html = exporter.export_player_html(test_data)
    print(f"导出成功，HTML 长度: {len(html)} 字符")
