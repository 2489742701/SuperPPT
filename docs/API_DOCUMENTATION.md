# HTML PPT 编辑器 - API 文档

## 概述

本文档描述了 HTML PPT 编辑器的后端 API 接口。所有 API 方法都在 `src/api.py` 中定义，并通过 `main.py` 中的 `ApiWrapper` 类暴露给前端。

---

## 演示文稿操作

### `get_presentation()`
获取当前演示文稿数据。

**返回**: `Dict` - 演示文稿完整数据

```python
result = api.get_presentation()
# 返回: {"slides": [...], "metadata": {...}, "slideMasters": {...}}
```

### `new_presentation()`
创建新的演示文稿。

**返回**: `Dict` - 新演示文稿数据

```python
result = api.new_presentation()
```

### `load_presentation(json_data: str)`
从 JSON 字符串加载演示文稿。

**参数**:
- `json_data`: JSON 格式的演示文稿数据

**返回**: `Dict` - `{"success": bool, "data": dict}`

```python
result = api.load_presentation('{"slides": [...], "metadata": {...}}')
```

### `save_presentation()`
保存演示文稿为 JSON 字符串。

**返回**: `str` - JSON 格式的演示文稿数据

```python
json_data = api.save_presentation()
```

---

## 幻灯片操作

### `add_slide(after_slide_id: str = None, layout: str = None)`
添加新幻灯片。

**参数**:
- `after_slide_id`: 在指定幻灯片后插入（可选）
- `layout`: 版式名称（可选）

**返回**: `Dict` - `{"success": bool, "slide": dict}`

```python
result = api.add_slide(None, "title_content")
```

### `remove_slide(slide_id: str)`
删除幻灯片。

**参数**:
- `slide_id`: 幻灯片 ID

**返回**: `Dict` - `{"success": bool}`

```python
result = api.remove_slide("slide-abc123")
```

### `duplicate_slide(slide_id: str)`
复制幻灯片。

**参数**:
- `slide_id`: 要复制的幻灯片 ID

**返回**: `Dict` - `{"success": bool, "slide": dict}`

```python
result = api.duplicate_slide("slide-abc123")
```

### `move_slide(from_index: int, to_index: int)`
移动幻灯片位置。

**参数**:
- `from_index`: 原位置索引
- `to_index`: 目标位置索引

**返回**: `Dict` - `{"success": bool}`

```python
result = api.move_slide(0, 2)
```

### `set_current_slide(index: int)`
设置当前幻灯片索引。

**参数**:
- `index`: 幻灯片索引

**返回**: `Dict` - `{"success": bool}`

```python
result = api.set_current_slide(0)
```

### `update_slide_metadata(slide_id: str, metadata: Dict)`
更新幻灯片元数据。

**参数**:
- `slide_id`: 幻灯片 ID
- `metadata`: 元数据字典

**返回**: `Dict` - `{"success": bool}`

```python
result = api.update_slide_metadata("slide-abc123", {"backgroundColor": "#f0f0f0"})
```

---

## 版式模板

### `get_layout_templates()`
获取所有版式模板。

**返回**: `Dict` - `{"success": bool, "templates": list}`

```python
result = api.get_layout_templates()
```

### `change_slide_layout(slide_id: str, layout: str)`
更改幻灯片版式。

**参数**:
- `slide_id`: 幻灯片 ID
- `layout`: 版式名称

**返回**: `Dict` - `{"success": bool}`

```python
result = api.change_slide_layout("slide-abc123", "two_column")
```

---

## 母版操作

### `get_slide_masters()`
获取所有母版。

**返回**: `Dict` - `{"success": bool, "masters": list}`

```python
result = api.get_slide_masters()
```

### `get_slide_master(master_id: str)`
获取指定母版。

**参数**:
- `master_id`: 母版 ID

**返回**: `Dict` - `{"success": bool, "master": dict}`

```python
result = api.get_slide_master("default")
```

### `add_slide_master(master: Dict)`
添加新母版。

**参数**:
- `master`: 母版数据

**返回**: `Dict` - `{"success": bool, "master": dict}`

```python
result = api.add_slide_master({
    "name": "自定义母版",
    "backgroundColor": "#1a1a2e"
})
```

### `update_slide_master(master_id: str, master: Dict)`
更新母版。

**参数**:
- `master_id`: 母版 ID
- `master`: 新的母版数据

**返回**: `Dict` - `{"success": bool}`

```python
result = api.update_slide_master("master-abc", {"name": "更新后的名称"})
```

### `delete_slide_master(master_id: str)`
删除母版。

**参数**:
- `master_id`: 母版 ID

**返回**: `Dict` - `{"success": bool}`

```python
result = api.delete_slide_master("master-abc")
```

### `apply_master_to_slide(slide_id: str, master_id: str)`
将母版应用到幻灯片。

**参数**:
- `slide_id`: 幻灯片 ID
- `master_id`: 母版 ID

**返回**: `Dict` - `{"success": bool}`

```python
result = api.apply_master_to_slide("slide-abc", "dark")
```

---

## 元素操作

### `add_element(slide_id: str, element_type: str, style: Dict = None, content: Any = None)`
添加元素。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_type`: 元素类型（textbox, shape, button, image 等）
- `style`: 样式字典（可选）
- `content`: 内容（可选）

**返回**: `Dict` - `{"success": bool, "element": dict}`

```python
result = api.add_element("slide-abc", "textbox", {
    "x": 100, "y": 100, "width": 200, "height": 50,
    "fontSize": 24, "color": "#333333"
}, "Hello World")
```

### `update_element(slide_id: str, element_id: str, style: Dict = None, content: Any = None)`
更新元素。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_id`: 元素 ID
- `style`: 新样式（可选）
- `content`: 新内容（可选）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.update_element("slide-abc", "elem-xyz", {"color": "#ff0000"})
```

### `remove_element(slide_id: str, element_id: str)`
删除元素。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_id`: 元素 ID

**返回**: `Dict` - `{"success": bool}`

```python
result = api.remove_element("slide-abc", "elem-xyz")
```

### `duplicate_element(slide_id: str, element_id: str)`
复制元素。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_id`: 元素 ID

**返回**: `Dict` - `{"success": bool, "element": dict}`

```python
result = api.duplicate_element("slide-abc", "elem-xyz")
```

### `reorder_element(slide_id: str, element_id: str, direction: str)`
调整元素层级。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_id`: 元素 ID
- `direction`: 方向（"up", "down", "top", "bottom"）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.reorder_element("slide-abc", "elem-xyz", "up")
```

### `align_elements(slide_id: str, element_ids: List[str], align_type: str)`
对齐多个元素。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_ids`: 元素 ID 列表
- `align_type`: 对齐类型（"left", "center", "right", "top", "middle", "bottom"）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.align_elements("slide-abc", ["elem-1", "elem-2"], "center")
```

---

## 动画操作

### `set_element_animation(slide_id: str, element_id: str, animation_type: str, animation_config: str)`
设置元素动画。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_id`: 元素 ID
- `animation_type`: 动画类型
- `animation_config`: 动画配置（JSON 字符串）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.set_element_animation("slide-abc", "elem-xyz", "fadeIn", 
    '{"duration": 0.5, "delay": 0}')
```

---

## 剪贴板操作

### `copy_elements(slide_id: str, element_ids: List[str])`
复制元素到剪贴板。

**参数**:
- `slide_id`: 幻灯片 ID
- `element_ids`: 元素 ID 列表

**返回**: `Dict` - `{"success": bool, "count": int}`

```python
result = api.copy_elements("slide-abc", ["elem-1", "elem-2"])
```

### `paste_elements(target_slide_id: str)`
粘贴剪贴板中的元素。

**参数**:
- `target_slide_id`: 目标幻灯片 ID

**返回**: `Dict` - `{"success": bool, "elements": list}`

```python
result = api.paste_elements("slide-xyz")
```

### `get_clipboard()`
获取剪贴板内容。

**返回**: `Dict` - 剪贴板数据

```python
result = api.get_clipboard()
```

### `clear_clipboard()`
清空剪贴板。

**返回**: `Dict` - `{"success": bool}`

```python
result = api.clear_clipboard()
```

---

## 撤销/重做

### `undo()`
撤销上一步操作。

**返回**: `Dict` - `{"success": bool, "data": dict}`

```python
result = api.undo()
```

### `redo()`
重做上一步操作。

**返回**: `Dict` - `{"success": bool, "data": dict}`

```python
result = api.redo()
```

---

## 文件操作

### `save_to_file(file_path: str = None)`
保存演示文稿到文件。

**参数**:
- `file_path`: 文件路径（可选，不提供则弹出对话框）

**返回**: `Dict` - `{"success": bool, "path": str}`

```python
result = api.save_to_file("presentation.pptjson")
```

### `load_from_file(file_path: str = None)`
从文件加载演示文稿。

**参数**:
- `file_path`: 文件路径（可选，不提供则弹出对话框）

**返回**: `Dict` - `{"success": bool, "data": dict}`

```python
result = api.load_from_file("presentation.pptjson")
```

---

## 导出操作

### `export_html()`
导出为 HTML。

**返回**: `str` - HTML 内容

```python
html = api.export_html()
```

### `export_single_file()`
导出为单文件 HTML。

**返回**: `str` - 单文件 HTML 内容

```python
html = api.export_single_file()
```

### `export_pdf(output_path: str = None)`
导出为 PDF。

**参数**:
- `output_path`: 输出路径（可选）

**返回**: `Dict` - `{"success": bool, "path": str}`

```python
result = api.export_pdf("presentation.pdf")
```

---

## 用户设置

### `get_user_name()`
获取用户名。

**返回**: `str` - 用户名

```python
name = api.get_user_name()
```

### `set_user_name(name: str)`
设置用户名。

**参数**:
- `name`: 用户名

**返回**: `Dict` - `{"success": bool}`

```python
result = api.set_user_name("张三")
```

### `update_presentation_metadata(metadata: Dict)`
更新演示文稿元数据。

**参数**:
- `metadata`: 元数据字典

**返回**: `Dict` - `{"success": bool}`

```python
result = api.update_presentation_metadata({"title": "我的演示", "author": "张三"})
```

---

## 最近文件

### `get_recent_files()`
获取最近文件列表。

**返回**: `Dict` - `{"success": bool, "files": list}`

```python
result = api.get_recent_files()
```

### `add_recent_file(path: str, data: Dict = None)`
添加到最近文件。

**参数**:
- `path`: 文件路径
- `data`: 文件数据（可选）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.add_recent_file("/path/to/file.pptjson")
```

### `remove_recent_file(index: int)`
从最近文件中移除。

**参数**:
- `index`: 文件索引

**返回**: `Dict` - `{"success": bool}`

```python
result = api.remove_recent_file(0)
```

---

## 工具方法

### `check_file_exists(path: str)`
检查文件是否存在。

**参数**:
- `path`: 文件路径

**返回**: `Dict` - `{"success": bool, "exists": bool}`

```python
result = api.check_file_exists("/path/to/file.pptjson")
```

### `write_log(level: str, module: str, message: str, data: str = "")`
写入日志。

**参数**:
- `level`: 日志级别
- `module`: 模块名称
- `message`: 日志消息
- `data`: 额外数据（可选）

**返回**: `Dict` - `{"success": bool}`

```python
result = api.write_log("INFO", "Editor", "文件已保存", "")
```

### `clear_log()`
清空日志文件。

**返回**: `Dict` - `{"success": bool}`

```python
result = api.clear_log()
```

### `is_packaged()`
检查是否在打包环境中运行。

**返回**: `Dict` - `{"success": bool, "packaged": bool}`

```python
result = api.is_packaged()
```

---

## 前端调用示例

在 JavaScript 中通过 `window.pyApi` 调用：

```javascript
// 获取演示文稿
const presentation = await window.pyApi.get_presentation();

// 添加幻灯片
const result = await window.pyApi.add_slide(null, "title_content");

// 添加元素
await window.pyApi.add_element(slideId, "textbox", {
    x: 100, y: 100, width: 200, height: 50,
    fontSize: 24, color: "#333333"
}, "Hello World");

// 保存文件
await window.pyApi.save_to_file_path("presentation.pptjson");

// 导出 HTML
const html = await window.pyApi.export_html();
```

---

## 返回值格式

所有 API 方法返回的字典都包含以下基本结构：

### 成功响应
```python
{
    "success": True,
    # 其他数据...
}
```

### 失败响应
```python
{
    "success": False,
    "message": "错误信息"
}
```

---

*文档版本: 1.0*
*更新日期: 2024-03-22*
