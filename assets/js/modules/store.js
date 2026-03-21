function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

class EditorStore {
    constructor() {
        this.presentation = this.createInitialPresentation();
        this.activeSlideId = this.presentation.slides[0]?.id || null;
        this.activeElementId = null;
        this.selectedElementIds = [];
        this.clipboard = null;
        this.slideClipboard = null;
        this.history = [JSON.parse(JSON.stringify(this.presentation))];
        this.historyIndex = 0;
        this.language = 'zh';
        this.panels = {
            left: true,
            right: false,
            bottom: false,
            propertyPanelPosition: 'top'
        };
        this.showAlignment = false;
        this.isPreview = false;
        this.previewSlideIndex = 0;
        this.listeners = [];
        this.userClosedPropertyPanel = false;
        this.layoutTemplates = null;
        this.defaultLayout = 'title_subtitle';
        this.askForLayout = true;
    }

    createInitialPresentation() {
        const slideId = generateId();
        return {
            settings: { advanceMode: 'click', smartGuidesEnabled: true },
            slides: [{
                id: slideId,
                elements: [{
                    id: generateId(),
                    type: 'textbox',
                    content: '点击此处输入标题',
                    textMode: 'fixed',
                    style: {
                        x: 100, y: 200, width: 1000, height: 100,
                        fontSize: 54, color: '#333333', opacity: 1,
                        strokeWidth: 0, angle: 0, skewX: 0, skewY: 0,
                        textAlign: 'center', lineHeight: 1.2,
                        fontWeight: 'bold', fontStyle: 'normal'
                    },
                    animation: { type: 'none', duration: 0.5, delay: 0 }
                }, {
                    id: generateId(),
                    type: 'textbox',
                    content: '点击此处输入副标题',
                    textMode: 'fixed',
                    style: {
                        x: 200, y: 350, width: 800, height: 60,
                        fontSize: 28, color: '#666666', opacity: 1,
                        strokeWidth: 0, angle: 0, skewX: 0, skewY: 0,
                        textAlign: 'center', lineHeight: 1.2,
                        fontWeight: 'normal', fontStyle: 'normal'
                    },
                    animation: { type: 'none', duration: 0.5, delay: 0 }
                }]
            }]
        };
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.getState()));
    }

    getState() {
        return {
            presentation: this.presentation,
            activeSlideId: this.activeSlideId,
            activeElementId: this.activeElementId,
            selectedElementIds: this.selectedElementIds,
            language: this.language,
            panels: this.panels,
            showAlignment: this.showAlignment,
            isPreview: this.isPreview,
            previewSlideIndex: this.previewSlideIndex,
            canUndo: this.historyIndex > 0,
            canRedo: this.historyIndex < this.history.length - 1
        };
    }

    pushHistory() {
        const newHistory = this.history.slice(0, this.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(this.presentation)));
        if (newHistory.length > 50) newHistory.shift();
        this.history = newHistory;
        this.historyIndex = newHistory.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.presentation = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.activeElementId = null;
            this.notify();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.presentation = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.activeElementId = null;
            this.notify();
        }
    }

    addSlide() {
        const newSlideId = generateId();
        this.presentation.slides.push({ id: newSlideId, elements: [] });
        this.pushHistory();
        this.activeSlideId = newSlideId;
        this.activeElementId = null;
        this.notify();
    }
    
    addSlideWithLayout(layout) {
        const templates = {
            title_subtitle: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 100, y: 200, width: 1000, height: 100, fontSize: 54, fontWeight: 'bold', color: '#333333', textAlign: 'center' } },
                    { type: 'textbox', content: '点击此处输入副标题', textMode: 'fixed', style: { x: 200, y: 350, width: 800, height: 60, fontSize: 28, color: '#666666', textAlign: 'center' } }
                ]
            },
            title_content: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 80, fontSize: 40, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'textbox', content: '点击此处输入内容', textMode: 'fixed', style: { x: 50, y: 130, width: 1100, height: 500, fontSize: 24, color: '#333333', textAlign: 'left', lineHeight: 1.6 } }
                ]
            },
            title_content_divider: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 70, fontSize: 36, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'shape', content: null, style: { x: 50, y: 110, width: 200, height: 4, fill: '#3b82f6' } },
                    { type: 'textbox', content: '点击此处输入内容', textMode: 'fixed', style: { x: 50, y: 140, width: 1100, height: 480, fontSize: 22, color: '#333333', textAlign: 'left', lineHeight: 1.6 } }
                ]
            },
            two_column: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 70, fontSize: 36, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'textbox', content: '左栏内容', textMode: 'fixed', style: { x: 50, y: 130, width: 520, height: 480, fontSize: 20, color: '#333333', textAlign: 'left', lineHeight: 1.5 } },
                    { type: 'textbox', content: '右栏内容', textMode: 'fixed', style: { x: 630, y: 130, width: 520, height: 480, fontSize: 20, color: '#333333', textAlign: 'left', lineHeight: 1.5 } }
                ]
            },
            blank: { elements: [] },
            section_header: {
                elements: [
                    { type: 'textbox', content: '章节标题', textMode: 'fixed', style: { x: 100, y: 250, width: 1000, height: 120, fontSize: 60, fontWeight: 'bold', color: '#333333', textAlign: 'center' } },
                    { type: 'shape', content: null, style: { x: 450, y: 400, width: 300, height: 6, fill: '#3b82f6' } }
                ]
            }
        };
        
        const newSlideId = generateId();
        const template = templates[layout] || templates.title_subtitle;
        const elements = template.elements.map(el => ({
            ...el,
            id: generateId(),
            style: { opacity: 1, strokeWidth: 0, angle: 0, skewX: 0, skewY: 0, ...el.style },
            animation: { type: 'none', duration: 0.5, delay: 0 }
        }));
        
        this.presentation.slides.push({ id: newSlideId, elements });
        this.pushHistory();
        this.activeSlideId = newSlideId;
        this.activeElementId = null;
        this.notify();
    }
    
    changeSlideLayout(slideId, layout) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        
        const templates = {
            title_subtitle: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 100, y: 200, width: 1000, height: 100, fontSize: 54, fontWeight: 'bold', color: '#333333', textAlign: 'center' } },
                    { type: 'textbox', content: '点击此处输入副标题', textMode: 'fixed', style: { x: 200, y: 350, width: 800, height: 60, fontSize: 28, color: '#666666', textAlign: 'center' } }
                ]
            },
            title_content: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 80, fontSize: 40, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'textbox', content: '点击此处输入内容', textMode: 'fixed', style: { x: 50, y: 130, width: 1100, height: 500, fontSize: 24, color: '#333333', textAlign: 'left', lineHeight: 1.6 } }
                ]
            },
            title_content_divider: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 70, fontSize: 36, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'shape', content: null, style: { x: 50, y: 110, width: 200, height: 4, fill: '#3b82f6' } },
                    { type: 'textbox', content: '点击此处输入内容', textMode: 'fixed', style: { x: 50, y: 140, width: 1100, height: 480, fontSize: 22, color: '#333333', textAlign: 'left', lineHeight: 1.6 } }
                ]
            },
            two_column: {
                elements: [
                    { type: 'textbox', content: '点击此处输入标题', textMode: 'fixed', style: { x: 50, y: 30, width: 1100, height: 70, fontSize: 36, fontWeight: 'bold', color: '#333333', textAlign: 'left' } },
                    { type: 'textbox', content: '左栏内容', textMode: 'fixed', style: { x: 50, y: 130, width: 520, height: 480, fontSize: 20, color: '#333333', textAlign: 'left', lineHeight: 1.5 } },
                    { type: 'textbox', content: '右栏内容', textMode: 'fixed', style: { x: 630, y: 130, width: 520, height: 480, fontSize: 20, color: '#333333', textAlign: 'left', lineHeight: 1.5 } }
                ]
            },
            blank: { elements: [] },
            section_header: {
                elements: [
                    { type: 'textbox', content: '章节标题', textMode: 'fixed', style: { x: 100, y: 250, width: 1000, height: 120, fontSize: 60, fontWeight: 'bold', color: '#333333', textAlign: 'center' } },
                    { type: 'shape', content: null, style: { x: 450, y: 400, width: 300, height: 6, fill: '#3b82f6' } }
                ]
            }
        };
        
        const template = templates[layout];
        if (!template) return;
        
        slide.elements = template.elements.map(el => ({
            ...el,
            id: generateId(),
            style: { opacity: 1, strokeWidth: 0, angle: 0, skewX: 0, skewY: 0, ...el.style },
            animation: { type: 'none', duration: 0.5, delay: 0 }
        }));
        
        this.pushHistory();
        this.activeElementId = null;
        this.notify();
    }
    
    copySlide(slideId) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        this.slideClipboard = JSON.parse(JSON.stringify(slide));
    }
    
    pasteSlide() {
        if (!this.slideClipboard) return;
        const newSlide = JSON.parse(JSON.stringify(this.slideClipboard));
        newSlide.id = generateId();
        newSlide.elements.forEach(el => el.id = generateId());
        
        const currentIndex = this.presentation.slides.findIndex(s => s.id === this.activeSlideId);
        const insertIndex = currentIndex >= 0 ? currentIndex + 1 : this.presentation.slides.length;
        this.presentation.slides.splice(insertIndex, 0, newSlide);
        
        this.pushHistory();
        this.activeSlideId = newSlide.id;
        this.activeElementId = null;
        this.notify();
    }

    deleteSlide(id) {
        const index = this.presentation.slides.findIndex(s => s.id === id);
        if (index === -1 || this.presentation.slides.length <= 1) return;
        this.presentation.slides.splice(index, 1);
        // 清理缩略图快照
        if (window.SlidesPanel) {
            window.SlidesPanel.removeSnapshot(id);
        }
        this.pushHistory();
        if (this.activeSlideId === id) {
            this.activeSlideId = this.presentation.slides[Math.max(0, index - 1)]?.id || null;
        }
        this.activeElementId = null;
        this.notify();
    }

    duplicateSlide(id) {
        const index = this.presentation.slides.findIndex(s => s.id === id);
        if (index === -1) return;
        const slide = this.presentation.slides[index];
        const newSlide = JSON.parse(JSON.stringify(slide));
        newSlide.id = generateId();
        newSlide.elements.forEach(el => el.id = generateId());
        this.presentation.slides.splice(index + 1, 0, newSlide);
        this.pushHistory();
        this.activeSlideId = newSlide.id;
        this.activeElementId = null;
        this.notify();
    }

    selectSlide(id) {
        // 切换前保存当前幻灯片的缩略图快照
        if (this.activeSlideId && this.activeSlideId !== id) {
            if (window.SlidesPanel) {
                window.SlidesPanel.saveSnapshot(this.activeSlideId);
            }
        }
        this.activeSlideId = id;
        this.activeElementId = null;
        this.notify();
    }

    addElement(slideId, element) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const newElement = {
            ...element,
            id: generateId(),
            style: { opacity: 1, strokeWidth: 0, angle: 0, skewX: 0, skewY: 0, ...element.style },
            animation: element.animation || { type: 'none', duration: 0.5, delay: 0 }
        };
        slide.elements.push(newElement);
        this.pushHistory();
        this.activeElementId = newElement.id;
        this.notify();
    }

    updateElement(slideId, elementId, updates) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const element = slide.elements.find(e => e.id === elementId);
        if (!element) return;
        
        if (updates.style) {
            Object.assign(element.style, updates.style);
            delete updates.style;
        }
        if (updates.animation) {
            Object.assign(element.animation, updates.animation);
            delete updates.animation;
        }
        Object.assign(element, updates);
        
        this.pushHistory();
        this.notify();
    }

    deleteElement(slideId, elementId) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        slide.elements = slide.elements.filter(e => e.id !== elementId);
        this.pushHistory();
        if (this.activeElementId === elementId) this.activeElementId = null;
        this.notify();
    }

    reorderElement(slideId, elementId, direction) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const index = slide.elements.findIndex(e => e.id === elementId);
        if (index === -1) return;
        const [el] = slide.elements.splice(index, 1);
        if (direction === 'up') slide.elements.splice(Math.min(index + 1, slide.elements.length), 0, el);
        else if (direction === 'down') slide.elements.splice(Math.max(index - 1, 0), 0, el);
        else if (direction === 'top') slide.elements.push(el);
        else if (direction === 'bottom') slide.elements.unshift(el);
        this.pushHistory();
        this.notify();
    }

    selectElement(id) {
        this.activeElementId = id;
        this.selectedElementIds = [];
        if (id && !this.userClosedPropertyPanel && this.panels.propertyPanelPosition === 'hidden') {
            this.panels.propertyPanelPosition = 'top';
        }
        this.notify();
    }

    setMultiSelection(elementIds) {
        this.activeElementId = null;
        this.selectedElementIds = elementIds || [];
        this.notify();
    }

    clearSelection() {
        this.activeElementId = null;
        this.selectedElementIds = [];
        this.notify();
    }

    copyElement(element) {
        this.clipboard = JSON.parse(JSON.stringify(element));
    }

    pasteElement(slideId) {
        if (!this.clipboard) return;
        const newElement = {
            ...this.clipboard,
            id: generateId(),
            style: { ...this.clipboard.style, x: this.clipboard.style.x + 20, y: this.clipboard.style.y + 20 }
        };
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        slide.elements.push(newElement);
        this.pushHistory();
        this.activeElementId = newElement.id;
        this.notify();
    }

    resetElement(slideId, elementId) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const element = slide.elements.find(e => e.id === elementId);
        if (!element) return;
        element.style.angle = 0;
        element.style.skewX = 0;
        element.style.skewY = 0;
        this.pushHistory();
        this.notify();
    }

    alignElements(slideId, elementIds, type) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const canvasWidth = 1200, canvasHeight = 675;
        slide.elements.forEach(e => {
            if (!elementIds.includes(e.id)) return;
            const w = e.style.width || 100;
            const h = e.style.height || 50;
            
            if (type === 'left') e.style.x = 0;
            else if (type === 'center') e.style.x = (canvasWidth - w) / 2;
            else if (type === 'right') e.style.x = canvasWidth - w;
            else if (type === 'top') e.style.y = 0;
            else if (type === 'middle') e.style.y = (canvasHeight - h) / 2;
            else if (type === 'bottom') e.style.y = canvasHeight - h;
            else if (type === 'top-left') { e.style.x = 0; e.style.y = 0; }
            else if (type === 'top-center') { e.style.x = (canvasWidth - w) / 2; e.style.y = 0; }
            else if (type === 'top-right') { e.style.x = canvasWidth - w; e.style.y = 0; }
            else if (type === 'middle-left') { e.style.x = 0; e.style.y = (canvasHeight - h) / 2; }
            else if (type === 'center-middle') { e.style.x = (canvasWidth - w) / 2; e.style.y = (canvasHeight - h) / 2; }
            else if (type === 'middle-right') { e.style.x = canvasWidth - w; e.style.y = (canvasHeight - h) / 2; }
            else if (type === 'bottom-left') { e.style.x = 0; e.style.y = canvasHeight - h; }
            else if (type === 'bottom-center') { e.style.x = (canvasWidth - w) / 2; e.style.y = canvasHeight - h; }
            else if (type === 'bottom-right') { e.style.x = canvasWidth - w; e.style.y = canvasHeight - h; }
        });
        this.pushHistory();
        this.notify();
    }

    toggleAlignment() {
        this.showAlignment = !this.showAlignment;
        this.notify();
    }

    setPreview(isPreview, index = 0) {
        this.isPreview = isPreview;
        this.previewSlideIndex = index;
        this.notify();
    }

    setLanguage(lang) {
        this.language = lang;
        this.notify();
    }

    togglePanel(panel) {
        this.panels[panel] = !this.panels[panel];
        this.notify();
    }

    setPropertyPanelPosition(position) {
        this.panels.propertyPanelPosition = position;
        if (position === 'hidden') {
            this.userClosedPropertyPanel = true;
        }
        this.notify();
    }

    updateSettings(settings) {
        this.presentation.settings = { ...this.presentation.settings, ...settings };
        this.pushHistory();
        this.notify();
    }

    addElement(slideId, element) {
        const slide = this.presentation.slides.find(s => s.id === slideId);
        if (!slide) return;
        const newElement = {
            ...element,
            id: generateId(),
            style: { opacity: 1, strokeWidth: 0, angle: 0, skewX: 0, skewY: 0, ...element.style },
            animation: element.animation || { type: 'none', duration: 0.5, delay: 0 }
        };
        slide.elements.push(newElement);
        this.pushHistory();
        this.activeElementId = newElement.id;
        this.notify();
    }

    loadPresentation(data) {
        this.presentation = data;
        this.activeSlideId = data.slides[0]?.id || null;
        this.activeElementId = null;
        this.history = [JSON.parse(JSON.stringify(data))];
        this.historyIndex = 0;
        this.notify();
    }
}

window.EditorStore = EditorStore;
window.generateId = generateId;
