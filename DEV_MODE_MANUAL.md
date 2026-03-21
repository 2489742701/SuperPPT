# HTML PPT 编辑器 - 开发者模式手册

## 1. 命令行参数

### 基础参数
| 参数 | 说明 | 示例 |
|------|------|------|
| `--dev` | 启用开发者模式 | `python main.py --dev` |
| `--headless` | 无头模式（不显示窗口） | `python main.py --headless` |
| `--open FILE` | 打开指定项目文件 | `python main.py --open project.pptjson` |

### 自动化参数
| 参数 | 说明 | 示例 |
|------|------|------|
| `--auto-test` | 自动测试所有版式 | `python main.py --dev --auto-test` |
| `--demo` | 创建演示文稿示例 | `python main.py --dev --demo` |
| `--new-slides N` | 创建 N 张幻灯片 | `python main.py --dev --new-slides 5` |
| `--layout LAYOUT` | 指定版式 | `--layout title_content` |
| `--export PATH` | 导出到指定路径 | `--export output.html` |

### 预览参数
| 参数 | 说明 | 示例 |
|------|------|------|
| `--preview` | 自动打开放映预览 | `python main.py --dev --preview` |
| `--preview-slide N` | 从第 N 页开始放映 | `--preview-slide 2` |

### Debug 参数
| 参数 | 说明 | 示例 |
|------|------|------|
| `--debug` | 启用 Debug 模式 | `python main.py --dev --debug` |
| `--debug-level LEVEL` | 设置日志级别 | `--debug-level DEBUG` |
| `--auto-inspect` | 自动检查状态 | `python main.py --dev --debug --auto-inspect` |
| `--debug-stats` | 显示统计信息 | `python main.py --dev --debug --debug-stats` |

---

## 2. Debug 系统

### DebugLogger（日志器）

**功能**：最小单元格级别的日志记录，可自由开关

**日志级别**：
- `DEBUG` - 详细调试信息
- `INFO` - 一般信息
- `WARN` - 警告信息
- `ERROR` - 错误信息

**使用方法**：
```python
from main import DebugLogger

# 启用 Debug
DebugLogger.enable('INFO')

# 记录日志
DebugLogger.debug('ModuleName', '调试信息', {'key': 'value'})
DebugLogger.info('ModuleName', '一般信息')
DebugLogger.warn('ModuleName', '警告信息')
DebugLogger.error('ModuleName', '错误信息', error_obj)

# 禁用 Debug
DebugLogger.disable()

# 获取日志历史
logs = DebugLogger.get_history(limit=50)
error_logs = DebugLogger.get_history(level='ERROR')

# 清空历史
DebugLogger.clear_history()
```

### DebugTracer（追踪器）

**功能**：函数调用追踪，统计调用次数和成功率

**使用方法**：
```python
# 在 DevModeController 中获取追踪器
tracer = self.get_tracer('ModuleName')

# 追踪函数调用
try:
    result = some_function(params)
    tracer.trace('some_function', {'param': value}, result)
except Exception as e:
    tracer.trace('some_function', {'param': value}, error=e)

# 获取统计信息
stats = tracer.get_stats()
# 返回: {'module': 'ModuleName', 'call_count': 10, 'error_count': 1, 'success_rate': '90.0%'}
```

---

## 3. DevModeController（开发者控制器）

### 初始化
```python
dev_controller = DevModeController(api_wrapper, main_window)
```

### 方法列表

#### enable_debug(level='INFO', auto_inspect=False)
启用 Debug 模式
```python
dev_controller.enable_debug(level='DEBUG', auto_inspect=True)
```

#### disable_debug()
禁用 Debug 模式
```python
dev_controller.disable_debug()
```

#### inspect_state()
检查当前状态（主动性查看）
```python
dev_controller.inspect_state()
```
输出示例：
```
============================================================
  [Debug] 自动状态检查
============================================================

  📊 演示文稿状态:
     标题: 未命名
     作者: 未知
     幻灯片数量: 5

  📑 幻灯片详情:
     [1] ID: slide-abc123... | 版式: title_subtitle | 元素: 2
     ...

  🔍 API 调用统计:
     Demo: 5 次调用, 成功率 100.0%
============================================================
```

#### run_auto_test()
运行自动化测试（创建所有版式）
```python
dev_controller.run_auto_test()
```

#### create_demo_presentation()
创建演示文稿示例
```python
dev_controller.create_demo_presentation()
```

#### create_slides(count, layout)
创建指定数量的幻灯片
```python
dev_controller.create_slides(5, 'title_content')
```

#### export_presentation(path)
导出演示文稿
```python
dev_controller.export_presentation('output.html')
```

#### show_debug_stats()
显示 Debug 统计信息
```python
dev_controller.show_debug_stats()
```

#### start_preview(slide_index=0)
启动放映预览模式
```python
dev_controller.start_preview(0)  # 从第1页开始
```

---

## 4. 常用命令组合

### 开发调试模式
```bash
# 基础开发模式
python main.py --dev

# 开发模式 + 自动测试 + Debug
python main.py --dev --auto-test --debug --debug-level DEBUG

# 开发模式 + 演示 + 自动检查状态
python main.py --dev --demo --debug --auto-inspect

# 创建幻灯片并导出
python main.py --dev --new-slides 10 --layout title_content --export output.html

# 完整调试模式（测试 + Debug + 自动检查 + 统计）
python main.py --dev --auto-test --debug --auto-inspect --debug-stats

# 演示 + 预览
python main.py --dev --demo --preview

# 打开文件并预览第3页
python main.py --dev --open project.pptjson --preview --preview-slide 2
```

### 无头模式（CI/CD）
```bash
# 无头模式创建并导出
python main.py --headless --demo --export output.html

# 无头模式自动测试
python main.py --headless --auto-test --export result.html
```

---

## 5. 版式类型

| 版式名称 | 说明 |
|----------|------|
| `title_subtitle` | 标题 + 副标题 |
| `title_content` | 标题 + 内容 |
| `title_content_divider` | 标题 + 内容（带分割线）|
| `two_column` | 双栏布局 |
| `section_header` | 章节标题页 |
| `blank` | 空白页 |

---

## 6. 快捷键

### 主窗口
| 快捷键 | 功能 |
|--------|------|
| `F5` | 开始放映 |
| `Ctrl+S` | 保存 |
| `Ctrl+O` | 打开 |
| `Ctrl+N` | 新建 |

### 放映模式
| 快捷键 | 功能 |
|--------|------|
| `ESC` | 退出放映 |
| `F11` | 切换全屏 |
| `←/→` | 上一页/下一页 |
| `空格` | 下一页 |

---

## 7. 文件结构

```
超级项目-网页ppt/
├── main.py              # 主程序入口（PyQt6 GUI）
├── cli.py               # 命令行工具
├── main_web.py          # Web 版本入口
├── src/
│   ├── api.py           # 后端 API
│   ├── presentation.py  # 演示文稿数据模型
│   └── export_html.py   # HTML 导出
├── assets/              # 静态资源
│   ├── index.html       # 前端主页面
│   ├── css/
│   └── js/
└── DEV_MODE_MANUAL.md   # 本手册
```

---

## 8. 调试技巧

### 1. 查看 API 调用详情
```bash
python main.py --dev --debug --debug-level DEBUG --auto-test
```

### 2. 实时监控状态
```bash
python main.py --dev --debug --auto-inspect
```
# 每 5 秒自动输出当前状态
```

### 3. 追踪特定模块
```python
# 在代码中添加
tracer = dev_controller.get_tracer('MyModule')
tracer.trace('my_function', params, result)
```

### 4. 检查日志历史
```python
# 获取最近 50 条日志
logs = DebugLogger.get_history(limit=50)

# 只获取错误日志
errors = DebugLogger.get_history(level='ERROR')
```

---

## 9. 注意事项

1. **Debug 模式会输出大量信息**，生产环境建议关闭
2. **自动检查状态**每 5 秒执行一次，可能影响性能
3. **日志历史**最多保存 1000 条，超出会自动清理
4. **追踪器**按模块名称区分，相同名称共享统计

---

## 10. 扩展开发

### 添加新的开发者命令

在 `DevModeController` 中添加新方法：

```python
def my_custom_command(self, param):
    """自定义命令"""
    tracer = self.get_tracer('Custom')
    
    try:
        result = self.api.some_api_call(param)
        tracer.trace('some_api_call', {'param': param}, result)
        print(f"✓ 成功: {result}")
    except Exception as e:
        tracer.trace('some_api_call', {'param': param}, error=e)
        print(f"✗ 失败: {e}")
```

在 `parse_args()` 中添加参数：

```python
parser.add_argument('--my-command', type=str, help='我的自定义命令')
```

在 `run_dev_commands()` 中调用：

```python
if args.my_command:
    dev_controller.my_custom_command(args.my_command)
```

---

*手册版本: 1.0*
*更新日期: 2026-03-21*
