"""
HTML PPT 编辑器 - 示例生成器

创建各种示例演示文稿，用于测试和展示软件功能
"""

import json
import os
from typing import Dict, List, Any
from datetime import datetime


class ExampleGenerator:
    """示例演示文稿生成器"""
    
    def __init__(self, api_instance=None):
        self.api = api_instance
        
    def _create_slide(self, elements: List[Dict], metadata: Dict = None) -> Dict:
        """创建幻灯片数据"""
        import uuid
        slide_id = f"slide-{uuid.uuid4().hex[:8]}"
        
        slide = {
            "id": slide_id,
            "elements": [],
            "metadata": metadata or {"layout": "custom"}
        }
        
        for elem in elements:
            element_id = f"elem-{uuid.uuid4().hex[:8]}"
            element = {
                "id": element_id,
                "type": elem.get("type", "textbox"),
                "content": elem.get("content", ""),
                "style": elem.get("style", {}),
                "animation": elem.get("animation", {"type": "none", "duration": 0.5, "delay": 0})
            }
            slide["elements"].append(element)
            
        return slide
    
    def create_software_intro(self) -> Dict:
        """创建软件介绍 PPT"""
        presentation = {
            "metadata": {
                "title": "HTML PPT 编辑器 - 功能介绍",
                "author": "开发团队",
                "createdAt": datetime.now().isoformat(),
                "modifiedAt": datetime.now().isoformat(),
                "description": "一款现代化的演示文稿制作工具"
            },
            "settings": {
                "advanceMode": "click",
                "smartGuidesEnabled": True
            },
            "slides": []
        }
        
        # 第1页：封面
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "HTML PPT 编辑器",
                "style": {
                    "x": 100, "y": 200, "width": 1000, "height": 120,
                    "fontSize": 64, "fontWeight": "bold", "color": "#1a1a2e",
                    "textAlign": "center", "fontFamily": "Arial"
                },
                "animation": {"type": "fadeIn", "duration": 0.8, "delay": 0}
            },
            {
                "type": "textbox",
                "content": "一款现代化的演示文稿制作工具",
                "style": {
                    "x": 200, "y": 350, "width": 800, "height": 60,
                    "fontSize": 28, "color": "#4a4a6a",
                    "textAlign": "center"
                },
                "animation": {"type": "fadeIn", "duration": 0.8, "delay": 0.3}
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 450, "y": 450, "width": 300, "height": 6,
                    "fill": "#3b82f6"
                },
                "animation": {"type": "scaleIn", "duration": 0.5, "delay": 0.6}
            },
            {
                "type": "textbox",
                "content": "版本 1.0 | 2024",
                "style": {
                    "x": 400, "y": 500, "width": 400, "height": 40,
                    "fontSize": 18, "color": "#888888",
                    "textAlign": "center"
                }
            }
        ], {"layout": "title_subtitle", "backgroundColor": "#ffffff"}))
        
        # 第2页：核心特性
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "核心特性",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 80,
                    "fontSize": 42, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 110, "width": 150, "height": 4,
                    "fill": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "🎨 可视化编辑\n\n所见即所得的编辑体验，拖拽即可调整元素位置和大小",
                "style": {
                    "x": 50, "y": 150, "width": 520, "height": 150,
                    "fontSize": 20, "color": "#333333", "lineHeight": 1.6
                },
                "animation": {"type": "slideInLeft", "duration": 0.5, "delay": 0}
            },
            {
                "type": "textbox",
                "content": "📐 智能参考线\n\n自动对齐元素，让排版更加精准美观",
                "style": {
                    "x": 630, "y": 150, "width": 520, "height": 150,
                    "fontSize": 20, "color": "#333333", "lineHeight": 1.6
                },
                "animation": {"type": "slideInRight", "duration": 0.5, "delay": 0.2}
            },
            {
                "type": "textbox",
                "content": "🎬 动画效果\n\n支持多种入场动画，让演示更生动",
                "style": {
                    "x": 50, "y": 350, "width": 520, "height": 150,
                    "fontSize": 20, "color": "#333333", "lineHeight": 1.6
                },
                "animation": {"type": "slideInLeft", "duration": 0.5, "delay": 0.4}
            },
            {
                "type": "textbox",
                "content": "💾 多格式导出\n\n支持导出为 HTML、单文件等多种格式",
                "style": {
                    "x": 630, "y": 350, "width": 520, "height": 150,
                    "fontSize": 20, "color": "#333333", "lineHeight": 1.6
                },
                "animation": {"type": "slideInRight", "duration": 0.5, "delay": 0.6}
            }
        ], {"layout": "title_content", "backgroundColor": "#ffffff"}))
        
        # 第3页：技术架构
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "技术架构",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 70,
                    "fontSize": 42, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 100, "width": 150, "height": 4,
                    "fill": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "前端技术栈",
                "style": {
                    "x": 50, "y": 140, "width": 500, "height": 50,
                    "fontSize": 24, "fontWeight": "bold", "color": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "• HTML5 / CSS3 / JavaScript\n• Fabric.js 画布引擎\n• 响应式设计",
                "style": {
                    "x": 50, "y": 200, "width": 500, "height": 150,
                    "fontSize": 18, "color": "#333333", "lineHeight": 1.8
                }
            },
            {
                "type": "textbox",
                "content": "后端技术栈",
                "style": {
                    "x": 650, "y": 140, "width": 500, "height": 50,
                    "fontSize": 24, "fontWeight": "bold", "color": "#10b981"
                }
            },
            {
                "type": "textbox",
                "content": "• Python 3.7+\n• PyQt6 GUI 框架\n• QWebChannel 通信",
                "style": {
                    "x": 650, "y": 200, "width": 500, "height": 150,
                    "fontSize": 18, "color": "#333333", "lineHeight": 1.8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 200, "y": 400, "width": 800, "height": 80,
                    "fill": "#f0f9ff", "strokeWidth": 2, "stroke": "#3b82f6",
                    "borderRadius": 10
                }
            },
            {
                "type": "textbox",
                "content": "前后端分离架构，通过 QWebChannel 实现双向通信",
                "style": {
                    "x": 220, "y": 420, "width": 760, "height": 40,
                    "fontSize": 18, "color": "#1e40af", "textAlign": "center"
                }
            }
        ], {"layout": "two_column", "backgroundColor": "#ffffff"}))
        
        # 第4页：功能演示
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "丰富的元素类型",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 70,
                    "fontSize": 42, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 100, "width": 150, "height": 4,
                    "fill": "#3b82f6"
                }
            },
            # 文本框示例
            {
                "type": "textbox",
                "content": "📝 文本框",
                "style": {
                    "x": 50, "y": 140, "width": 280, "height": 40,
                    "fontSize": 20, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "支持富文本编辑\n可调整字体、颜色、对齐方式",
                "style": {
                    "x": 50, "y": 190, "width": 280, "height": 80,
                    "fontSize": 16, "color": "#666666", "lineHeight": 1.5
                }
            },
            # 形状示例
            {
                "type": "textbox",
                "content": "⬛ 形状",
                "style": {
                    "x": 350, "y": 140, "width": 280, "height": 40,
                    "fontSize": 20, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 350, "y": 190, "width": 100, "height": 100,
                    "fill": "#3b82f6", "borderRadius": 10
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 470, "y": 190, "width": 100, "height": 100,
                    "fill": "#10b981", "borderRadius": 50
                }
            },
            # 按钮示例
            {
                "type": "textbox",
                "content": "🔘 按钮",
                "style": {
                    "x": 650, "y": 140, "width": 280, "height": 40,
                    "fontSize": 20, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "button",
                "content": "点击按钮",
                "style": {
                    "x": 650, "y": 200, "width": 150, "height": 50,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 16, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "次要按钮",
                "style": {
                    "x": 820, "y": 200, "width": 150, "height": 50,
                    "fill": "#e5e7eb", "color": "#333333",
                    "fontSize": 16, "borderRadius": 8
                }
            },
            # 图片示例
            {
                "type": "textbox",
                "content": "🖼️ 图片",
                "style": {
                    "x": 950, "y": 140, "width": 200, "height": 40,
                    "fontSize": 20, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "支持插入图片\n可调整大小和位置",
                "style": {
                    "x": 950, "y": 190, "width": 200, "height": 80,
                    "fontSize": 16, "color": "#666666", "lineHeight": 1.5
                }
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        # 第5页：动画效果展示
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "动画效果展示",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 70,
                    "fontSize": 42, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 100, "width": 150, "height": 4,
                    "fill": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "淡入效果",
                "style": {
                    "x": 100, "y": 200, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#3b82f6", "textAlign": "center"
                },
                "animation": {"type": "fadeIn", "duration": 1.0, "delay": 0}
            },
            {
                "type": "textbox",
                "content": "左侧滑入",
                "style": {
                    "x": 350, "y": 200, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#10b981", "textAlign": "center"
                },
                "animation": {"type": "slideInLeft", "duration": 0.8, "delay": 0.3}
            },
            {
                "type": "textbox",
                "content": "右侧滑入",
                "style": {
                    "x": 600, "y": 200, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#f59e0b", "textAlign": "center"
                },
                "animation": {"type": "slideInRight", "duration": 0.8, "delay": 0.6}
            },
            {
                "type": "textbox",
                "content": "缩放进入",
                "style": {
                    "x": 850, "y": 200, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#ef4444", "textAlign": "center"
                },
                "animation": {"type": "scaleIn", "duration": 0.6, "delay": 0.9}
            },
            {
                "type": "textbox",
                "content": "下方滑入",
                "style": {
                    "x": 350, "y": 400, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#8b5cf6", "textAlign": "center"
                },
                "animation": {"type": "slideInUp", "duration": 0.8, "delay": 1.2}
            },
            {
                "type": "textbox",
                "content": "上方滑入",
                "style": {
                    "x": 600, "y": 400, "width": 200, "height": 100,
                    "fontSize": 24, "color": "#ec4899", "textAlign": "center"
                },
                "animation": {"type": "slideInDown", "duration": 0.8, "delay": 1.5}
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        # 第6页：快捷键
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "快捷键一览",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 70,
                    "fontSize": 42, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 100, "width": 150, "height": 4,
                    "fill": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "编辑操作",
                "style": {
                    "x": 50, "y": 140, "width": 500, "height": 40,
                    "fontSize": 22, "fontWeight": "bold", "color": "#3b82f6"
                }
            },
            {
                "type": "textbox",
                "content": "Ctrl + Z    撤销\nCtrl + Y    重做\nCtrl + C    复制\nCtrl + V    粘贴\nDelete      删除选中元素",
                "style": {
                    "x": 50, "y": 190, "width": 500, "height": 200,
                    "fontSize": 18, "color": "#333333", "lineHeight": 2.0,
                    "fontFamily": "Consolas, monospace"
                }
            },
            {
                "type": "textbox",
                "content": "放映操作",
                "style": {
                    "x": 650, "y": 140, "width": 500, "height": 40,
                    "fontSize": 22, "fontWeight": "bold", "color": "#10b981"
                }
            },
            {
                "type": "textbox",
                "content": "F5          开始放映\n→ / 空格    下一页\n←           上一页\nESC         退出放映\nF11         全屏切换",
                "style": {
                    "x": 650, "y": 190, "width": 500, "height": 200,
                    "fontSize": 18, "color": "#333333", "lineHeight": 2.0,
                    "fontFamily": "Consolas, monospace"
                }
            }
        ], {"layout": "two_column", "backgroundColor": "#ffffff"}))
        
        # 第7页：结束页
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "感谢使用",
                "style": {
                    "x": 100, "y": 200, "width": 1000, "height": 100,
                    "fontSize": 56, "fontWeight": "bold", "color": "#1a1a2e",
                    "textAlign": "center"
                },
                "animation": {"type": "fadeIn", "duration": 0.8, "delay": 0}
            },
            {
                "type": "textbox",
                "content": "HTML PPT 编辑器",
                "style": {
                    "x": 200, "y": 320, "width": 800, "height": 50,
                    "fontSize": 28, "color": "#3b82f6",
                    "textAlign": "center"
                },
                "animation": {"type": "fadeIn", "duration": 0.8, "delay": 0.3}
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 450, "y": 400, "width": 300, "height": 6,
                    "fill": "#3b82f6"
                },
                "animation": {"type": "scaleIn", "duration": 0.5, "delay": 0.6}
            },
            {
                "type": "textbox",
                "content": "开始创建您的精彩演示吧！",
                "style": {
                    "x": 200, "y": 450, "width": 800, "height": 50,
                    "fontSize": 20, "color": "#666666",
                    "textAlign": "center"
                },
                "animation": {"type": "fadeIn", "duration": 0.8, "delay": 0.9}
            }
        ], {"layout": "section_header", "backgroundColor": "#ffffff"}))
        
        return presentation
    
    def create_feature_demo(self) -> Dict:
        """创建功能演示 PPT"""
        presentation = {
            "metadata": {
                "title": "功能演示 - 测试场景",
                "author": "测试团队",
                "createdAt": datetime.now().isoformat(),
                "modifiedAt": datetime.now().isoformat(),
                "description": "用于测试各种功能的演示文稿"
            },
            "settings": {
                "advanceMode": "click",
                "smartGuidesEnabled": True
            },
            "slides": []
        }
        
        # 测试页1：各种字体样式
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "字体样式测试",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 60,
                    "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            {
                "type": "textbox",
                "content": "粗体文本 Bold",
                "style": {
                    "x": 50, "y": 120, "width": 350, "height": 50,
                    "fontSize": 24, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "斜体文本 Italic",
                "style": {
                    "x": 450, "y": 120, "width": 350, "height": 50,
                    "fontSize": 24, "fontStyle": "italic", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "粗斜体 Bold Italic",
                "style": {
                    "x": 850, "y": 120, "width": 350, "height": 50,
                    "fontSize": 24, "fontWeight": "bold", "fontStyle": "italic", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "左对齐文本\n这是一段左对齐的示例文本\n用于测试文本对齐功能",
                "style": {
                    "x": 50, "y": 200, "width": 350, "height": 150,
                    "fontSize": 16, "textAlign": "left", "color": "#333333", "lineHeight": 1.6
                }
            },
            {
                "type": "textbox",
                "content": "居中对齐文本\n这是一段居中对齐的示例文本\n用于测试文本对齐功能",
                "style": {
                    "x": 450, "y": 200, "width": 350, "height": 150,
                    "fontSize": 16, "textAlign": "center", "color": "#333333", "lineHeight": 1.6
                }
            },
            {
                "type": "textbox",
                "content": "右对齐文本\n这是一段右对齐的示例文本\n用于测试文本对齐功能",
                "style": {
                    "x": 850, "y": 200, "width": 350, "height": 150,
                    "fontSize": 16, "textAlign": "right", "color": "#333333", "lineHeight": 1.6
                }
            },
            {
                "type": "textbox",
                "content": "不同字号测试：",
                "style": {
                    "x": 50, "y": 400, "width": 200, "height": 40,
                    "fontSize": 18, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "textbox",
                "content": "12px",
                "style": {
                    "x": 250, "y": 400, "width": 80, "height": 30,
                    "fontSize": 12, "color": "#666666"
                }
            },
            {
                "type": "textbox",
                "content": "16px",
                "style": {
                    "x": 350, "y": 400, "width": 80, "height": 30,
                    "fontSize": 16, "color": "#666666"
                }
            },
            {
                "type": "textbox",
                "content": "20px",
                "style": {
                    "x": 450, "y": 400, "width": 80, "height": 30,
                    "fontSize": 20, "color": "#666666"
                }
            },
            {
                "type": "textbox",
                "content": "24px",
                "style": {
                    "x": 550, "y": 400, "width": 80, "height": 30,
                    "fontSize": 24, "color": "#666666"
                }
            },
            {
                "type": "textbox",
                "content": "32px",
                "style": {
                    "x": 680, "y": 400, "width": 100, "height": 40,
                    "fontSize": 32, "color": "#666666"
                }
            },
            {
                "type": "textbox",
                "content": "48px",
                "style": {
                    "x": 820, "y": 400, "width": 120, "height": 50,
                    "fontSize": 48, "color": "#666666"
                }
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        # 测试页2：颜色测试
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "颜色测试",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 60,
                    "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            # 形状颜色测试
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 120, "width": 150, "height": 100,
                    "fill": "#ef4444", "borderRadius": 8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 220, "y": 120, "width": 150, "height": 100,
                    "fill": "#f97316", "borderRadius": 8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 390, "y": 120, "width": 150, "height": 100,
                    "fill": "#eab308", "borderRadius": 8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 560, "y": 120, "width": 150, "height": 100,
                    "fill": "#22c55e", "borderRadius": 8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 730, "y": 120, "width": 150, "height": 100,
                    "fill": "#3b82f6", "borderRadius": 8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 900, "y": 120, "width": 150, "height": 100,
                    "fill": "#8b5cf6", "borderRadius": 8
                }
            },
            # 文本颜色测试
            {
                "type": "textbox",
                "content": "红色文本",
                "style": {
                    "x": 50, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#ef4444", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "橙色文本",
                "style": {
                    "x": 220, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#f97316", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "黄色文本",
                "style": {
                    "x": 390, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#eab308", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "绿色文本",
                "style": {
                    "x": 560, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#22c55e", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "蓝色文本",
                "style": {
                    "x": 730, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#3b82f6", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "紫色文本",
                "style": {
                    "x": 900, "y": 260, "width": 150, "height": 40,
                    "fontSize": 20, "color": "#8b5cf6", "textAlign": "center"
                }
            },
            # 透明度测试
            {
                "type": "textbox",
                "content": "透明度测试：",
                "style": {
                    "x": 50, "y": 350, "width": 200, "height": 40,
                    "fontSize": 20, "fontWeight": "bold", "color": "#333333"
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 250, "y": 350, "width": 100, "height": 100,
                    "fill": "#3b82f6", "opacity": 1
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 370, "y": 350, "width": 100, "height": 100,
                    "fill": "#3b82f6", "opacity": 0.8
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 490, "y": 350, "width": 100, "height": 100,
                    "fill": "#3b82f6", "opacity": 0.6
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 610, "y": 350, "width": 100, "height": 100,
                    "fill": "#3b82f6", "opacity": 0.4
                }
            },
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 730, "y": 350, "width": 100, "height": 100,
                    "fill": "#3b82f6", "opacity": 0.2
                }
            },
            {
                "type": "textbox",
                "content": "100%",
                "style": {
                    "x": 250, "y": 460, "width": 100, "height": 30,
                    "fontSize": 14, "color": "#666666", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "80%",
                "style": {
                    "x": 370, "y": 460, "width": 100, "height": 30,
                    "fontSize": 14, "color": "#666666", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "60%",
                "style": {
                    "x": 490, "y": 460, "width": 100, "height": 30,
                    "fontSize": 14, "color": "#666666", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "40%",
                "style": {
                    "x": 610, "y": 460, "width": 100, "height": 30,
                    "fontSize": 14, "color": "#666666", "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "20%",
                "style": {
                    "x": 730, "y": 460, "width": 100, "height": 30,
                    "fontSize": 14, "color": "#666666", "textAlign": "center"
                }
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        # 测试页3：形状测试
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "形状测试",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 60,
                    "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            # 矩形
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 50, "y": 120, "width": 200, "height": 150,
                    "fill": "#3b82f6", "borderRadius": 0
                }
            },
            {
                "type": "textbox",
                "content": "矩形",
                "style": {
                    "x": 50, "y": 280, "width": 200, "height": 30,
                    "fontSize": 16, "color": "#666666", "textAlign": "center"
                }
            },
            # 圆角矩形
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 280, "y": 120, "width": 200, "height": 150,
                    "fill": "#10b981", "borderRadius": 20
                }
            },
            {
                "type": "textbox",
                "content": "圆角矩形",
                "style": {
                    "x": 280, "y": 280, "width": 200, "height": 30,
                    "fontSize": 16, "color": "#666666", "textAlign": "center"
                }
            },
            # 圆形
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 510, "y": 120, "width": 150, "height": 150,
                    "fill": "#f59e0b", "borderRadius": 75
                }
            },
            {
                "type": "textbox",
                "content": "圆形",
                "style": {
                    "x": 510, "y": 280, "width": 150, "height": 30,
                    "fontSize": 16, "color": "#666666", "textAlign": "center"
                }
            },
            # 带边框的形状
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 700, "y": 120, "width": 200, "height": 150,
                    "fill": "#ffffff", "stroke": "#3b82f6",
                    "strokeWidth": 3, "borderRadius": 10
                }
            },
            {
                "type": "textbox",
                "content": "带边框",
                "style": {
                    "x": 700, "y": 280, "width": 200, "height": 30,
                    "fontSize": 16, "color": "#666666", "textAlign": "center"
                }
            },
            # 旋转测试
            {
                "type": "shape",
                "content": None,
                "style": {
                    "x": 950, "y": 120, "width": 150, "height": 100,
                    "fill": "#ef4444", "angle": 15, "borderRadius": 8
                }
            },
            {
                "type": "textbox",
                "content": "旋转15°",
                "style": {
                    "x": 950, "y": 280, "width": 150, "height": 30,
                    "fontSize": 16, "color": "#666666", "textAlign": "center"
                }
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        # 测试页4：按钮测试
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "按钮测试",
                "style": {
                    "x": 50, "y": 30, "width": 1100, "height": 60,
                    "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e"
                }
            },
            # 主要按钮
            {
                "type": "button",
                "content": "主要按钮",
                "style": {
                    "x": 50, "y": 150, "width": 200, "height": 50,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "成功按钮",
                "style": {
                    "x": 280, "y": 150, "width": 200, "height": 50,
                    "fill": "#22c55e", "color": "#ffffff",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "警告按钮",
                "style": {
                    "x": 510, "y": 150, "width": 200, "height": 50,
                    "fill": "#f59e0b", "color": "#ffffff",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "危险按钮",
                "style": {
                    "x": 740, "y": 150, "width": 200, "height": 50,
                    "fill": "#ef4444", "color": "#ffffff",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            # 次要按钮
            {
                "type": "button",
                "content": "次要按钮",
                "style": {
                    "x": 50, "y": 250, "width": 200, "height": 50,
                    "fill": "#e5e7eb", "color": "#333333",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "轮廓按钮",
                "style": {
                    "x": 280, "y": 250, "width": 200, "height": 50,
                    "fill": "#ffffff", "color": "#3b82f6",
                    "fontSize": 18, "borderRadius": 8
                }
            },
            # 不同大小
            {
                "type": "button",
                "content": "小按钮",
                "style": {
                    "x": 50, "y": 350, "width": 100, "height": 35,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 14, "borderRadius": 6
                }
            },
            {
                "type": "button",
                "content": "中等按钮",
                "style": {
                    "x": 180, "y": 350, "width": 150, "height": 45,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 16, "borderRadius": 8
                }
            },
            {
                "type": "button",
                "content": "大按钮",
                "style": {
                    "x": 360, "y": 350, "width": 200, "height": 55,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 20, "borderRadius": 10
                }
            },
            # 圆形按钮
            {
                "type": "button",
                "content": "+",
                "style": {
                    "x": 600, "y": 350, "width": 60, "height": 60,
                    "fill": "#3b82f6", "color": "#ffffff",
                    "fontSize": 32, "borderRadius": 30
                }
            }
        ], {"layout": "blank", "backgroundColor": "#ffffff"}))
        
        return presentation
    
    def create_minimal_test(self) -> Dict:
        """创建最小测试 PPT（用于快速测试）"""
        presentation = {
            "metadata": {
                "title": "最小测试",
                "author": "测试",
                "createdAt": datetime.now().isoformat(),
                "modifiedAt": datetime.now().isoformat()
            },
            "settings": {
                "advanceMode": "click",
                "smartGuidesEnabled": True
            },
            "slides": []
        }
        
        # 单页测试
        presentation["slides"].append(self._create_slide([
            {
                "type": "textbox",
                "content": "测试标题",
                "style": {
                    "x": 100, "y": 200, "width": 1000, "height": 100,
                    "fontSize": 48, "fontWeight": "bold", "color": "#333333",
                    "textAlign": "center"
                }
            },
            {
                "type": "textbox",
                "content": "这是一个测试幻灯片",
                "style": {
                    "x": 200, "y": 350, "width": 800, "height": 50,
                    "fontSize": 24, "color": "#666666",
                    "textAlign": "center"
                }
            }
        ]))
        
        return presentation
    
    def save_to_file(self, presentation: Dict, file_path: str):
        """保存演示文稿到文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(presentation, f, ensure_ascii=False, indent=2)
        print(f"✓ 已保存: {file_path}")


def create_all_examples(output_dir: str = "examples"):
    """创建所有示例"""
    import os
    
    generator = ExampleGenerator()
    
    # 创建输出目录
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 创建软件介绍 PPT
    intro = generator.create_software_intro()
    generator.save_to_file(intro, os.path.join(output_dir, "软件介绍.pptjson"))
    
    # 创建功能演示 PPT
    demo = generator.create_feature_demo()
    generator.save_to_file(demo, os.path.join(output_dir, "功能演示.pptjson"))
    
    # 创建最小测试 PPT
    minimal = generator.create_minimal_test()
    generator.save_to_file(minimal, os.path.join(output_dir, "最小测试.pptjson"))
    
    print(f"\n✓ 所有示例已创建完成！")
    print(f"  输出目录: {os.path.abspath(output_dir)}")
    print(f"  文件数量: 3")


if __name__ == "__main__":
    create_all_examples()
