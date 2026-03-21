const translations = {
    en: {
        toolbar: {
            text: 'Text', heading: 'Heading', body: 'Body text',
            shapes: 'Shapes', rectangle: 'Rectangle', circle: 'Circle',
            triangle: 'Triangle', line: 'Line', star: 'Star', polygon: 'Polygon',
            insert: 'Insert', button: 'Button', tools: 'Tools',
            preview: 'Preview', window: 'Window', exportPdf: 'Export PDF',
            toggleLeftPanel: 'Left Panel', toggleBottomPanel: 'Bottom Panel',
            screenshot: 'Screenshot', album: 'Album', table: 'Table', icon: 'Icon',
            language: 'Language', pureText: 'Pure Text'
        },
        panels: {
            slides: 'Slides', properties: 'Properties', layers: 'Layers',
            animations: 'Animations', code: 'JSON Data', settings: 'Settings'
        },
        properties: {
            transform: 'Transform', appearance: 'Appearance',
            x: 'X', y: 'Y', width: 'Width', height: 'Height',
            angle: 'Rotation', opacity: 'Opacity',
            fill: 'Fill', stroke: 'Stroke', strokeWidth: 'Stroke Width',
            fontSize: 'Font Size', color: 'Text Color', lineHeight: 'Line Height',
            delete: 'Delete', bringForward: 'Bring Forward', bringToFront: 'Bring to Front',
            sendBackward: 'Send Backward', sendToBack: 'Send to Back',
            noElements: 'No elements', style: 'Style', align: 'Align',
            left: 'Left', center: 'Center', right: 'Right',
            bold: 'Bold', italic: 'Italic', underline: 'Underline',
            link: 'Link', addLink: 'Add Link', editLink: 'Edit Link',
            textMode: 'Mode', pureText: 'Auto Size', textBox: 'Fixed Box',
            backgroundColor: 'Background', skewX: 'Skew X', skewY: 'Skew Y',
            advanceMode: 'Advance Mode', clickAnywhere: 'Click Anywhere',
            buttonOnly: 'Button Only', smartGuides: 'Smart Guides'
        },
        animations: {
            none: 'None', fadeIn: 'Fade In', slideInLeft: 'Slide In (Left)',
            slideInRight: 'Slide In (Right)', slideInUp: 'Slide In (Up)',
            slideInDown: 'Slide In (Down)', scaleIn: 'Scale In',
            duration: 'Duration (s)', delay: 'Delay (s)', type: 'Type'
        },
        contextMenu: {
            delete: 'Delete', bringForward: 'Bring Forward',
            sendBackward: 'Send Backward', copy: 'Copy',
            paste: 'Paste', reset: 'Reset', hyperlink: 'Hyperlink',
            exit: 'Exit'
        },
        linkModal: {
            title: 'Set Link', urlTab: 'Website / Media', slideTab: 'Slide',
            urlLabel: 'URL', slideLabel: 'Select Slide', urlHint: 'Enter a website URL or media link.',
            slideHint: 'Navigate to another slide in this presentation.',
            cancel: 'Cancel', save: 'Save'
        }
    },
    zh: {
        toolbar: {
            text: '文本', heading: '标题', body: '正文',
            shapes: '形状', rectangle: '矩形', circle: '圆形',
            triangle: '三角形', line: '线条', star: '星形', polygon: '多边形',
            insert: '插入', button: '按钮', tools: '工具',
            preview: '放映', window: '窗口', exportPdf: '导出 PDF',
            toggleLeftPanel: '左侧栏', toggleBottomPanel: '底部栏',
            screenshot: '截图', album: '相册', table: '表格', icon: '图标',
            language: '语言', pureText: '纯文本'
        },
        panels: {
            slides: '幻灯片', properties: '属性', layers: '图层',
            animations: '动画', code: 'JSON 数据', settings: '设置'
        },
        properties: {
            transform: '变换', appearance: '外观',
            x: 'X 坐标', y: 'Y 坐标', width: '宽度', height: '高度',
            angle: '旋转角度', opacity: '不透明度',
            fill: '填充颜色', stroke: '边框颜色', strokeWidth: '边框宽度',
            fontSize: '字体大小', color: '文本颜色', lineHeight: '行高',
            delete: '删除', bringForward: '上移一层', bringToFront: '置于顶层',
            sendBackward: '下移一层', sendToBack: '置于底层',
            noElements: '此幻灯片没有元素', style: '样式', align: '对齐',
            left: '左对齐', center: '居中', right: '右对齐',
            bold: '粗体', italic: '斜体', underline: '下划线',
            link: '链接', addLink: '添加链接', editLink: '编辑链接',
            textMode: '模式', pureText: '纯文本', textBox: '文本框',
            backgroundColor: '背景色', skewX: 'X 倾斜', skewY: 'Y 倾斜',
            advanceMode: '翻页模式', clickAnywhere: '点击任意处',
            buttonOnly: '仅按钮', smartGuides: '智能参考线'
        },
        animations: {
            none: '无', fadeIn: '淡入', slideInLeft: '从左滑入',
            slideInRight: '从右滑入', slideInUp: '从下滑入',
            slideInDown: '从上滑入', scaleIn: '缩放进入',
            duration: '持续时间 (秒)', delay: '延迟 (秒)', type: '类型'
        },
        contextMenu: {
            delete: '删除', bringForward: '上移一层',
            sendBackward: '下移一层', copy: '复制',
            paste: '粘贴', reset: '重置', hyperlink: '超链接',
            exit: '退出'
        },
        linkModal: {
            title: '设置链接', urlTab: '网址 / 媒体', slideTab: '幻灯片',
            urlLabel: 'URL', slideLabel: '选择幻灯片', urlHint: '输入网站 URL 或媒体链接',
            slideHint: '跳转到演示文稿中的其他幻灯片',
            cancel: '取消', save: '保存'
        }
    }
};

function getTranslation(language) {
    return translations[language] || translations.zh;
}

window.translations = translations;
window.getTranslation = getTranslation;
