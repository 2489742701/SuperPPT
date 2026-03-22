# SuperPPT - HTML PPT 编辑器

一个基于 PyQt6 和 Web 技术的现代化演示文稿编辑器。

## 功能特性

- 🎨 **所见即所得编辑** - 基于 Fabric.js 的画布编辑
- 📑 **多种版式模板** - 标题副标题、标题内容、两栏布局等
- 🎨 **幻灯片母版** - 支持母版功能，统一管理幻灯片样式
- 🎬 **全屏放映模式** - 支持键盘快捷键和鼠标点击切换
- 💾 **项目文件管理** - 保存/加载演示文稿
- 📤 **HTML 导出** - 导出为独立 HTML 文件
- 🔧 **开发者模式** - 命令行自动化测试、调试工具
- 🐛 **Debug 系统** - 最小单元格级别的调试日志
- 📊 **示例生成器** - 一键生成示例 PPT

## 技术栈

- **后端**: Python 3.x + PyQt6
- **前端**: HTML5 + CSS3 + JavaScript
- **画布**: Fabric.js
- **通信**: QWebChannel

## 安装

```bash
# 克隆仓库
git clone https://github.com/2489742701/SuperPPT.git
cd SuperPPT

# 安装依赖
pip install PyQt6 PyQt6-WebEngine

# 运行程序
python main.py
```

## 使用方法

### 基本操作

```bash
# 正常启动
python main.py

# 跳过欢迎页，直接进入编辑
python main.py --skip-welcome

# 快速启动：跳过欢迎页并创建演示文稿
python main.py --quick-start

# 创建演示文稿示例
python main.py --demo

# 自动测试所有版式
python main.py --auto-test

# 打开项目文件
python main.py --open "项目文件.pptjson"
```

### 开发者模式

```bash
# 启用开发者模式
python main.py --dev

# 创建指定数量的幻灯片
python main.py --new-slides 5 --layout title_content

# 导出演示文稿
python main.py --demo --export "demo.pptjson"

# 启用 Debug 模式
python main.py --debug --debug-level DEBUG

# 启用 Debug + 自动状态检查
python main.py --debug --auto-inspect

# 运行 API 测试套件
python main.py --api-test

# 运行性能基准测试
python main.py --benchmark 100

# 导出调试信息
python main.py --export-debug debug_info.json
```

### 示例生成

```bash
# 创建所有示例文件到 examples 目录
python main.py --create-examples

# 创建软件介绍 PPT（7页）
python main.py --create-intro

# 创建功能演示 PPT（4页）
python main.py --create-demo

# 创建最小测试 PPT（1页）
python main.py --create-minimal

# 组合使用：创建示例并预览
python main.py --skip-welcome --create-intro --preview
```

## 幻灯片版式

| 版式 | 说明 |
|------|------|
| `title_subtitle` | 标题和副标题（居中） |
| `title_content` | 标题和内容 |
| `title_content_divider` | 标题、分隔线和内容 |
| `two_column` | 两栏内容 |
| `section_header` | 章节标题 |
| `blank` | 空白幻灯片 |

## 幻灯片母版

系统内置三种母版：

| 母版 | 说明 |
|------|------|
| `default` | 默认母版（白色背景） |
| `dark` | 深色母版（深色背景） |
| `gradient` | 渐变母版（紫蓝渐变） |

在属性面板中可以选择应用母版到当前幻灯片。

## 快捷键

### 编辑模式
- `Ctrl+C` - 复制幻灯片
- `Ctrl+V` - 粘贴幻灯片
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `Delete` - 删除选中元素

### 放映模式
- `←` / `→` - 上一页/下一页
- `空格` - 下一页
- `ESC` - 退出放映
- `F11` - 切换全屏

## 项目结构

```
SuperPPT/
├── main.py              # 主程序入口
├── src/
│   ├── api.py           # 后端 API
│   ├── presentation.py  # 演示文稿数据模型
│   ├── dev_tools.py     # 开发者调试工具
│   └── example_generator.py  # 示例生成器
├── assets/
│   ├── index.html       # 前端页面
│   ├── css/
│   │   └── main.css     # 样式文件
│   └── js/
│       ├── app.js       # 应用入口
│       └── modules/
│           ├── canvas.js       # 画布管理
│           ├── store.js        # 状态管理
│           ├── toolbar.js      # 工具栏
│           ├── property-panel.js # 属性面板
│           └── slides-panel.js # 幻灯片面板
├── examples/            # 示例 PPT 文件
│   ├── 软件介绍.pptjson
│   ├── 功能演示.pptjson
│   └── 最小测试.pptjson
└── README.md
```

## 开发者工具

### DebugLogger
最小单元格级别的日志记录器，支持：
- 4 个日志级别：DEBUG、INFO、WARN、ERROR
- 可自由开关
- 保存最近 1000 条日志历史

### DebugTracer
函数调用追踪器，统计：
- 调用次数
- 错误次数
- 成功率

### APITester
自动化 API 测试工具，测试：
- 创建演示文稿
- 添加幻灯片
- 添加元素
- 撤销/重做
- 导出功能

## 许可证

MIT License

## 作者

SuperPPT Team
