# HTML PPT 编辑器 - 开发手册

## 项目概述

这是一个基于 PyQt6 + HTML/CSS/JS 的 PPT 编辑器应用，使用 Web 技术作为前端界面，Python 作为后端。

## 目录结构

```
超级项目-网页ppt/
├── main.py                    # Python 主入口 (PyQt6)
├── assets/                    # 前端资源
│   ├── index.html            # 主 HTML 页面
│   ├── css/main.css          # 主样式文件
│   ├── js/
│   │   ├── app.js            # 应用主入口
│   │   └── modules/
│   │       ├── canvas.js     # 画布管理 (Fabric.js)
│   │       ├── preview.js    # 放映预览模块
│   │       ├── store.js      # 状态管理
│   │       ├── toolbar.js    # 工具栏
│   │       ├── slides-panel.js   # 幻灯片面板
│   │       ├── property-panel.js # 属性面板
│   │       ├── pybridge.js   # Python 后端桥接
│   │       ├── context-menu.js   # 右键菜单
│   │       ├── link-modal.js # 链接弹窗
│   │       ├── welcome.js    # 欢迎页面
│   │       └── translations.js # 多语言翻译
│   └── libs/                 # 第三方库
│       ├── fabric.min.js     # 画布渲染引擎
│       └── qwebchannel.js    # Qt WebChannel
```

## 核心模块说明

### 1. CanvasManager (canvas.js)

画布管理模块，使用 Fabric.js 渲染幻灯片内容。

**主要功能：**
- 元素渲染与更新
- 用户交互（选择、移动、缩放）
- 智能参考线 (Smart Guides)
- 多选元素移动

**关键方法：**
- `render(state, store)` - 渲染幻灯片
- `onObjectMoving(e)` - 对象移动事件
- `handleSingleObjectMoving()` - 单选移动处理
- `handleActiveSelectionMoving()` - 多选移动处理
- `onObjectModified(e)` - 对象修改完成

**多选移动原理：**
- 使用 `getCenterPoint()` 获取对象在画布上的绝对中心点
- 计算选择组的边界 (minX, minY, maxX, maxY)
- 以边界中心点作为对齐参考

### 2. Preview (preview.js)

放映预览模块，负责全屏放映演示文稿。

**主要功能：**
- 全屏放映幻灯片
- 键盘和鼠标导航
- 动画效果支持

**关键方法：**
- `render(state, store)` - 渲染放映视图
- `renderPreviewContent(slide, settings)` - 渲染幻灯片内容
- `scalePreview()` - 缩放适应屏幕
- `bindEvents(store)` - 绑定事件

**放映控制：**
| 操作 | 效果 |
|------|------|
| 左键点击左侧区域 | 上一页 |
| 左键点击右侧区域 | 下一页 |
| 右键点击左侧区域 | 下一页 |
| 右键点击右侧区域 | 上一页 |
| 左键点击中间区域 | 下一页 |
| 右键点击中间区域 | 上一页 |
| ← 键 | 上一页 |
| → / 空格 | 下一页 |
| Esc | 退出放映 |

### 3. EditorStore (store.js)

状态管理模块，管理应用的所有状态。

**主要状态：**
- `presentation` - 演示文稿数据
- `activeSlideId` - 当前幻灯片 ID
- `activeElementId` - 当前选中元素 ID
- `isPreview` - 是否在放映模式
- `previewSlideIndex` - 放映幻灯片索引

**关键方法：**
- `getState()` - 获取当前状态
- `notify()` - 通知状态更新
- `setPreview(isPreview, index)` - 设置放映模式
- `updateElement(slideId, elementId, updates)` - 更新元素

### 4. PyBridge (pybridge.js)

Python 后端桥接模块，使用 QWebChannel 与 PyQt6 通信。

**主要功能：**
- 检测运行环境 (PyQt6 / 纯浏览器)
- 调用 Python API
- 处理异步响应

## CSS 样式规范

### 放映栏样式 (preview-*)

```css
.preview-overlay {
    position: fixed;
    z-index: 1000;
    background: #1a1a1a;
}

.preview-click-zone {
    z-index: 1010;           /* 确保在幻灯片之上 */
    pointer-events: auto;    /* 可接收点击 */
}

.preview-slide {
    z-index: 1001;
    pointer-events: none;    /* 让点击穿透 */
}

.preview-slide-container {
    pointer-events: auto;    /* 幻灯片内容可交互 */
}

.preview-controls {
    z-index: 1002;
    opacity: 0;              /* 默认隐藏 */
}

.preview-overlay:hover .preview-controls {
    opacity: 1;              /* hover 时显示 */
}
```

## 元素类型

| 类型 | 说明 |
|------|------|
| textbox | 文本框 (支持 fixed/auto 模式) |
| shape | 形状 (rectangle, circle, triangle, line, star, polygon) |
| media | 媒体 (image, video, audio) |
| button | 按钮 |
| table | 表格 |
| icon | 图标 |

## 画布尺寸

- 幻灯片尺寸：1200 x 675 像素 (16:9)
- 缩略图按比例缩放
- 放映视图通过 CSS transform scale 适应屏幕

## 常见问题修复

### 1. 放映栏点击无效

**原因：** CSS z-index 层级冲突，pointer-events 阻止事件传递

**解决：**
- 提高 `.preview-click-zone` 的 z-index
- 添加 `pointer-events: auto`
- 为 `.preview-slide` 添加 `pointer-events: none`

### 2. 多选移动异常

**原因：** activeSelection 中对象的 left/top 是相对于组的