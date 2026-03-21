import sys
sys.path.insert(0, 'src')

from api import API

api = API()
print('API 创建成功')

result = api.new_presentation()
print(f'新演示文稿创建成功: {len(result["slides"])} 张幻灯片')

html = api.export_html()
print(f'HTML 导出成功，长度: {len(html)} 字符')
print('所有测试通过!')
