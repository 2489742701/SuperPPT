"""
HTML PPT 编辑器 - 开发者工具模块

提供主动调试、性能监控、API 测试等功能
"""

import time
import json
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from functools import wraps


class DebugTracer:
    """函数调用追踪器 - 最小单元格级别"""
    
    def __init__(self, module_name: str):
        self.module_name = module_name
        self.call_count = 0
        self.error_count = 0
        self.calls: List[Dict] = []
        self.max_history = 100
        
    def trace(self, func_name: str, params: Dict = None, result: Any = None, 
              error: Exception = None, duration: float = 0):
        """追踪函数调用"""
        self.call_count += 1
        
        call_info = {
            'timestamp': datetime.now().isoformat(),
            'function': func_name,
            'params': params,
            'duration': duration,
            'success': error is None
        }
        
        if error:
            self.error_count += 1
            call_info['error'] = str(error)
            call_info['traceback'] = traceback.format_exc()
        else:
            call_info['result'] = result
            
        self.calls.append(call_info)
        
        # 限制历史记录数量
        if len(self.calls) > self.max_history:
            self.calls.pop(0)
            
    def get_stats(self) -> Dict:
        """获取统计信息"""
        success_count = self.call_count - self.error_count
        success_rate = (success_count / self.call_count * 100) if self.call_count > 0 else 0
        
        return {
            'module': self.module_name,
            'call_count': self.call_count,
            'error_count': self.error_count,
            'success_count': success_count,
            'success_rate': f"{success_rate:.1f}%",
            'avg_duration': sum(c['duration'] for c in self.calls) / len(self.calls) if self.calls else 0
        }
        
    def get_recent_calls(self, limit: int = 10) -> List[Dict]:
        """获取最近的调用记录"""
        return self.calls[-limit:]
        
    def clear(self):
        """清空记录"""
        self.calls.clear()
        self.call_count = 0
        self.error_count = 0


class DebugLogger:
    """最小单元格 Debug 日志器 - 可自由开关"""
    
    _instance = None
    _enabled = False
    _log_level = 'INFO'
    _log_history: List[Dict] = []
    _max_history = 1000
    _listeners: List[Callable] = []
    
    LEVELS = {'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def enable(cls, level: str = 'INFO'):
        """启用 Debug 输出"""
        cls._enabled = True
        cls._log_level = level
        cls._notify_listeners({'type': 'status', 'enabled': True, 'level': level})
        print(f"\n[Debug] Debug 模式已启用 (级别: {level})")
        
    @classmethod
    def disable(cls):
        """禁用 Debug 输出"""
        cls._enabled = False
        cls._notify_listeners({'type': 'status', 'enabled': False})
        print("\n[Debug] Debug 模式已禁用")
        
    @classmethod
    def is_enabled(cls) -> bool:
        """检查是否启用"""
        return cls._enabled
        
    @classmethod
    def set_level(cls, level: str):
        """设置日志级别"""
        if level in cls.LEVELS:
            cls._log_level = level
            
    @classmethod
    def add_listener(cls, listener: Callable):
        """添加日志监听器"""
        cls._listeners.append(listener)
        
    @classmethod
    def remove_listener(cls, listener: Callable):
        """移除日志监听器"""
        if listener in cls._listeners:
            cls._listeners.remove(listener)
            
    @classmethod
    def _notify_listeners(cls, log_entry: Dict):
        """通知所有监听器"""
        for listener in cls._listeners:
            try:
                listener(log_entry)
            except Exception:
                pass
    
    @classmethod
    def _should_log(cls, level: str) -> bool:
        """检查是否应该记录该级别日志"""
        return cls._enabled and cls.LEVELS.get(level, 1) >= cls.LEVELS.get(cls._log_level, 1)
    
    @classmethod
    def _get_timestamp(cls) -> str:
        """获取时间戳"""
        return datetime.now().strftime('%H:%M:%S.%f')[:-3]
    
    @classmethod
    def log(cls, level: str, module: str, message: str, data: Any = None):
        """记录日志"""
        if not cls._should_log(level):
            return
            
        timestamp = cls._get_timestamp()
        log_entry = {
            'type': 'log',
            'timestamp': timestamp,
            'level': level,
            'module': module,
            'message': message,
            'data': data
        }
        
        cls._log_history.append(log_entry)
        cls._notify_listeners(log_entry)
        
        # 限制历史记录数量
        if len(cls._log_history) > cls._max_history:
            cls._log_history.pop(0)
        
        # 输出到控制台
        prefix = f"[{timestamp}] [{level}] [{module}]"
        if data is not None:
            print(f"{prefix} {message}", json.dumps(data, ensure_ascii=False, default=str)[:200])
        else:
            print(f"{prefix} {message}")
    
    @classmethod
    def debug(cls, module: str, message: str, data: Any = None):
        """Debug 级别日志"""
        cls.log('DEBUG', module, message, data)
        
    @classmethod
    def info(cls, module: str, message: str, data: Any = None):
        """Info 级别日志"""
        cls.log('INFO', module, message, data)
        
    @classmethod
    def warn(cls, module: str, message: str, data: Any = None):
        """Warn 级别日志"""
        cls.log('WARN', module, message, data)
        
    @classmethod
    def error(cls, module: str, message: str, data: Any = None):
        """Error 级别日志"""
        cls.log('ERROR', module, message, data)
    
    @classmethod
    def get_history(cls, level: str = None, limit: int = 50) -> List[Dict]:
        """获取日志历史"""
        logs = cls._log_history
        if level:
            logs = [l for l in logs if l['level'] == level]
        return logs[-limit:]
    
    @classmethod
    def clear_history(cls):
        """清空日志历史"""
        cls._log_history.clear()
        cls._notify_listeners({'type': 'cleared'})
        print("[Debug] 日志历史已清空")


def trace_function(module_name: str):
    """函数追踪装饰器"""
    tracer = DebugTracer(module_name)
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not DebugLogger.is_enabled():
                return func(*args, **kwargs)
                
            start_time = time.time()
            func_name = func.__name__
            params = {'args': str(args), 'kwargs': str(kwargs)}
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                tracer.trace(func_name, params, result, duration=duration)
                DebugLogger.debug(module_name, f"{func_name}() 调用成功", {
                    'duration': f"{duration:.3f}s",
                    'result_type': type(result).__name__
                })
                return result
            except Exception as e:
                duration = time.time() - start_time
                tracer.trace(func_name, params, error=e, duration=duration)
                DebugLogger.error(module_name, f"{func_name}() 调用失败", {
                    'duration': f"{duration:.3f}s",
                    'error': str(e)
                })
                raise
                
        wrapper._tracer = tracer
        return wrapper
    return decorator


class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self):
        self.metrics: Dict[str, List[float]] = {}
        self.start_times: Dict[str, float] = {}
        
    def start(self, name: str):
        """开始计时"""
        self.start_times[name] = time.time()
        
    def end(self, name: str) -> float:
        """结束计时"""
        if name not in self.start_times:
            return 0
            
        duration = time.time() - self.start_times[name]
        
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append(duration)
        
        # 只保留最近 100 条记录
        if len(self.metrics[name]) > 100:
            self.metrics[name].pop(0)
            
        del self.start_times[name]
        return duration
        
    def get_stats(self, name: str = None) -> Dict:
        """获取性能统计"""
        if name:
            if name not in self.metrics:
                return {}
            times = self.metrics[name]
            return {
                'name': name,
                'count': len(times),
                'total': sum(times),
                'avg': sum(times) / len(times),
                'min': min(times),
                'max': max(times),
                'last': times[-1] if times else 0
            }
        else:
            return {name: self.get_stats(name) for name in self.metrics}
            
    def clear(self):
        """清空所有指标"""
        self.metrics.clear()
        self.start_times.clear()


class APITester:
    """API 测试工具"""
    
    def __init__(self, api_instance):
        self.api = api_instance
        self.test_results: List[Dict] = []
        self.tracer = DebugTracer('APITester')
        
    def run_test(self, test_name: str, method: Callable, *args, **kwargs) -> Dict:
        """运行单个测试"""
        print(f"\n[API测试] {test_name}...")
        
        start_time = time.time()
        try:
            result = method(*args, **kwargs)
            duration = time.time() - start_time
            
            success = isinstance(result, dict) and result.get('success', True)
            
            test_result = {
                'name': test_name,
                'success': success,
                'duration': duration,
                'timestamp': datetime.now().isoformat(),
                'result': result
            }
            
            self.test_results.append(test_result)
            self.tracer.trace(test_name, {'args': args, 'kwargs': kwargs}, 
                            result, duration=duration)
            
            status = "✓ 通过" if success else "✗ 失败"
            print(f"  {status} ({duration:.3f}s)")
            
            return test_result
            
        except Exception as e:
            duration = time.time() - start_time
            test_result = {
                'name': test_name,
                'success': False,
                'duration': duration,
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            
            self.test_results.append(test_result)
            self.tracer.trace(test_name, {'args': args, 'kwargs': kwargs}, 
                            error=e, duration=duration)
            
            print(f"  ✗ 异常 ({duration:.3f}s): {e}")
            return test_result
            
    def run_all_tests(self) -> Dict:
        """运行所有测试"""
        print("\n" + "="*60)
        print("  开始 API 测试")
        print("="*60)
        
        # 清理之前的测试结果
        self.test_results.clear()
        
        # 测试 1: 创建新演示文稿
        self.run_test("创建新演示文稿", self.api.new_presentation)
        
        # 测试 2: 获取演示文稿
        self.run_test("获取演示文稿", self.api.get_presentation)
        
        # 测试 3: 添加幻灯片
        result = self.run_test("添加幻灯片", self.api.add_slide, None, "title_content")
        slide_id = None
        if result.get('success') and result.get('result', {}).get('slide', {}).get('id'):
            slide_id = result['result']['slide']['id']
        
        # 测试 4: 添加元素
        if slide_id:
            self.run_test("添加文本元素", self.api.add_element, 
                         slide_id, "textbox", 
                         {"x": 100, "y": 100, "width": 200, "height": 50},
                         "测试文本")
        
        # 测试 5: 获取版式模板
        self.run_test("获取版式模板", self.api.get_layout_templates)
        
        # 测试 6: 撤销操作
        self.run_test("撤销操作", self.api.undo)
        
        # 测试 7: 重做操作
        self.run_test("重做操作", self.api.redo)
        
        # 测试 8: 导出 HTML
        self.run_test("导出 HTML", self.api.export_html)
        
        # 汇总结果
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['success'])
        failed = total - passed
        total_duration = sum(r['duration'] for r in self.test_results)
        
        print("\n" + "="*60)
        print("  测试完成")
        print("="*60)
        print(f"  总计: {total} 项")
        print(f"  通过: {passed} 项")
        print(f"  失败: {failed} 项")
        print(f"  总耗时: {total_duration:.3f}s")
        print("="*60 + "\n")
        
        return {
            'total': total,
            'passed': passed,
            'failed': failed,
            'duration': total_duration,
            'results': self.test_results
        }
        
    def get_test_report(self) -> str:
        """生成测试报告"""
        lines = ["\n# API 测试报告\n"]
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        lines.append("-" * 60 + "\n")
        
        for result in self.test_results:
            status = "✓ 通过" if result['success'] else "✗ 失败"
            lines.append(f"\n## {result['name']}\n")
            lines.append(f"状态: {status}\n")
            lines.append(f"耗时: {result['duration']:.3f}s\n")
            
            if 'error' in result:
                lines.append(f"错误: {result['error']}\n")
                lines.append(f"```\n{result.get('traceback', '')}\n```\n")
            elif 'result' in result:
                result_str = json.dumps(result['result'], ensure_ascii=False, 
                                      indent=2, default=str)[:500]
                lines.append(f"结果: ```json\n{result_str}\n```\n")
                
        return ''.join(lines)


# 全局实例
perf_monitor = PerformanceMonitor()
