# SuperPPT - HTML PPT 编辑器

一个基于 PyQt6 和 Web 技术的现代化演示文稿编辑器。

## 功能特性

- 🎨 **所见即所得编辑** - 基于 Fabric.js 的画布编辑
- 📑 **多种版式模板** - 标题副标题、标题内容、两栏布局等
- 🎬 **全屏放映模式** - 支持键盘快捷键和鼠标点击切换
- 💾 **项目文件管理** - 保存/加载演示文稿
- 📤 **HTML 导出** - 导出为独立 HTML 文件
- 🔧 **开发者模式** - 命令行自动化测试

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
│   └── presentation.py  # 演示文稿数据模型
├── assets/
│   ├── index.html       # 前端页面
│   ├── css/
│   │   └── main.css     # 样式文件
│   └── js/
│       ├── app.js       # 应用入口
│       └── modules/
│           ├── canvas.js      # 画布管理
│           ├── store.js       # 状态管理
│           ├── toolbar.js     # 工具栏
│           └── slides-panel.js # 幻灯片面板
└── README.md
```

## 许可证

MIT License

## 作者

SuperPPT Team
