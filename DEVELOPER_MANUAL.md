# HTML PPT 编辑器 - 开发者手册

## 一、项目概述

这是一个基于 PyQt6 + QWebEngineView 的桌面应用程序，用于创建和编辑 HTML 格式的演示文稿。

### 技术栈
- **后端**: Python + PyQt6
- **前端**: HTML/CSS/JavaScript
- **通信**: QWebChannel (Python ↔ JavaScript)
- **模板引擎**: Jinja2 (HTML 导出)

### 文件结构
```
d:\超级项目-网页ppt/
├── main.py              # PyQt6 主程序入口
├── cli.py               # 命令行工具 (开发者 API 调用)
├── main_web.py          # Web 版本入口
├── build.py             # 打包脚本
├── test_api.py          # API 测试
├── requirements.txt     # Python 依赖
├── assets/              # 前端资源
│   ├── index.html       # 主页面
│   ├── css/main.css     # 样式
│   ├── js/              # JavaScript 模块
│   │   ├── app.js       # 主程序
│   │   └── modules/     # 功能模块
│   │       ├── canvas.js        # 画布操作
│   │       ├── slides-panel.js  # 幻灯片面板
│   │       ├── property-panel.js # 属性面板
│   │       ├── toolbar.js       # 工具栏
│   │       ├── pybridge.js      # Python 桥接
│   │       ├── store.js         # 状态管理
│   │       └── ...
│   └── libs/            # 第三方库
│       ├── fabric.min.js
│       └── qwebchannel.js
├── src/                 # Python 后端
│   ├── __init__.py
│   ├── api.py           # 核心 API 类
│   ├── presentation.py  # 数据模型
│   └── export_html.py   # HTML 导出
└── templates/           # Jinja2 模板 (可选)
```

---

## 二、核心 API 参考

### 2.1 演示文稿操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_presentation()` | 无 | `Dict` | 获取当前演示文稿完整数据 |
| `new_presentation()` | 无 | `Dict` | 创建新演示文稿 (含默认幻灯片) |
| `load_presentation(json_data)` | `str` | `Dict` | 从 JSON 字符串加载 |
| `save_presentation()` | 无 | `str` | 保存为 JSON 字符串 |
| `load_from_file(file_path)` | `str` (可选) | `Dict` | 从文件加载 (弹出对话框) |
| `save_to_file(file_path)` | `str` (可选) | `Dict` | 保存到文件 (弹出对话框) |

### 2.2 幻灯片操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_slide(after_slide_id, layout)` | `str, str` | `Dict` | 添加幻灯片 |
| `remove_slide(slide_id)` | `str` | `Dict` | 删除幻灯片 |
| `duplicate_slide(slide_id)` | `str` | `Dict` | 复制幻灯片 |
| `move_slide(from_index, to_index)` | `int, int` | `Dict` | 移动幻灯片 |
| `set_current_slide(index)` | `int` | `Dict` | 设置当前幻灯片 |
| `change_slide_layout(slide_id, layout)` | `str, str` | `Dict` | 更改幻灯片版式 |
| `get_layout_templates()` | 无 | `Dict` | 获取可用版式列表 |
| `set_default_layout(layout)` | `str` | `Dict` | 设置默认版式 |

### 2.3 元素操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_element(slide_id, element_type, style, content)` | `str, str, Dict, Any` | `Dict` | 添加元素 |
| `update_element(slide_id, element_id, style, content)` | `str, str, Dict, Any` | `Dict` | 更新元素 |
| `remove_element(slide_id, element_id)` | `str, str` | `Dict` | 删除元素 |
| `duplicate_element(slide_id, element_id)` | `str, str` | `Dict` | 复制元素 |
| `reorder_element(slide_id, element_id, direction)` | `str, str, str` | `Dict` | 调整元素层级 |
| `set_element_animation(slide_id, element_id, animation_type, duration, delay)` | `str, str, str, float, float` | `Dict` | 设置元素动画 |

### 2.4 元数据操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `update_slide_metadata(slide_id, metadata)` | `str, Dict` | `Dict` | 更新幻灯片元数据 |
| `update_presentation_metadata(metadata)` | `Dict` | `Dict` | 更新演示文稿元数据 |

### 2.5 导出操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `export_html()` | 无 | `str` | 导出为 HTML 字符串 |
| `export_single_file()` | 无 | `str` | 导出为单文件 HTML |

### 2.6 撤销/重做

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `undo()` | 无 | `Dict` | 撤销上一步操作 |
| `redo()` | 无 | `Dict` | 重做已撤销操作 |

### 2.7 剪贴板操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `copy_elements(slide_id, element_ids)` | `str, List[str]` | `Dict` | 复制元素到剪贴板 |
| `paste_elements(target_slide_id)` | `str` | `Dict` | 粘贴剪贴板元素 |
| `get_clipboard()` | 无 | `Dict` | 获取剪贴板内容 |
| `clear_clipboard()` | 无 | `Dict` | 清空剪贴板 |

### 2.8 对齐操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `align_elements(slide_id, element_ids, align_type)` | `str, List[str], str` | `Dict` | 对齐多个元素 |

**align_type 可选值**: `left`, `center`, `right`, `top`, `middle`, `bottom`

### 2.9 用户设置

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_user_name()` | 无 | `str` | 获取用户名 |
| `set_user_name(name)` | `str` | `Dict` | 设置用户名 |
| `get_recent_files()` | 无 | `Dict` | 获取最近文件列表 |
| `add_recent_file(path)` | `str` | `Dict` | 添加到最近文件 |
| `remove_recent_file(index)` | `int` | `Dict` | 从最近文件移除 |
| `check_file_exists(path)` | `str` | `Dict` | 检查文件是否存在 |

### 2.10 放映操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `start_presentation(start_slide)` | `int` | `Dict` | 启动全屏放映窗口 |

---

## 三、数据结构

### 3.1 演示文稿 (Presentation)

```python
{
    "id": "presentation-xxx",
    "metadata": {
        "title": "未命名演示文稿",
        "author": "用户",
        "createdAt": "2024-01-01T00:00:00",
        "modifiedAt": "2024-01-01T00:00:00"
    },
    "slides": [...],
    "currentSlideIndex": 0
}
```

### 3.2 幻灯片 (Slide)

```python
{
    "id": "slide-xxx",
    "metadata": {
        "layout": "title_subtitle",
