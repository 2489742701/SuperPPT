"""
HTML PPT 编辑器 - 纯 Web 模式入口

本模块提供一个简单的 HTTP 服务器，用于在浏览器中运行编辑器。
不需要 PyQt6，只需要 Python 标准库。

使用方法:
    python main_web.py
    
然后在浏览器中打开 http://localhost:8080

参数:
    --port: 指定端口号（默认 8080）
    --host: 指定主机地址（默认 localhost）
"""

import http.server
import socketserver
import os
import sys
import argparse
import webbrowser
from functools import partial

# 获取 assets 目录路径
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')


class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义 HTTP 请求处理器"""
    
    def __init__(self, *args, directory=None, **kwargs):
        if directory is None:
            directory = ASSETS_DIR
        super().__init__(*args, directory=directory, **kwargs)
    
    def end_headers(self):
        # 添加 CORS 头，允许跨域
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # 禁用缓存，方便开发调试
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理 OPTIONS 请求（CORS 预检）"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[Web] {args[0]}")


def main():
    """启动 Web 服务器"""
    parser = argparse.ArgumentParser(description='HTML PPT 编辑器 - Web 模式')
    parser.add_argument('--port', type=int, default=8080, help='端口号（默认 8080）')
    parser.add_argument('--host', type=str, default='localhost', help='主机地址（默认 localhost）')
    parser.add_argument('--no-browser', action='store_true', help='不自动打开浏览器')
    args = parser.parse_args()
    
    port = args.port
    host = args.host
    
    # 创建 HTTP 服务器
    handler = partial(CustomHTTPRequestHandler, directory=ASSETS_DIR)
    
    try:
        with socketserver.TCPServer((host, port), handler) as httpd:
            url = f"http://{host}:{port}/index.html"
            
            print(f"\n{'='*50}")
            print(f"  HTML PPT 编辑器 - Web 模式")
            print(f"{'='*50}")
            print(f"  服务地址: {url}")
            print(f"  资源目录: {ASSETS_DIR}")
            print(f"  按 Ctrl+C 停止服务器")
            print(f"{'='*50}\n")
            
            # 自动打开浏览器
            if not args.no_browser:
                webbrowser.open(url)
            
            # 启动服务器
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 10048:  # 端口被占用
            print(f"[错误] 端口 {port} 已被占用，请使用其他端口")
            print(f"  尝试: python main_web.py --port {port + 1}")
        else:
            print(f"[错误] 启动失败: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[Web] 服务器已停止")
        sys.exit(0)


if __name__ == '__main__':
    main()
