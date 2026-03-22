import os
import sys
import json
import uuid
import copy
import datetime
from typing import Dict, List, Optional, Any
from jinja2 import Environment, FileSystemLoader, Template

try:
    from .presentation import Presentation, Slide, Element
except ImportError:
    from presentation import Presentation, Slide, Element


def get_resource_path(relative_path: str) -> str:
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), relative_path)


class API:
    MAX_RECENT_FILES = 18
    RECENT_FILES_KEY = 'ppt_recent_files'
    USER_SETTINGS_KEY = 'ppt_user_settings'
    
    def __init__(self):
        self.presentation = Presentation()
        self.undo_stack: List[Dict] = []
        self.redo_stack: List[Dict] = []
        self.max_undo_steps = 50
        self.template_env = None
        self._clipboard: Dict = None
        self._file_dialog_parent = None
        self._init_templates()
        self._load_user_settings()

    def set_file_dialog_parent(self, parent):
        self._file_dialog_parent = parent

    def _init_templates(self):
        template_dir = get_resource_path("templates")
        if os.path.exists(template_dir):
            self.template_env = Environment(loader=FileSystemLoader(template_dir))
        else:
            self.template_env = Environment()
            self.template_env.loader = None

    def _save_undo_state(self):
        state = self.presentation.to_dict()
        self.undo_stack.append(state)
        if len(self.undo_stack) > self.max_undo_steps:
            self.undo_stack.pop(0)
        self.redo_stack.clear()

    def undo(self) -> Dict:
        if self.undo_stack:
            current_state = self.presentation.to_dict()
            self.redo_stack.append(current_state)
            previous_state = self.undo_stack.pop()
            self.presentation = Presentation.from_dict(previous_state)
            return {"success": True, "data": self.presentation.to_dict()}
        return {"success": False, "message": "没有可撤销的操作"}

    def redo(self) -> Dict:
        if self.redo_stack:
            current_state = self.presentation.to_dict()
            self.undo_stack.append(current_state)
            next_state = self.redo_stack.pop()
            self.presentation = Presentation.from_dict(next_state)
            return {"success": True, "data": self.presentation.to_dict()}
        return {"success": False, "message": "没有可重做的操作"}

    def get_presentation(self) -> Dict:
        return self.presentation.to_dict()

    def new_presentation(self) -> Dict:
        self._save_undo_state()
        self.presentation = Presentation()
        default_slide = self.presentation.create_default_slide()
        self.presentation.add_slide(default_slide)
        return self.presentation.to_dict()

    def load_presentation(self, json_data: str) -> Dict:
        try:
            self._save_undo_state()
            self.presentation = Presentation.from_json(json_data)
            return {"success": True, "data": self.presentation.to_dict()}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def save_presentation(self) -> str:
        return self.presentation.to_json()

    def add_slide(self, after_slide_id: str = None, layout: str = None) -> Dict:
        self._save_undo_state()
        new_slide = self.presentation.create_default_slide(layout or "title_subtitle")
        
        if after_slide_id:
            for i, slide in enumerate(self.presentation.slides):
                if slide.id == after_slide_id:
                    self.presentation.add_slide(new_slide, i + 1)
                    break
        else:
            self.presentation.add_slide(new_slide)
        
        return {"success": True, "slide": new_slide.to_dict(), "presentation": self.presentation.to_dict()}
    
    def get_layout_templates(self) -> Dict:
        return {"success": True, "templates": self.presentation.get_layout_templates()}
    
    def change_slide_layout(self, slide_id: str, layout: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if not slide:
            return {"success": False, "message": "幻灯片不存在"}
        
        layout_templates = self.presentation._get_layout_templates()
        if layout not in layout_templates:
            return {"success": False, "message": "版式不存在"}
        
        slide.elements.clear()
        template = layout_templates[layout]
        for elem_data in template["elements"]:
            element = Element(
                element_type=elem_data.get("type", "textbox"),
                style=elem_data.get("style"),
                content=elem_data.get("content")
            )
            if elem_data.get("textMode"):
                element.style["textMode"] = elem_data["textMode"]
            slide.add_element(element)
        
        return {"success": True, "presentation": self.presentation.to_dict()}

    # ==================== 母版操作 ====================

    def get_slide_masters(self) -> Dict:
        """获取所有母版"""
        return {"success": True, "masters": self.presentation.get_slide_masters()}
    
    def get_slide_master(self, master_id: str) -> Dict:
        """获取指定母版"""
        master = self.presentation.get_slide_master(master_id)
        if master:
            return {"success": True, "master": master}
        return {"success": False, "message": "母版不存在"}
    
    def add_slide_master(self, master: Dict) -> Dict:
        """添加新母版"""
        self._save_undo_state()
        new_master = self.presentation.add_slide_master(master)
        return {"success": True, "master": new_master, "presentation": self.presentation.to_dict()}
    
    def update_slide_master(self, master_id: str, master: Dict) -> Dict:
        """更新母版"""
        self._save_undo_state()
        if self.presentation.update_slide_master(master_id, master):
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "母版不存在"}
    
    def delete_slide_master(self, master_id: str) -> Dict:
        """删除母版"""
        self._save_undo_state()
        if self.presentation.delete_slide_master(master_id):
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "无法删除默认母版或母版不存在"}
    
    def apply_master_to_slide(self, slide_id: str, master_id: str) -> Dict:
        """将母版应用到幻灯片"""
        self._save_undo_state()
        if self.presentation.apply_master_to_slide(slide_id, master_id):
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "幻灯片或母版不存在"}

    def remove_slide(self, slide_id: str) -> Dict:
        self._save_undo_state()
        if self.presentation.remove_slide(slide_id):
            if len(self.presentation.slides) == 0:
                default_slide = self.presentation.create_default_slide()
                self.presentation.add_slide(default_slide)
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "幻灯片不存在"}

    def duplicate_slide(self, slide_id: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            new_slide = slide.clone()
            for i, s in enumerate(self.presentation.slides):
                if s.id == slide_id:
                    self.presentation.add_slide(new_slide, i + 1)
                    break
            return {"success": True, "slide": new_slide.to_dict(), "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "幻灯片不存在"}

    def move_slide(self, from_index: int, to_index: int) -> Dict:
        self._save_undo_state()
        if self.presentation.move_slide(from_index, to_index):
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "移动失败"}

    def set_current_slide(self, index: int) -> Dict:
        if 0 <= index < len(self.presentation.slides):
            self.presentation.current_slide_index = index
            return {"success": True, "currentSlideIndex": index}
        return {"success": False, "message": "索引超出范围"}

    def add_element(self, slide_id: str, element_type: str, style: Dict = None, content: Any = None) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            element = Element(element_type=element_type, style=style, content=content)
            slide.add_element(element)
            return {"success": True, "element": element.to_dict(), "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "幻灯片不存在"}

    def update_element(self, slide_id: str, element_id: str, style: Dict = None, content: Any = None) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            element = slide.get_element(element_id)
            if element:
                if style:
                    element.update_style(**style)
                if content is not None:
                    element.content = content
                return {"success": True, "element": element.to_dict(), "presentation": self.presentation.to_dict()}
            return {"success": False, "message": "元素不存在"}
        return {"success": False, "message": "幻灯片不存在"}

    def remove_element(self, slide_id: str, element_id: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            if slide.remove_element(element_id):
                return {"success": True, "presentation": self.presentation.to_dict()}
            return {"success": False, "message": "元素不存在"}
        return {"success": False, "message": "幻灯片不存在"}

    def duplicate_element(self, slide_id: str, element_id: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            element = slide.get_element(element_id)
            if element:
                new_element = element.clone()
                new_element.style["x"] = (new_element.style.get("x", 100) + 20)
                new_element.style["y"] = (new_element.style.get("y", 100) + 20)
                slide.add_element(new_element)
                return {"success": True, "element": new_element.to_dict(), "presentation": self.presentation.to_dict()}
            return {"success": False, "message": "元素不存在"}
        return {"success": False, "message": "幻灯片不存在"}

    def update_slide_metadata(self, slide_id: str, metadata: Dict) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            slide.metadata.update(metadata)
            return {"success": True, "presentation": self.presentation.to_dict()}
        return {"success": False, "message": "幻灯片不存在"}

    def update_presentation_metadata(self, metadata: Dict) -> Dict:
        self._save_undo_state()
        self.presentation.metadata.update(metadata)
        return {"success": True, "presentation": self.presentation.to_dict()}

    def export_html(self) -> str:
        return self.render_to_html()

    def export_pdf(self, output_path: str = None) -> Dict:
        """
        导出演示文稿为 PDF 文件
        
        Args:
            output_path: 输出路径，如果不指定则弹出保存对话框
            
        Returns:
            包含 success 和 path 的字典
        """
        try:
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import inch
            import io
            
            if not output_path:
                from PyQt6.QtWidgets import QFileDialog
                from PyQt6.QtCore import QSettings
                
                settings = QSettings("PPTEditor", "Settings")
                last_dir = settings.value("last_export_dir", "")
                
                file_dialog = QFileDialog()
                file_dialog.setAcceptMode(QFileDialog.AcceptMode.AcceptSave)
                file_dialog.setNameFilter("PDF 文件 (*.pdf)")
                file_dialog.setDefaultSuffix("pdf")
                file_dialog.setDirectory(last_dir)
                
                if file_dialog.exec():
                    output_path = file_dialog.selectedFiles()[0]
                    settings.setValue("last_export_dir", os.path.dirname(output_path))
                else:
                    return {"success": False, "message": "用户取消"}
            
            slide_width = 1200
            slide_height = 675
            
            page_width = landscape(A4)[0]
            page_height = landscape(A4)[1]
            
            scale = min(page_width / slide_width, page_height / slide_height) * 0.95
            
            c = canvas.Canvas(output_path, pagesize=landscape(A4))
            
            for i, slide in enumerate(self.presentation.slides):
                if i > 0:
                    c.showPage()
                
                offset_x = (page_width - slide_width * scale) / 2
                offset_y = (page_height - slide_height * scale) / 2
                
                bg_color = slide.metadata.get("backgroundColor", "#ffffff")
                c.setFillColor(self._hex_to_rgb(bg_color))
                c.rect(offset_x, offset_y, slide_width * scale, slide_height * scale, fill=True, stroke=False)
                
                for element in slide.elements:
                    self._draw_element_to_pdf(c, element, offset_x, offset_y, scale)
            
            c.save()
            
            return {"success": True, "path": output_path}
            
        except ImportError:
            return {"success": False, "message": "请安装 reportlab: pip install reportlab"}
        except Exception as e:
            print(f"[API] PDF导出失败: {e}")
            return {"success": False, "message": str(e)}

    def _hex_to_rgb(self, hex_color: str):
        """将十六进制颜色转换为 reportlab RGB"""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 6:
            r, g, b = tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))
            return (r, g, b)
        return (1, 1, 1)

    def _draw_element_to_pdf(self, c, element, offset_x, offset_y, scale):
        """在 PDF canvas 上绘制元素"""
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        style = element.style or {}
        x = (style.get('x', 0) * scale) + offset_x
        y = offset_y + (675 * scale) - ((style.get('y', 0) + style.get('height', 50)) * scale)
        width = style.get('width', 100) * scale
        height = style.get('height', 50) * scale
        
        el_type = element.type or 'shape'
        
        if el_type in ('textbox', 'text'):
            content = element.content or ''
            font_size = style.get('fontSize', 24) * scale
            color = self._hex_to_rgb(style.get('color', '#333333'))
            
            c.setFillColor(color)
            c.setFont("Helvetica", font_size)
            c.drawString(x, y + height - font_size, content)
            
        elif el_type == 'shape':
            fill = self._hex_to_rgb(style.get('fill', '#007acc'))
            c.setFillColor(fill)
            
            shape_type = element.shapeType or 'rectangle'
            if shape_type == 'circle':
                c.ellipse(x, y, x + width, y + height, fill=True, stroke=False)
            else:
                c.rect(x, y, width, height, fill=True, stroke=False)

    def export_images(self, output_dir: str = None, format: str = 'png') -> Dict:
        """
        导出演示文稿为图片
        
        Args:
            output_dir: 输出目录，如果不指定则弹出选择对话框
            format: 图片格式 (png, jpg)
            
        Returns:
            包含 success 和 paths 的字典
        """
        try:
            if not output_dir:
                from PyQt6.QtWidgets import QFileDialog
                from PyQt6.QtCore import QSettings
                
                settings = QSettings("PPTEditor", "Settings")
                last_dir = settings.value("last_export_dir", "")
                
                output_dir = QFileDialog.getExistingDirectory(
                    None, "选择导出目录", last_dir
                )
                
                if not output_dir:
                    return {"success": False, "message": "用户取消"}
                    
                settings.setValue("last_export_dir", output_dir)
            
            import os
            paths = []
            
            # 使用 Pillow 生成图片
            try:
                from PIL import Image, ImageDraw, ImageFont
                
                for i, slide in enumerate(self.presentation.slides):
                    # 创建幻灯片图片
                    img = Image.new('RGB', (1200, 675), color='white')
                    draw = ImageDraw.Draw(img)
                    
                    # 绘制背景
                    bg_color = slide.metadata.get('backgroundColor', '#ffffff')
                    if bg_color:
                        try:
                            # 简单处理纯色背景
                            if not bg_color.startswith('linear-gradient'):
                                img = Image.new('RGB', (1200, 675), color=bg_color)
                                draw = ImageDraw.Draw(img)
                        except:
                            pass
                    
                    # 绘制元素
                    for element in slide.elements:
                        try:
                            self._draw_element_to_image(draw, element)
                        except Exception as e:
                            print(f"[API] 绘制元素失败: {e}")
                    
                    # 保存图片
                    filename = f"slide_{i+1:03d}.{format}"
                    filepath = os.path.join(output_dir, filename)
                    img.save(filepath, format.upper())
                    paths.append(filepath)
                    
            except ImportError:
                # 如果没有 Pillow，返回提示
                return {
                    "success": False, 
                    "message": "需要安装 Pillow 库: pip install Pillow"
                }
            
            return {
                "success": True, 
                "paths": paths,
                "count": len(paths),
                "directory": output_dir
            }
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def _draw_element_to_image(self, draw, element):
        """绘制元素到图片"""
        from PIL import ImageFont
        
        style = element.style or {}
        x = style.get('x', 0)
        y = style.get('y', 0)
        width = style.get('width', 100)
        height = style.get('height', 50)
        
        el_type = element.type or 'shape'
        
        if el_type in ('textbox', 'text'):
            content = element.content or ''
            font_size = style.get('fontSize', 24)
            color = style.get('color', '#333333')
            
            # 尝试加载字体
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            # 转换颜色
            if color.startswith('#'):
                color = color[1:]
                if len(color) == 6:
                    color = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
                else:
                    color = (51, 51, 51)
            else:
                color = (51, 51, 51)
            
            draw.text((x, y), content, fill=color, font=font)
            
        elif el_type == 'shape':
            fill = style.get('fill', '#007acc')
            
            # 转换颜色
            if fill.startswith('#'):
                fill = fill[1:]
                if len(fill) == 6:
                    fill = tuple(int(fill[i:i+2], 16) for i in (0, 2, 4))
                else:
                    fill = (0, 122, 204)
            else:
                fill = (0, 122, 204)
            
            shape_type = element.shapeType or 'rectangle'
            if shape_type == 'circle':
                draw.ellipse([x, y, x + width, y + height], fill=fill)
            else:
                draw.rectangle([x, y, x + width, y + height], fill=fill)

    def print_presentation(self) -> Dict:
        """
        打印演示文稿
        
        Returns:
            包含 success 的字典
        """
        try:
            from PyQt6.QtWidgets import QFileDialog
            from PyQt6.QtPrintSupport import QPrinter, QPrintDialog
            from PyQt6.QtGui import QTextDocument
            from PyQt6.QtCore import QSettings
            
            printer = QPrinter(QPrinter.PrinterMode.HighResolution)
            
            # 显示打印对话框
            dialog = QPrintDialog(printer)
            if dialog.exec() != QPrintDialog.DialogCode.Accepted:
                return {"success": False, "message": "用户取消"}
            
            # 生成 HTML 内容用于打印
            html_content = self.render_to_html()
            
            # 创建文本文档
            doc = QTextDocument()
            doc.setHtml(html_content)
            
            # 打印
            doc.print_(printer)
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "message": str(e)}

    def render_to_html(self) -> str:
        if self.template_env and self.template_env.loader:
            try:
                template = self.template_env.get_template("presentation.html")
                return template.render(
                    slides=self.presentation.slides,
                    title=self.presentation.metadata.get("title", "演示文稿"),
                    slide_bg="#ffffff"
                )
            except Exception as e:
                print(f"[API] 模板加载失败: {e}")
        
        template_str = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        body { font-family: Arial, sans-serif; background: #000000; display: flex; align-items: center; justify-content: center; }
        .presentation-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .slide { position: absolute; width: 1200px; height: 675px; background: {{ slide_bg }}; overflow: hidden; transform-origin: center center; display: none; }
        .slide.active { display: block; }
        .element { position: absolute; display: flex; align-items: flex-start; justify-content: flex-start; }
        .element-textbox, .element-text { white-space: pre-wrap; word-wrap: break-word; }
        .element-shape { width: 100%; height: 100%; }
        .element-media, .element-image { width: 100%; height: 100%; object-fit: cover; }
        .element-button { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; font-size: inherit; }
        .navigation { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1000; opacity: 0; transition: opacity 0.3s; }
        body:hover .navigation { opacity: 1; }
        .nav-btn { padding: 10px 20px; background: rgba(255,255,255,0.9); border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s; }
        .nav-btn:hover { background: #fff; transform: scale(1.05); }
        .slide-counter { position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; opacity: 0; transition: opacity 0.3s; }
        body:hover .slide-counter { opacity: 1; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
        .animate-slideInLeft { animation: slideInLeft var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
        .animate-slideInRight { animation: slideInRight var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
        .animate-slideInUp { animation: slideInUp var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
        .animate-slideInDown { animation: slideInDown var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
        .animate-scaleIn { animation: scaleIn var(--duration, 0.5s) ease-out var(--delay, 0s) both; }
    </style>
</head>
<body>
    <div class="presentation-container">
        {% for slide in slides %}
        <div class="slide{% if loop.first %} active{% endif %}" id="{{ slide.id }}" style="background-color: {{ slide.metadata.get('backgroundColor', '#ffffff') }};">
            {% for element in slide.elements %}
            {% set animation = element.animation or {} %}
            {% set anim_type = animation.get('type', 'none') %}
            <div class="element element-{{ element.type }}{% if anim_type != 'none' %} animate-{{ anim_type }}{% endif %}" id="{{ element.id }}" style="left: {{ element.style.get('x', 0) }}px; top: {{ element.style.get('y', 0) }}px; width: {{ element.style.get('width', 200) }}px; height: {{ element.style.get('height', 100) }}px; transform: rotate({{ element.style.get('angle', 0) }}deg); opacity: {{ element.style.get('opacity', 1) }}; z-index: {{ element.style.get('zIndex', 1) }};{% if anim_type != 'none' %} --duration: {{ animation.get('duration', 0.5) }}s; --delay: {{ animation.get('delay', 0) }}s;{% endif %}">
                {% if element.type == 'textbox' or element.type == 'text' %}
                <div class="element-{{ element.type }}" style="font-size: {{ element.style.get('fontSize', 24) }}px; font-family: {{ element.style.get('fontFamily', 'Arial') }}; font-weight: {{ element.style.get('fontWeight', 'normal') }}; font-style: {{ element.style.get('fontStyle', 'normal') }}; text-align: {{ element.style.get('textAlign', 'left') }}; color: {{ element.style.get('color', '#333333') }}; background-color: {{ element.style.get('backgroundColor', 'transparent') }}; line-height: {{ element.style.get('lineHeight', 1.5) }}; width: 100%; height: 100%;">{{ element.content or '' }}</div>
                {% elif element.type == 'shape' %}
                <div class="element-shape" style="background-color: {{ element.style.get('fill', '#007acc') }}; border: {{ element.style.get('strokeWidth', 2) }}px solid {{ element.style.get('stroke', '#005a9e') }}; border-radius: {{ element.style.get('borderRadius', 0) }}px;"></div>
                {% elif element.type == 'media' or element.type == 'image' %}
                <img class="element-media" src="{{ element.content or '' }}" style="border-radius: {{ element.style.get('borderRadius', 0) }}px; object-fit: {{ element.style.get('objectFit', 'cover') }};" alt="image">
                {% elif element.type == 'button' %}
                <button class="element-button" style="background-color: {{ element.style.get('fill', '#3b82f6') }}; color: {{ element.style.get('color', '#ffffff') }}; font-size: {{ element.style.get('fontSize', 16) }}px; border-radius: {{ element.style.get('borderRadius', 4) }}px;">{{ element.content or '按钮' }}</button>
                {% endif %}
            </div>
            {% endfor %}
        </div>
        {% endfor %}
    </div>
    <div class="navigation">
        <button class="nav-btn" onclick="prevSlide()">上一页</button>
        <button class="nav-btn" onclick="nextSlide()">下一页</button>
    </div>
    <div class="slide-counter"><span id="current-slide">1</span> / <span id="total-slides">{{ slides | length }}</span></div>
    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        const SLIDE_WIDTH = 1200;
        const SLIDE_HEIGHT = 675;
        function scaleSlide() {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const scaleX = windowWidth / SLIDE_WIDTH;
            const scaleY = windowHeight / SLIDE_HEIGHT;
            const scale = Math.min(scaleX, scaleY);
            slides.forEach(slide => { slide.style.transform = `scale(${scale})`; });
        }
        function showSlide(index) {
            slides.forEach((slide, i) => {
                if (i === index) { slide.classList.add('active'); slide.style.display = 'block'; }
                else { slide.classList.remove('active'); slide.style.display = 'none'; }
            });
            document.getElementById('current-slide').textContent = index + 1;
            scaleSlide();
        }
        function nextSlide() { currentSlide = (currentSlide + 1) % totalSlides; showSlide(currentSlide); }
        function prevSlide() { currentSlide = (currentSlide - 1 + totalSlides) % totalSlides; showSlide(currentSlide); }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
            else if (e.key === 'Escape') { window.close(); }
        });
        document.body.addEventListener('click', (e) => { if (!e.target.closest('.navigation') && !e.target.closest('.nav-btn')) { nextSlide(); } });
        document.body.addEventListener('contextmenu', (e) => { e.preventDefault(); prevSlide(); });
        window.addEventListener('resize', scaleSlide);
        showSlide(0);
    </script>
</body>
</html>'''
        
        template = Template(template_str)
        return template.render(
            slides=self.presentation.slides,
            title=self.presentation.metadata.get("title", "演示文稿"),
            slide_bg="#ffffff"
        )

    def export_single_file(self) -> str:
        return self.render_to_html()

    def save_to_file(self, file_path: str = None) -> Dict:
        try:
            if file_path is None and self._file_dialog_parent:
                from PyQt6.QtWidgets import QFileDialog
                default_name = self.presentation.metadata.get("title", "未命名演示文稿") + ".pptjson"
                file_path, _ = QFileDialog.getSaveFileName(
                    self._file_dialog_parent,
                    "保存演示文稿",
                    default_name,
                    "PPT JSON 文件 (*.pptjson);;JSON 文件 (*.json)"
                )
            if not file_path:
                return {"success": False, "message": "未选择文件"}
            json_data = self.save_presentation()
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(json_data)
            return {"success": True, "file_path": file_path}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def load_from_file(self, file_path: str = None) -> Dict:
        try:
            if file_path is None and self._file_dialog_parent:
                from PyQt6.QtWidgets import QFileDialog
                file_path, _ = QFileDialog.getOpenFileName(
                    self._file_dialog_parent,
                    "打开演示文稿",
                    "",
                    "PPT JSON 文件 (*.pptjson);;JSON 文件 (*.json);;所有文件 (*.*)"
                )
            if not file_path:
                return {"success": False, "message": "未选择文件"}
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = f.read()
            result = self.load_presentation(json_data)
            if result.get("success"):
                result["file_path"] = file_path
            return result
        except Exception as e:
            return {"success": False, "message": str(e)}

    def set_element_animation(self, slide_id: str, element_id: str, 
                              animation_type: str = None, 
                              duration: float = None, 
                              delay: float = None) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if slide:
            element = slide.get_element(element_id)
            if element:
                if element.set_animation(animation_type, duration, delay):
                    return {"success": True, "element": element.to_dict(), "presentation": self.presentation.to_dict()}
                return {"success": False, "message": "无效的动画类型"}
            return {"success": False, "message": "元素不存在"}
        return {"success": False, "message": "幻灯片不存在"}

    def reorder_element(self, slide_id: str, element_id: str, direction: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if not slide:
            return {"success": False, "message": "幻灯片不存在"}
        
        elements = slide.elements
        current_index = None
        for i, elem in enumerate(elements):
            if elem.id == element_id:
                current_index = i
                break
        
        if current_index is None:
            return {"success": False, "message": "元素不存在"}
        
        if direction == 'up' and current_index < len(elements) - 1:
            elements[current_index], elements[current_index + 1] = elements[current_index + 1], elements[current_index]
        elif direction == 'down' and current_index > 0:
            elements[current_index], elements[current_index - 1] = elements[current_index - 1], elements[current_index]
        elif direction == 'top' and current_index < len(elements) - 1:
            elements.append(elements.pop(current_index))
        elif direction == 'bottom' and current_index > 0:
            elements.insert(0, elements.pop(current_index))
        else:
            return {"success": False, "message": "无法移动元素"}
        
        for i, elem in enumerate(elements):
            elem.style['zIndex'] = i + 1
        
        return {"success": True, "presentation": self.presentation.to_dict()}

    def align_elements(self, slide_id: str, element_ids: List[str], align_type: str) -> Dict:
        self._save_undo_state()
        slide = self.presentation.get_slide(slide_id)
        if not slide:
            return {"success": False, "message": "幻灯片不存在"}
        
        elements_to_align = []
        for elem in slide.elements:
            if elem.id in element_ids:
                elements_to_align.append(elem)
        
        if len(elements_to_align) < 2:
            return {"success": False, "message": "至少需要选择两个元素"}
        
        if align_type == 'left':
            min_x = min(e.style.get('x', 0) for e in elements_to_align)
            for elem in elements_to_align:
                elem.style['x'] = min_x
        elif align_type == 'center':
            centers = [e.style.get('x', 0) + e.style.get('width', 100) / 2 for e in elements_to_align]
            avg_center = sum(centers) / len(centers)
            for elem in elements_to_align:
                elem.style['x'] = avg_center - elem.style.get('width', 100) / 2
        elif align_type == 'right':
            max_right = max(e.style.get('x', 0) + e.style.get('width', 100) for e in elements_to_align)
            for elem in elements_to_align:
                elem.style['x'] = max_right - elem.style.get('width', 100)
        elif align_type == 'top':
            min_y = min(e.style.get('y', 0) for e in elements_to_align)
            for elem in elements_to_align:
                elem.style['y'] = min_y
        elif align_type == 'middle':
            centers = [e.style.get('y', 0) + e.style.get('height', 100) / 2 for e in elements_to_align]
            avg_center = sum(centers) / len(centers)
            for elem in elements_to_align:
                elem.style['y'] = avg_center - elem.style.get('height', 100) / 2
        elif align_type == 'bottom':
            max_bottom = max(e.style.get('y', 0) + e.style.get('height', 100) for e in elements_to_align)
            for elem in elements_to_align:
                elem.style['y'] = max_bottom - elem.style.get('height', 100)
        else:
            return {"success": False, "message": "无效的对齐类型"}
        
        return {"success": True, "presentation": self.presentation.to_dict()}

    def copy_elements(self, slide_id: str, element_ids: List[str]) -> Dict:
        slide = self.presentation.get_slide(slide_id)
        if not slide:
            return {"success": False, "message": "幻灯片不存在"}
        
        copied_elements = []
        for elem in slide.elements:
            if elem.id in element_ids:
                copied_elements.append(elem.to_dict())
        
        if not copied_elements:
            return {"success": False, "message": "未找到要复制的元素"}
        
        self._clipboard = {
            "elements": copied_elements,
            "source_slide_id": slide_id
        }
        
        return {"success": True, "count": len(copied_elements)}

    def paste_elements(self, target_slide_id: str) -> Dict:
        if not self._clipboard:
            return {"success": False, "message": "剪贴板为空"}
        
        self._save_undo_state()
        slide = self.presentation.get_slide(target_slide_id)
        if not slide:
            return {"success": False, "message": "目标幻灯片不存在"}
        
        new_elements = []
        for elem_data in self._clipboard.get("elements", []):
            element = Element.from_dict(elem_data)
            element.id = element._generate_id()
            element.style['x'] = element.style.get('x', 100) + 20
            element.style['y'] = element.style.get('y', 100) + 20
            slide.add_element(element)
            new_elements.append(element.to_dict())
        
        return {
            "success": True, 
            "elements": new_elements, 
            "presentation": self.presentation.to_dict()
        }

    def get_clipboard(self) -> Dict:
        if self._clipboard:
            return {"success": True, "clipboard": self._clipboard}
        return {"success": False, "message": "剪贴板为空"}

    def clear_clipboard(self) -> Dict:
        self._clipboard = None
        return {"success": True}

    def _load_user_settings(self):
        self.user_name = "用户"
        self._recent_files = []
        self._settings_path = None
        
    def _save_user_settings(self):
        pass

    def get_user_name(self) -> str:
        return self.user_name

    def set_user_name(self, name: str) -> Dict:
        self.user_name = name or "用户"
        self._save_user_settings()
        return {"success": True, "userName": self.user_name}

    def get_recent_files(self) -> Dict:
        try:
            settings_dir = self._get_settings_dir()
            recent_file = os.path.join(settings_dir, "recent_files.json")
            
            if os.path.exists(recent_file):
                with open(recent_file, "r", encoding="utf-8") as f:
                    files = json.load(f)
            else:
                files = []
            
            for file_info in files:
                file_info["exists"] = os.path.exists(file_info.get("path", ""))
            
            return {"success": True, "files": files}
        except Exception as e:
            print(f"[API] 加载最近文件失败: {e}")
            return {"success": True, "files": []}

    def add_recent_file(self, path: str, data: Dict = None) -> Dict:
        try:
            settings_dir = self._get_settings_dir()
            recent_file = os.path.join(settings_dir, "recent_files.json")
            
            if os.path.exists(recent_file):
                with open(recent_file, "r", encoding="utf-8") as f:
                    files = json.load(f)
            else:
                files = []
            
            files = [f for f in files if f.get("path") != path]
            
            file_info = {
                "path": path,
                "name": os.path.basename(path),
                "modified": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                "thumbnail": self._generate_thumbnail(data) if data else "",
                "slideCount": len(data.get("slides", [])) if data else 0,
                "exists": True
            }
            
            files.insert(0, file_info)
            
            if len(files) > self.MAX_RECENT_FILES:
                files = files[:self.MAX_RECENT_FILES]
            
            os.makedirs(settings_dir, exist_ok=True)
            with open(recent_file, "w", encoding="utf-8") as f:
                json.dump(files, f, ensure_ascii=False, indent=2)
            
            return {"success": True}
        except Exception as e:
            print(f"[API] 添加最近文件失败: {e}")
            return {"success": False, "message": str(e)}

    def remove_recent_file(self, index: int) -> Dict:
        try:
            settings_dir = self._get_settings_dir()
            recent_file = os.path.join(settings_dir, "recent_files.json")
            
            if os.path.exists(recent_file):
                with open(recent_file, "r", encoding="utf-8") as f:
                    files = json.load(f)
            else:
                files = []
            
            if 0 <= index < len(files):
                files.pop(index)
                with open(recent_file, "w", encoding="utf-8") as f:
                    json.dump(files, f, ensure_ascii=False, indent=2)
            
            return {"success": True}
        except Exception as e:
            print(f"[API] 移除最近文件失败: {e}")
            return {"success": False, "message": str(e)}

    def _get_settings_dir(self) -> str:
        if self._settings_path is None:
            app_data = os.environ.get("APPDATA") or os.environ.get("HOME", "")
            self._settings_path = os.path.join(app_data, "PPTEditor")
        return self._settings_path

    def _generate_thumbnail(self, data: Dict) -> str:
        try:
            import io
            import base64
            
            if not data or not data.get("slides"):
                return ""
            
            first_slide = data["slides"][0]
            if not first_slide:
                return ""
            
            width, height = 240, 135
            
            try:
                from PIL import Image, ImageDraw, ImageFont
                
                img = Image.new("RGBA", (width, height), (255, 255, 255, 255))
                draw = ImageDraw.Draw(img)
                
                bg_color = first_slide.get("metadata", {}).get("backgroundColor", "#ffffff")
                draw.rectangle([(0, 0), (width, height)], fill=bg_color)
                
                scale_x = width / 1200
                scale_y = height / 675
                
                for element in first_slide.get("elements", []):
                    style = element.get("style", {})
                    x = int(style.get("x", 0) * scale_x)
                    y = int(style.get("y", 0) * scale_y)
                    w = int(style.get("width", 100) * scale_x)
                    h = int(style.get("height", 50) * scale_y)
                    elem_type = element.get("type", "")
                    
                    if elem_type in ("textbox", "text"):
                        fill = style.get("color", "#333333")
                        draw.rectangle([x, y, x + w, y + h], outline="#ddd")
                    elif elem_type == "shape":
                        fill = style.get("fill", "#007acc")
                        draw.rectangle([x, y, x + w, y + h], fill=fill)
                    elif elem_type in ("image", "media"):
                        draw.rectangle([x, y, x + w, y + h], fill="#f0f0f0", outline="#ddd")
                
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")
            except ImportError:
                return ""
        except Exception as e:
            print(f"[API] 生成缩略图失败: {e}")
            return ""

    def check_file_exists(self, path: str) -> Dict:
        exists = os.path.exists(path) and os.path.isfile(path)
        return {"success": True, "exists": exists}

    def write_log(self, level: str, module: str, message: str, data: str = "") -> Dict:
        """
        写入日志到文件（打包后使用）
        
        Args:
            level: 日志级别 (DEBUG/INFO/WARN/ERROR)
            module: 模块名称
            message: 日志消息
            data: 额外数据（JSON 字符串）
        
        Returns:
            {"success": True/False}
        """
        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_line = f"[{timestamp}] [{level}] [{module}] {message}"
            if data:
                log_line += f" {data}"
            log_line += "\n"
            
            if hasattr(sys, '_MEIPASS'):
                log_dir = os.path.dirname(sys.executable)
            else:
                log_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            log_file = os.path.join(log_dir, "ppt_editor.log")
            
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(log_line)
            
            return {"success": True}
        except Exception as e:
            print(f"[API] 写入日志失败: {e}")
            return {"success": False, "error": str(e)}

    def clear_log(self) -> Dict:
        """清空日志文件"""
        try:
            if hasattr(sys, '_MEIPASS'):
                log_dir = os.path.dirname(sys.executable)
            else:
                log_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            log_file = os.path.join(log_dir, "ppt_editor.log")
            
            if os.path.exists(log_file):
                os.remove(log_file)
            
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def is_packaged(self) -> Dict:
        """检查是否在打包环境中运行"""
        is_pkg = hasattr(sys, '_MEIPASS')
        return {"success": True, "packaged": is_pkg}
