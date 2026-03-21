# HTML PPT 编辑器 - 程序手册

## 1. 项目概述

这是一个基于 PyQt6 + QWebEngineView 的桌面应用程序，用于创建和编辑 HTML 格式的演示文稿。采用前后端分离架构：

- **后端**: Python (PyQt6) 提供文件操作、数据存储等 API
- **前端**: HTML/CSS/JavaScript + Fabric.js 提供可视化编辑界面

## 2. 技术栈

| 组件 | 技术 |
|------|------|
| GUI 框架 | PyQt6 |
| Web 引擎 | QWebEngineView (Chromium) |
| 通信机制 | QWebChannel |
| 画布库 | Fabric.js |
| 模板引擎 | Jinja2 |
| 数据格式 | JSON |

## 3. 文件结构

```
超级项目-网页ppt/
├── main.py                 # 主程序入口
├── src/
│   ├── api.py             # 后端 API 实现
│   └── presentation.py    # 数据模型 (Presentation, Slide, Element)
├── assets/
│   ├── index.html         # 前端主页面
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       ├── app.js         # 应用主入口
│       └── modules/
│           ├── store.js       # 状态管理
│           ├── canvas.js      # 画布管理 (Fabric.js)
│           ├── toolbar.js     # 工具栏控制
│           ├── sidebar.js     # 侧边栏 (幻灯片列表)
│           ├── property-panel.js  # 属性面板
│           ├── pybridge.js    # Python 后端通信桥接
│           ├── storage.js     # 数据存储
│           ├── context-menu.js # 右键菜单
│           ├── welcome.js     # 欢迎页面
│           └── preview.js     # 预览模式
└── templates/
    └── presentation.html  # 导出 HTML 模板
```

## 4. 核心架构

### 4.1 通信架构

```
┌─────────────────────────────────────────────────────────┐
│                    PyQt6 主窗口                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              QWebEngineView                      │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │           HTML/JS 前端                     │  │   │
│  │  │  ┌─────────────┐    ┌─────────────────┐   │  │   │
│  │  │  │ EditorStore │◄──►│   PyBridge      │   │  │   │
│  │  │  │  (状态管理)  │    │ (通信桥接)       │   │  │   │
│  │  │  └─────────────┘    └────────┬────────┘   │  │   │
│  │  └──────────────────────────────┼────────────┘  │   │
│  └─────────────────────────────────┼───────────────┘   │
│                                    │                    │
│                           QWebChannel                   │
│                                    │                    │
│  ┌─────────────────────────────────▼───────────────┐   │
│  │              ApiWrapper (QObject)                │   │
│  │              @pyqtSlot 暴露方法                   │   │
│  └─────────────────────────────────┬───────────────┘   │
│                                    │                    │
│                           ┌────────▼────────┐           │
│                           │   API 实例       │           │
│                           │ (业务逻辑)       │           │
│                           └─────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 4.2 数据模型

```python
Presentation
├── slides: List[Slide]
├── current_slide_index: int
├── metadata: Dict
│   ├── title: str
│   └── ...
└── settings: Dict

Slide
├── id: str
├── elements: List[Element]
└── metadata: Dict
    └── backgroundColor: str

Element
├── id: str
├── type: str (textbox, shape, media, button, table, icon)
├── content: Any
├── style: Dict
│   ├── x, y: float
│   ├── width, height: float
│   ├── angle: float
│   ├── opacity: float
│   └── ...
└── animation: Dict
    ├── type: str (none, fadeIn, slideInLeft, ...)
    ├── duration: float
    └── delay: float
```

## 5. 后端 API 接口

### 5.1 演示文稿操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_presentation()` | 无 | Dict | 获取当前演示文稿数据 |
| `new_presentation()` | 无 | Dict | 创建新演示文稿 |
| `load_presentation(json_data)` | str | Dict | 从 JSON 加载 |
| `save_presentation()` | 无 | str | 保存为 JSON 字符串 |

### 5.2 幻灯片操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_slide(after_slide_id)` | str | Dict | 添加新幻灯片 |
| `remove_slide(slide_id)` | str | Dict | 删除幻灯片 |
| `duplicate_slide(slide_id)` | str | Dict | 复制幻灯片 |
| `move_slide(from_index, to_index)` | int, int | Dict | 移动幻灯片 |
| `set_current_slide(index)` | int | Dict | 设置当前幻灯片 |

### 5.3 元素操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_element(slide_id, element_type)` | str, str | Dict | 添加元素 |
| `update_element(slide_id, element_id, style)` | str, str, Dict | Dict | 更新元素 |
| `remove_element(slide_id, element_id)` | str, str | Dict | 删除元素 |
| `duplicate_element(slide_id, element_id)` | str, str | Dict | 复制元素 |
| `reorder_element(slide_id, element_id, direction)` | str, str, str | Dict | 调整层级 |

### 5.4 撤销/重做

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `undo()` | 无 | Dict | 撤销上一步操作 |
| `redo()` | 无 | Dict | 重做已撤销操作 |

### 5.5 文件操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `save_to_file()` | 无 | Dict | 保存到文件 (弹出对话框) |
| `save_to_file_path(file_path)` | str | Dict | 保存到指定路径 |
| `load_from_file()` | 无 | Dict | 从文件加载 (弹出对话框) |
| `load_from_file_path(file_path)` | str | Dict | 从指定路径加载 |

### 5.6 导出操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `export_html()` | 无 | str | 导出为 HTML 字符串 |
| `export_single_file()` | 无 | str | 导出单文件 HTML |

### 5.7 剪贴板操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `copy_elements(slide_id, element_ids)` | str, List | Dict | 复制元素到剪贴板 |
| `paste_elements(target_slide_id)` | str | Dict | 粘贴元素 |
| `get_clipboard()` | 无 | Dict | 获取剪贴板内容 |
| `clear_clipboard()` | 无 | Dict | 清空剪贴板 |

### 5.8 放映操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `start_presentation(start_slide)` | int | Dict | 启动全屏放映 |

## 6. 前端状态管理 (EditorStore)

### 6.1 状态结构

```javascript
{
    presentation: Object,      // 演示文稿数据
    activeSlideId: string,     // 当前幻灯片 ID
    activeElementId: string,   // 当前选中元素 ID
    clipboard: Object,         // 剪贴板内容
    history: Array,            // 历史记录栈
    historyIndex: number,      // 历史记录当前位置
    language: string,          // 语言 ('zh' | 'en')
    panels: {
        left: boolean,         // 左侧面板显示状态
        right: boolean,        // 右侧面板显示状态
        bottom: boolean,       // 底部面板显示状态
        propertyPanelPosition: string  // 属性面板位置
    },
    showAlignment: boolean,    // 显示对齐工具
    isPreview: boolean,        // 预览模式
    previewSlideIndex: number, // 预览幻灯片索引
    canUndo: boolean,          // 可撤销
    canRedo: boolean           // 可重做
}
```

### 6.2 主要方法

```javascript
// 订阅状态变化
store.subscribe(listener)

// 获取当前状态
store.getState()

// 幻灯片操作
store.addSlide()
store.deleteSlide(id)
store.duplicateSlide(id)
store.selectSlide(id)

// 元素操作
store.addElement(slideId, element)
store.updateElement(slideId, elementId, updates)
store.deleteElement(slideId, elementId)
store.selectElement(id)

// 撤销/重做
store.undo()
store.redo()

// 历史记录
store.pushHistory()  // 手动保存状态

// 加载数据
store.loadPresentation(data)
```

## 7. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Ctrl+Y` | 重做 |
| `Delete` / `Backspace` | 删除选中元素 |
| `Escape` | 退出预览/关闭菜单 |

## 8. 元素类型

### 8.1 文本框 (textbox)

```javascript
{
    type: 'textbox',
    content: '文本内容',
    textMode: 'auto',  // 'auto' | 'fixed'
    style: {
        x: 100, y: 100,
        width: 400, height: 100,
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',  // 'normal' | 'bold'
        fontStyle: 'normal',   // 'normal' | 'italic'
        textAlign: 'left',     // 'left' | 'center' | 'right'
        color: '#333333',
        backgroundColor: 'transparent',
        lineHeight: 1.5,
        opacity: 1,
        angle: 0
    }
}
```

### 8.2 形状 (shape)

```javascript
{
    type: 'shape',
    shapeType: 'rectangle',  // 'rectangle' | 'circle' | 'triangle' | 'line' | 'star' | 'polygon'
    style: {
        x: 100, y: 100,
        width: 200, height: 150,
        fill: '#007acc',
        stroke: '#005a9e',
        strokeWidth: 2,
        borderRadius: 0,
        opacity: 1,
        angle: 0
    }
}
```

### 8.3 媒体 (media)

```javascript
{
    type: 'media',
    mediaType: 'image',  // 'image' | 'video' | 'audio'
    content: 'https://example.com/image.jpg',
    style: {
        x: 100, y: 100,
        width: 400, height: 300,
        borderRadius: 0,
        objectFit: 'cover',
        opacity: 1,
        angle: 0
    }
}
```

### 8.4 按钮 (button)

```javascript
{
    type: 'button',
    content: 'Click Me',
    action: 'next',  // 'next' | 'prev' | 'url'
    style: {
        x: 100, y: 100,
        width: 120, height: 40,
        fill: '#3b82f6',
        color: '#ffffff',
        fontSize: 16,
        borderRadius: 4,
        opacity: 1
    }
}
```

## 9. 动画类型

| 动画名称 | 效果 |
|----------|------|
| `none` | 无动画 |
| `fadeIn` | 淡入 |
| `slideInLeft` | 从左侧滑入 |
| `slideInRight` | 从右侧滑入 |
| `slideInUp` | 从下方滑入 |
| `slideInDown` | 从上方滑入 |
| `scaleIn` | 缩放进入 |

## 10. 放映模式

放映模式创建独立的 `PresentationWindow` 窗口：

- 全屏无边框显示
- 支持 ESC 退出
- 支持 F11 切换全屏
- 支持键盘导航 (左右箭头、空格)
- 支持鼠标点击/右键导航

## 11. 数据持久化

### 11.1 文件格式 (.pptjson)

```json
{
    "slides": [...],
    "metadata": {
        "title": "演示文稿标题"
    },
    "settings": {
        "advanceMode": "click",
        "smartGuidesEnabled": true
    }
}
```

### 11.2 最近文件列表

存储位置: `%APPDATA%/PPTEditor/recent_files.json`

## 12. 开发调试

### 12.1 启动程序

```bash
python main.py
```

### 12.2 控制台日志

前端日志会输出到 Python 控制台，格式：
```
[JS INFO] 消息内容 (line X, file:///...)
[JS WARN] 警告内容
[JS ERROR] 错误内容
```

### 12.3 调试 API

```javascript
// 在浏览器控制台中
window.pyApi  // PyQt6 暴露的 API 对象
window.PyBridge  // 通信桥接
window.editor.store  // 状态管理
window.editor.canvas  // Fabric.js 画布
```

## 13. 注意事项

1. **撤销系统**: 前端维护独立的历史记录，最大 50 步
2. **数据同步**: 保存文件时前端数据同步到后端
3. **画布尺寸**: 固定 1200x675 像素 (16:9 比例)
4. **资源路径**: 使用 `get_resource_path()` 兼容 PyInstaller 打包

## 14. 依赖列表

```
PyQt6
PyQt6-WebEngine
Jinja2
Pillow (可选，用于缩略图生成)
```
