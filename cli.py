"""
HTML PPT 编辑器 - 命令行工具 (CLI)

开发者可以通过命令行直接调用 API 操作演示文稿。

使用方法:
    python cli.py <command> [options]

命令列表:
    new                    创建新的演示文稿
    open <file>            打开演示文稿文件
    save [file]            保存演示文稿
    add-slide [layout]     添加幻灯片
    remove-slide <id>      删除幻灯片
    list-slides            列出所有幻灯片
    add-element <slide-id> <type>   添加元素
    export-html <file>     导出为 HTML
    export-single <file>   导出为单文件 HTML
    info                   显示演示文稿信息

示例:
    python cli.py new
    python cli.py add-slide title_subtitle
    python cli.py add-element slide-1 textbox --content "Hello World"
    python cli.py export-html output.html
    python cli.py save my_presentation.pptjson
"""

import sys
import os
import json
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from api import API


class CLIController:
    """命令行控制器"""
    
    def __init__(self):
        self.api = API()
        self.current_file = None
    
    def cmd_new(self, args):
        """创建新的演示文稿"""
        result = self.api.new_presentation()
        print(f"✓ 已创建新演示文稿")
        print(f"  幻灯片数量: {len(result.get('slides', []))}")
        if result.get('slides'):
            print(f"  第一张幻灯片 ID: {result['slides'][0]['id']}")
        return result
    
    def cmd_open(self, args):
        """打开演示文稿文件"""
        if not args.file:
            print("错误: 请指定文件路径")
            return None
        
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在: {args.file}")
            return None
        
        with open(args.file, 'r', encoding='utf-8') as f:
            json_data = f.read()
        
        result = self.api.load_presentation(json_data)
        if result.get('success'):
            self.current_file = args.file
            data = result.get('data', {})
            print(f"✓ 已打开: {args.file}")
            print(f"  标题: {data.get('metadata', {}).get('title', '未命名')}")
            print(f"  幻灯片数量: {len(data.get('slides', []))}")
        else:
            print(f"✗ 打开失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_save(self, args):
        """保存演示文稿"""
        file_path = args.file or self.current_file
        if not file_path:
            print("错误: 请指定保存路径")
            return None
        
        json_data = self.api.save_presentation()
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(json_data)
        
        self.current_file = file_path
        print(f"✓ 已保存到: {file_path}")
        return {"success": True, "file_path": file_path}
    
    def cmd_add_slide(self, args):
        """添加幻灯片"""
        layout = args.layout or 'title_subtitle'
        after_id = args.after if hasattr(args, 'after') else None
        
        result = self.api.add_slide(after_id, layout)
        if result.get('success'):
            slide = result.get('slide', {})
            print(f"✓ 已添加幻灯片")
            print(f"  ID: {slide.get('id')}")
            print(f"  版式: {layout}")
        else:
            print(f"✗ 添加失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_remove_slide(self, args):
        """删除幻灯片"""
        if not args.slide_id:
            print("错误: 请指定幻灯片 ID")
            return None
        
        result = self.api.remove_slide(args.slide_id)
        if result.get('success'):
            print(f"✓ 已删除幻灯片: {args.slide_id}")
        else:
            print(f"✗ 删除失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_list_slides(self, args):
        """列出所有幻灯片"""
        presentation = self.api.get_presentation()
        slides = presentation.get('slides', [])
        
        print(f"\n演示文稿幻灯片列表 (共 {len(slides)} 张)")
        print("-" * 50)
        
        for i, slide in enumerate(slides):
            metadata = slide.get('metadata', {})
            elements_count = len(slide.get('elements', []))
            print(f"  [{i+1}] ID: {slide.get('id')}")
            print(f"      版式: {metadata.get('layout', 'unknown')}")
            print(f"      元素数: {elements_count}")
            print()
        
        return presentation
    
    def cmd_add_element(self, args):
        """添加元素"""
        if not args.slide_id or not args.element_type:
            print("错误: 请指定幻灯片 ID 和元素类型")
            return None
        
        style = {}
        if args.x is not None:
            style['x'] = args.x
        if args.y is not None:
            style['y'] = args.y
        if args.width is not None:
            style['width'] = args.width
        if args.height is not None:
            style['height'] = args.height
        if args.color:
            style['color'] = args.color
        if args.font_size:
            style['fontSize'] = args.font_size
        
        content = args.content
        
        result = self.api.add_element(args.slide_id, args.element_type, style, content)
        if result.get('success'):
            element = result.get('element', {})
            print(f"✓ 已添加元素")
            print(f"  ID: {element.get('id')}")
            print(f"  类型: {args.element_type}")
        else:
            print(f"✗ 添加失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_update_element(self, args):
        """更新元素"""
        if not args.slide_id or not args.element_id:
            print("错误: 请指定幻灯片 ID 和元素 ID")
            return None
        
        style = {}
        if args.x is not None:
            style['x'] = args.x
        if args.y is not None:
            style['y'] = args.y
        if args.width is not None:
            style['width'] = args.width
        if args.height is not None:
            style['height'] = args.height
        if args.color:
            style['color'] = args.color
        if args.font_size:
            style['fontSize'] = args.font_size
        
        result = self.api.update_element(args.slide_id, args.element_id, style, args.content)
        if result.get('success'):
            print(f"✓ 已更新元素: {args.element_id}")
        else:
            print(f"✗ 更新失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_remove_element(self, args):
        """删除元素"""
        if not args.slide_id or not args.element_id:
            print("错误: 请指定幻灯片 ID 和元素 ID")
            return None
        
        result = self.api.remove_element(args.slide_id, args.element_id)
        if result.get('success'):
            print(f"✓ 已删除元素: {args.element_id}")
        else:
            print(f"✗ 删除失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_export_html(self, args):
        """导出为 HTML"""
        if not args.file:
            print("错误: 请指定输出文件路径")
            return None
        
        html_content = self.api.export_html()
        with open(args.file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✓ 已导出 HTML: {args.file}")
        print(f"  文件大小: {len(html_content)} 字节")
        return {"success": True, "file": args.file}
    
    def cmd_export_single(self, args):
        """导出为单文件 HTML"""
        if not args.file:
            print("错误: 请指定输出文件路径")
            return None
        
        html_content = self.api.export_single_file()
        with open(args.file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✓ 已导出单文件 HTML: {args.file}")
        print(f"  文件大小: {len(html_content)} 字节")
        return {"success": True, "file": args.file}
    
    def cmd_info(self, args):
        """显示演示文稿信息"""
        presentation = self.api.get_presentation()
        metadata = presentation.get('metadata', {})
        slides = presentation.get('slides', [])
        
        print("\n" + "=" * 50)
        print("  演示文稿信息")
        print("=" * 50)
        print(f"  标题: {metadata.get('title', '未命名')}")
        print(f"  作者: {metadata.get('author', '未知')}")
        print(f"  创建时间: {metadata.get('createdAt', '未知')}")
        print(f"  修改时间: {metadata.get('modifiedAt', '未知')}")
        print(f"  幻灯片数量: {len(slides)}")
        print(f"  当前文件: {self.current_file or '未保存'}")
        print("=" * 50 + "\n")
        
        return presentation
    
    def cmd_layouts(self, args):
        """显示可用版式"""
        result = self.api.get_layout_templates()
        templates = result.get('templates', {})
        
        print("\n可用版式列表:")
        print("-" * 40)
        for name, template in templates.items():
            print(f"  {name}")
            if template.get('elements'):
                print(f"    元素数: {len(template['elements'])}")
        print()
        
        return result
    
    def cmd_undo(self, args):
        """撤销操作"""
        result = self.api.undo()
        if result.get('success'):
            print("✓ 已撤销")
        else:
            print(f"✗ 撤销失败: {result.get('message', '没有可撤销的操作')}")
        return result
    
    def cmd_redo(self, args):
        """重做操作"""
        result = self.api.redo()
        if result.get('success'):
            print("✓ 已重做")
        else:
            print(f"✗ 重做失败: {result.get('message', '没有可重做的操作')}")
        return result
    
    def cmd_set_animation(self, args):
        """设置元素动画"""
        if not args.slide_id or not args.element_id:
            print("错误: 请指定幻灯片 ID 和元素 ID")
            return None
        
        result = self.api.set_element_animation(
            args.slide_id, 
            args.element_id, 
            args.animation_type,
            args.duration,
            args.delay
        )
        if result.get('success'):
            print(f"✓ 已设置动画: {args.animation_type}")
        else:
            print(f"✗ 设置失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_move_slide(self, args):
        """移动幻灯片"""
        result = self.api.move_slide(args.from_index, args.to_index)
        if result.get('success'):
            print(f"✓ 已移动幻灯片: {args.from_index} -> {args.to_index}")
        else:
            print(f"✗ 移动失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_duplicate_slide(self, args):
        """复制幻灯片"""
        if not args.slide_id:
            print("错误: 请指定幻灯片 ID")
            return None
        
        result = self.api.duplicate_slide(args.slide_id)
        if result.get('success'):
            new_slide = result.get('slide', {})
            print(f"✓ 已复制幻灯片")
            print(f"  新幻灯片 ID: {new_slide.get('id')}")
        else:
            print(f"✗ 复制失败: {result.get('message', '未知错误')}")
        return result
    
    def cmd_set_metadata(self, args):
        """设置演示文稿元数据"""
        metadata = {}
        if args.title:
            metadata['title'] = args.title
        if args.author:
            metadata['author'] = args.author
        
        if not metadata:
            print("错误: 请指定要设置的元数据")
            return None
        
        result = self.api.update_presentation_metadata(metadata)
        if result.get('success'):
            print("✓ 已更新元数据")
        else:
            print(f"✗ 更新失败: {result.get('message', '未知错误')}")
        return result


def create_parser():
    """创建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        description='HTML PPT 编辑器 - 命令行工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python cli.py new                                    # 创建新演示文稿
  python cli.py add-slide title_subtitle               # 添加标题幻灯片
  python cli.py add-element slide-1 textbox --content "Hello"  # 添加文本元素
  python cli.py export-html output.html                # 导出为 HTML
  python cli.py save my_ppt.pptjson                    # 保存演示文稿
  python cli.py open my_ppt.pptjson                    # 打开演示文稿
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    parser_new = subparsers.add_parser('new', help='创建新的演示文稿')
    
    parser_open = subparsers.add_parser('open', help='打开演示文稿文件')
    parser_open.add_argument('file', help='文件路径')
    
    parser_save = subparsers.add_parser('save', help='保存演示文稿')
    parser_save.add_argument('file', nargs='?', help='保存路径 (可选)')
    
    parser_add_slide = subparsers.add_parser('add-slide', help='添加幻灯片')
    parser_add_slide.add_argument('layout', nargs='?', default='title_subtitle',
                                   help='幻灯片版式')
    parser_add_slide.add_argument('--after', help='在指定幻灯片之后添加')
    
    parser_remove_slide = subparsers.add_parser('remove-slide', help='删除幻灯片')
    parser_remove_slide.add_argument('slide_id', help='幻灯片 ID')
    
    parser_list = subparsers.add_parser('list-slides', help='列出所有幻灯片')
    
    parser_move_slide = subparsers.add_parser('move-slide', help='移动幻灯片')
    parser_move_slide.add_argument('from_index', type=int, help='源索引')
    parser_move_slide.add_argument('to_index', type=int, help='目标索引')
    
    parser_dup_slide = subparsers.add_parser('duplicate-slide', help='复制幻灯片')
    parser_dup_slide.add_argument('slide_id', help='幻灯片 ID')
    
    parser_add_elem = subparsers.add_parser('add-element', help='添加元素')
    parser_add_elem.add_argument('slide_id', help='幻灯片 ID')
    parser_add_elem.add_argument('element_type', help='元素类型 (textbox, shape, image, button)')
    parser_add_elem.add_argument('--content', help='元素内容')
    parser_add_elem.add_argument('--x', type=int, help='X 坐标')
    parser_add_elem.add_argument('--y', type=int, help='Y 坐标')
    parser_add_elem.add_argument('--width', type=int, help='宽度')
    parser_add_elem.add_argument('--height', type=int, help='高度')
    parser_add_elem.add_argument('--color', help='颜色')
    parser_add_elem.add_argument('--font-size', type=int, help='字体大小')
    
    parser_update_elem = subparsers.add_parser('update-element', help='更新元素')
    parser_update_elem.add_argument('slide_id', help='幻灯片 ID')
    parser_update_elem.add_argument('element_id', help='元素 ID')
    parser_update_elem.add_argument('--content', help='元素内容')
    parser_update_elem.add_argument('--x', type=int, help='X 坐标')
    parser_update_elem.add_argument('--y', type=int, help='Y 坐标')
    parser_update_elem.add_argument('--width', type=int, help='宽度')
    parser_update_elem.add_argument('--height', type=int, help='高度')
    parser_update_elem.add_argument('--color', help='颜色')
    parser_update_elem.add_argument('--font-size', type=int, help='字体大小')
    
    parser_remove_elem = subparsers.add_parser('remove-element', help='删除元素')
    parser_remove_elem.add_argument('slide_id', help='幻灯片 ID')
    parser_remove_elem.add_argument('element_id', help='元素 ID')
    
    parser_export_html = subparsers.add_parser('export-html', help='导出为 HTML')
    parser_export_html.add_argument('file', help='输出文件路径')
    
    parser_export_single = subparsers.add_parser('export-single', help='导出为单文件 HTML')
    parser_export_single.add_argument('file', help='输出文件路径')
    
    parser_info = subparsers.add_parser('info', help='显示演示文稿信息')
    
    parser_layouts = subparsers.add_parser('layouts', help='显示可用版式')
    
    parser_undo = subparsers.add_parser('undo', help='撤销操作')
    
    parser_redo = subparsers.add_parser('redo', help='重做操作')
    
    parser_anim = subparsers.add_parser('set-animation', help='设置元素动画')
    parser_anim.add_argument('slide_id', help='幻灯片 ID')
    parser_anim.add_argument('element_id', help='元素 ID')
    parser_anim.add_argument('animation_type', help='动画类型')
    parser_anim.add_argument('--duration', type=float, default=0.5, help='动画时长')
    parser_anim.add_argument('--delay', type=float, default=0, help='动画延迟')
    
    parser_meta = subparsers.add_parser('set-metadata', help='设置演示文稿元数据')
    parser_meta.add_argument('--title', help='标题')
    parser_meta.add_argument('--author', help='作者')
    
    return parser


def main():
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    controller = CLIController()
    
    command_map = {
        'new': controller.cmd_new,
        'open': controller.cmd_open,
        'save': controller.cmd_save,
        'add-slide': controller.cmd_add_slide,
        'remove-slide': controller.cmd_remove_slide,
        'list-slides': controller.cmd_list_slides,
        'move-slide': controller.cmd_move_slide,
        'duplicate-slide': controller.cmd_duplicate_slide,
        'add-element': controller.cmd_add_element,
        'update-element': controller.cmd_update_element,
        'remove-element': controller.cmd_remove_element,
        'export-html': controller.cmd_export_html,
        'export-single': controller.cmd_export_single,
        'info': controller.cmd_info,
        'layouts': controller.cmd_layouts,
        'undo': controller.cmd_undo,
        'redo': controller.cmd_redo,
        'set-animation': controller.cmd_set_animation,
        'set-metadata': controller.cmd_set_metadata,
    }
    
    if args.command in command_map:
        command_map[args.command](args)
    else:
        print(f"未知命令: {args.command}")
        parser.print_help()


if __name__ == '__main__':
    main()
