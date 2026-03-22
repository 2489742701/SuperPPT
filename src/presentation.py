import json
import uuid
import copy
from typing import Dict, List, Optional, Any


class Element:
    ANIMATION_TYPES = ['none', 'fadeIn', 'slideInLeft', 'slideInRight', 
                       'slideInUp', 'slideInDown', 'scaleIn']
    
    def __init__(self, element_type: str = "textbox", style: Dict = None, content: Any = None, element_id: str = None, animation: Dict = None):
        self.id = element_id or self._generate_id()
        self.type = element_type
        self.style = style or self._get_default_style(element_type)
        self.content = content if content is not None else self._get_default_content(element_type)
        self.animation = animation or self._get_default_animation()

    def _generate_id(self) -> str:
        return f"elem-{uuid.uuid4().hex[:8]}"

    def _get_default_animation(self) -> Dict:
        return {
            "type": "none",
            "duration": 0.5,
            "delay": 0
        }

    def _get_default_style(self, element_type: str) -> Dict:
        base_style = {
            "x": 100,
            "y": 100,
            "width": 200,
            "height": 100,
            "angle": 0,
            "opacity": 1,
            "zIndex": 1
        }
        
        type_styles = {
            "textbox": {
                **base_style,
                "fontSize": 24,
                "fontFamily": "Arial",
                "fontWeight": "normal",
                "fontStyle": "normal",
                "textAlign": "left",
                "color": "#333333",
                "backgroundColor": "transparent",
                "lineHeight": 1.5,
                "textMode": "auto"
            },
            "text": {
                **base_style,
                "fontSize": 24,
                "fontFamily": "Arial",
                "fontWeight": "normal",
                "fontStyle": "normal",
                "textAlign": "left",
                "color": "#333333",
                "backgroundColor": "transparent",
                "lineHeight": 1.5,
                "textMode": "auto"
            },
            "shape": {
                **base_style,
                "shapeType": "rectangle",
                "fill": "#007acc",
                "stroke": "#005a9e",
                "strokeWidth": 2,
                "borderRadius": 0
            },
            "media": {
                **base_style,
                "mediaType": "image",
                "borderRadius": 0,
                "objectFit": "cover"
            },
            "image": {
                **base_style,
                "objectFit": "cover",
                "borderRadius": 0,
                "border": "none"
            },
            "button": {
                **base_style,
                "fill": "#3b82f6",
                "color": "#ffffff",
                "fontSize": 16,
                "borderRadius": 4,
                "link": None
            },
            "container": {
                **base_style,
                "backgroundColor": "#f5f5f5",
                "border": "1px solid #ddd",
                "borderRadius": 8,
                "padding": 16
            }
        }
        
        return type_styles.get(element_type, base_style)

    def _get_default_content(self, element_type: str) -> Any:
        defaults = {
            "textbox": "请输入文本",
            "text": "请输入文本",
            "shape": None,
            "media": "",
            "image": "",
            "button": "按钮",
            "container": ""
        }
        return defaults.get(element_type, None)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type,
            "style": copy.deepcopy(self.style),
            "content": self.content,
            "animation": copy.deepcopy(self.animation)
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Element':
        return cls(
            element_id=data.get("id"),
            element_type=data.get("type", "textbox"),
            style=data.get("style"),
            content=data.get("content"),
            animation=data.get("animation")
        )

    def update_style(self, **kwargs):
        for key, value in kwargs.items():
            self.style[key] = value

    def set_animation(self, animation_type: str = None, duration: float = None, delay: float = None) -> bool:
        if animation_type and animation_type not in self.ANIMATION_TYPES:
            return False
        if animation_type is not None:
            self.animation["type"] = animation_type
        if duration is not None:
            self.animation["duration"] = duration
        if delay is not None:
            self.animation["delay"] = delay
        return True

    def clone(self) -> 'Element':
        new_element = Element.from_dict(self.to_dict())
        new_element.id = self._generate_id()
        return new_element


class Slide:
    def __init__(self, slide_id: str = None, elements: List[Element] = None, master_id: str = None):
        self.id = slide_id or self._generate_id()
        self.elements = elements or []
        self.master_id = master_id
        self.metadata = {
            "backgroundColor": "#ffffff",
            "width": 1200,
            "height": "auto",
            "minHeight": 675,
            "transition": "fade",
            "layout": "custom"
        }

    def _generate_id(self) -> str:
        return f"slide-{uuid.uuid4().hex[:8]}"

    def add_element(self, element: Element) -> Element:
        self.elements.append(element)
        return element

    def remove_element(self, element_id: str) -> bool:
        for i, elem in enumerate(self.elements):
            if elem.id == element_id:
                self.elements.pop(i)
                return True
        return False

    def get_element(self, element_id: str) -> Optional[Element]:
        for elem in self.elements:
            if elem.id == element_id:
                return elem
        return None

    def to_dict(self) -> Dict:
        result = {
            "id": self.id,
            "elements": [elem.to_dict() for elem in self.elements],
            "metadata": copy.deepcopy(self.metadata)
        }
        if self.master_id:
            result["masterId"] = self.master_id
        return result

    @classmethod
    def from_dict(cls, data: Dict) -> 'Slide':
        slide = cls(slide_id=data.get("id"), master_id=data.get("masterId"))
        slide.metadata = data.get("metadata", slide.metadata)
        for elem_data in data.get("elements", []):
            slide.elements.append(Element.from_dict(elem_data))
        return slide

    def clone(self) -> 'Slide':
        new_slide = Slide(master_id=self.master_id)
        new_slide.metadata = copy.deepcopy(self.metadata)
        for elem in self.elements:
            new_slide.elements.append(elem.clone())
        return new_slide


class Presentation:
    def __init__(self):
        self.slides: List[Slide] = []
        self.metadata = {
            "title": "未命名演示文稿",
            "author": "",
            "created": "",
            "modified": "",
            "version": "1.0"
        }
        self.current_slide_index = 0
        self.slide_masters: Dict[str, Dict] = {}
        self._init_default_masters()

    def _init_default_masters(self):
        """初始化默认母版"""
        self.slide_masters = {
            "default": {
                "id": "default",
                "name": "默认母版",
                "backgroundColor": "#ffffff",
                "elements": []
            },
            "dark": {
                "id": "dark",
                "name": "深色母版",
                "backgroundColor": "#1a1a2e",
                "elements": []
            },
            "gradient": {
                "id": "gradient",
                "name": "渐变母版",
                "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "elements": []
            }
        }

    def add_slide(self, slide: Slide = None, index: int = None) -> Slide:
        new_slide = slide or Slide()
        if index is not None:
            self.slides.insert(index, new_slide)
        else:
            self.slides.append(new_slide)
        return new_slide

    def remove_slide(self, slide_id: str) -> bool:
        for i, slide in enumerate(self.slides):
            if slide.id == slide_id:
                self.slides.pop(i)
                if self.current_slide_index >= len(self.slides) and len(self.slides) > 0:
                    self.current_slide_index = len(self.slides) - 1
                return True
        return False

    def get_slide(self, slide_id: str) -> Optional[Slide]:
        for slide in self.slides:
            if slide.id == slide_id:
                return slide
        return None

    def get_current_slide(self) -> Optional[Slide]:
        if 0 <= self.current_slide_index < len(self.slides):
            return self.slides[self.current_slide_index]
        return None

    def move_slide(self, from_index: int, to_index: int) -> bool:
        if 0 <= from_index < len(self.slides) and 0 <= to_index < len(self.slides):
            slide = self.slides.pop(from_index)
            self.slides.insert(to_index, slide)
            return True
        return False
    
    def get_slide_masters(self) -> List[Dict]:
        """获取所有母版"""
        return list(self.slide_masters.values())
    
    def get_slide_master(self, master_id: str) -> Optional[Dict]:
        """获取指定母版"""
        return self.slide_masters.get(master_id)
    
    def add_slide_master(self, master: Dict) -> Dict:
        """添加新母版"""
        master_id = master.get("id") or f"master-{uuid.uuid4().hex[:8]}"
        master["id"] = master_id
        self.slide_masters[master_id] = master
        return master
    
    def update_slide_master(self, master_id: str, master: Dict) -> bool:
        """更新母版"""
        if master_id in self.slide_masters:
            master["id"] = master_id
            self.slide_masters[master_id] = master
            return True
        return False
    
    def delete_slide_master(self, master_id: str) -> bool:
        """删除母版"""
        if master_id in self.slide_masters and master_id != "default":
            del self.slide_masters[master_id]
            return True
        return False
    
    def apply_master_to_slide(self, slide_id: str, master_id: str) -> bool:
        """将母版应用到幻灯片"""
        slide = self.get_slide(slide_id)
        master = self.slide_masters.get(master_id)
        if slide and master:
            slide.master_id = master_id
            if "backgroundColor" in master:
                slide.metadata["backgroundColor"] = master["backgroundColor"]
            return True
        return False

    def to_dict(self) -> Dict:
        return {
            "slides": [slide.to_dict() for slide in self.slides],
            "metadata": copy.deepcopy(self.metadata),
            "currentSlideIndex": self.current_slide_index,
            "slideMasters": copy.deepcopy(self.slide_masters)
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Presentation':
        presentation = cls()
        presentation.metadata = data.get("metadata", presentation.metadata)
        presentation.current_slide_index = data.get("currentSlideIndex", 0)
        for slide_data in data.get("slides", []):
            presentation.slides.append(Slide.from_dict(slide_data))
        if "slideMasters" in data:
            presentation.slide_masters = data["slideMasters"]
        return presentation

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    @classmethod
    def from_json(cls, json_str: str) -> 'Presentation':
        data = json.loads(json_str)
        return cls.from_dict(data)

    def create_default_slide(self, layout: str = "title_subtitle") -> Slide:
        slide = Slide()
        layout_templates = self._get_layout_templates()
        if layout in layout_templates:
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
        else:
            title = Element(
                element_type="textbox",
                style={
                    "x": 100,
                    "y": 50,
                    "width": 1000,
                    "height": 80,
                    "fontSize": 48,
                    "fontFamily": "Arial",
                    "fontWeight": "bold",
                    "color": "#333333",
                    "textAlign": "center",
                    "textMode": "fixed"
                },
                content="点击此处输入标题"
            )
            slide.add_element(title)
        return slide
    
    def _get_layout_templates(self) -> Dict:
        return {
            "title_subtitle": {
                "name": "标题和副标题",
                "elements": [
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 100, "y": 200, "width": 1000, "height": 100,
                            "fontSize": 54, "fontFamily": "Arial", "fontWeight": "bold",
                            "color": "#333333", "textAlign": "center"
                        },
                        "content": "点击此处输入标题"
                    },
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 200, "y": 350, "width": 800, "height": 60,
                            "fontSize": 28, "fontFamily": "Arial", "fontWeight": "normal",
                            "color": "#666666", "textAlign": "center"
                        },
                        "content": "点击此处输入副标题"
                    }
                ]
            },
            "title_content": {
                "name": "标题和内容",
                "elements": [
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 30, "width": 1100, "height": 80,
                            "fontSize": 40, "fontFamily": "Arial", "fontWeight": "bold",
                            "color": "#333333", "textAlign": "left"
                        },
                        "content": "点击此处输入标题"
                    },
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 130, "width": 1100, "height": 500,
                            "fontSize": 24, "fontFamily": "Arial", "fontWeight": "normal",
                            "color": "#333333", "textAlign": "left", "lineHeight": 1.6
                        },
                        "content": "点击此处输入内容"
                    }
                ]
            },
            "title_content_divider": {
                "name": "标题、分隔线和内容",
                "elements": [
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 30, "width": 1100, "height": 70,
                            "fontSize": 36, "fontFamily": "Arial", "fontWeight": "bold",
                            "color": "#333333", "textAlign": "left"
                        },
                        "content": "点击此处输入标题"
                    },
                    {
                        "type": "shape",
                        "style": {
                            "x": 50, "y": 110, "width": 200, "height": 4,
                            "fill": "#3b82f6", "strokeWidth": 0
                        },
                        "content": None
                    },
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 140, "width": 1100, "height": 480,
                            "fontSize": 22, "fontFamily": "Arial", "fontWeight": "normal",
                            "color": "#333333", "textAlign": "left", "lineHeight": 1.6
                        },
                        "content": "点击此处输入内容"
                    }
                ]
            },
            "two_column": {
                "name": "两栏内容",
                "elements": [
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 30, "width": 1100, "height": 70,
                            "fontSize": 36, "fontFamily": "Arial", "fontWeight": "bold",
                            "color": "#333333", "textAlign": "left"
                        },
                        "content": "点击此处输入标题"
                    },
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 50, "y": 130, "width": 520, "height": 480,
                            "fontSize": 20, "fontFamily": "Arial", "fontWeight": "normal",
                            "color": "#333333", "textAlign": "left", "lineHeight": 1.5
                        },
                        "content": "左栏内容"
                    },
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 630, "y": 130, "width": 520, "height": 480,
                            "fontSize": 20, "fontFamily": "Arial", "fontWeight": "normal",
                            "color": "#333333", "textAlign": "left", "lineHeight": 1.5
                        },
                        "content": "右栏内容"
                    }
                ]
            },
            "blank": {
                "name": "空白幻灯片",
                "elements": []
            },
            "section_header": {
                "name": "章节标题",
                "elements": [
                    {
                        "type": "textbox",
                        "textMode": "fixed",
                        "style": {
                            "x": 100, "y": 250, "width": 1000, "height": 120,
                            "fontSize": 60, "fontFamily": "Arial", "fontWeight": "bold",
                            "color": "#333333", "textAlign": "center"
                        },
                        "content": "章节标题"
                    },
                    {
                        "type": "shape",
                        "style": {
                            "x": 450, "y": 400, "width": 300, "height": 6,
                            "fill": "#3b82f6", "strokeWidth": 0
                        },
                        "content": None
                    }
                ]
            }
        }
    
    def get_layout_templates(self) -> Dict:
        templates = self._get_layout_templates()
        return {k: {"id": k, "name": v["name"]} for k, v in templates.items()}
