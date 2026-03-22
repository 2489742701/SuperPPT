/**
 * 组合控件模块
 * 
 * 包含投票组件和随机名单组件等特殊控件
 * 这些控件由多个子控件组成，具有特殊的删除保护机制
 */

const CompositeComponents = {
    // ==================== 投票组件 ====================
    
    /**
     * 创建投票组件
     * @param {Object} options - 配置选项
     * @returns {Object} 投票组件数据
     */
    createPoll(options = {}) {
        const {
            title = '投票',
            options: pollOptions = ['选项 A', '选项 B', '选项 C'],
            x = 100,
            y = 100,
            width = 400,
            style = 'bars' // bars, pie, cards
        } = options;
        
        const pollId = `poll-${Date.now()}`;
        const elements = [];
        
        // 创建标题
        elements.push({
            id: `${pollId}-title`,
            type: 'textbox',
            content: title,
            style: {
                x: 0,
                y: 0,
                width: width,
                height: 50,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#333333',
                textAlign: 'center'
            },
            isCompositeChild: true,
            compositeParent: pollId,
            compositeType: 'poll'
        });
        
        // 创建选项按钮
        const optionHeight = 60;
        const optionGap = 10;
        
        pollOptions.forEach((option, index) => {
            elements.push({
                id: `${pollId}-option-${index}`,
                type: 'button',
                content: option,
                style: {
                    x: 0,
                    y: 60 + index * (optionHeight + optionGap),
                    width: width,
                    height: optionHeight,
                    fontSize: 18,
                    backgroundColor: this.getPollOptionColor(index),
                    color: '#ffffff',
                    borderRadius: 8
                },
                isCompositeChild: true,
                compositeParent: pollId,
                compositeType: 'poll',
                pollOptionIndex: index,
                pollVotes: 0
            });
        });
        
        // 创建结果显示区域（初始隐藏）
        elements.push({
            id: `${pollId}-results`,
            type: 'shape',
            content: null,
            style: {
                x: 0,
                y: 60 + pollOptions.length * (optionHeight + optionGap) + 20,
                width: width,
                height: 200,
                fill: '#f4f4f5',
                stroke: '#e4e4e7',
                strokeWidth: 1,
                borderRadius: 8
            },
            isCompositeChild: true,
            compositeParent: pollId,
            compositeType: 'poll',
            visible: false
        });
        
        return {
            pollId,
            compositeType: 'poll',
            elements,
            metadata: {
                title,
                options: pollOptions,
                votes: pollOptions.map(() => 0),
                totalVotes: 0,
                style,
                allowMultiple: false,
                showResults: 'afterVote' // always, afterVote, never
            }
        };
    },
    
    /**
     * 获取投票选项颜色
     */
    getPollOptionColor(index) {
        const colors = [
            '#3b82f6', // blue
            '#ef4444', // red
            '#22c55e', // green
            '#f59e0b', // amber
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#84cc16'  // lime
        ];
        return colors[index % colors.length];
    },
    
    /**
     * 处理投票点击
     */
    handlePollVote(pollId, optionIndex, store) {
        const state = store.getState();
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        if (!slide) return;
        
        // 找到投票组件的所有元素
        const pollElements = slide.elements.filter(e => e.compositeParent === pollId);
        if (pollElements.length === 0) return;
        
        // 更新投票数
        const optionElement = pollElements.find(e => e.pollOptionIndex === optionIndex);
        if (optionElement) {
            optionElement.pollVotes = (optionElement.pollVotes || 0) + 1;
            store.notify();
        }
    },
    
    // ==================== 随机名单组件 ====================
    
    /**
     * 创建随机名单组件
     * @param {Object} options - 配置选项
     * @returns {Object} 随机名单组件数据
     */
    createRandomPicker(options = {}) {
        const {
            title = '随机抽取',
            names = ['张三', '李四', '王五'],
            x = 100,
            y = 100,
            width = 400,
            style = 'spin' // spin, card, slot
        } = options;
        
        const pickerId = `picker-${Date.now()}`;
        const elements = [];
        
        // 创建标题
        elements.push({
            id: `${pickerId}-title`,
            type: 'textbox',
            content: title,
            style: {
                x: 0,
                y: 0,
                width: width,
                height: 50,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#333333',
                textAlign: 'center'
            },
            isCompositeChild: true,
            compositeParent: pickerId,
            compositeType: 'randomPicker'
        });
        
        // 创建显示区域
        elements.push({
            id: `${pickerId}-display`,
            type: 'textbox',
            content: '点击按钮开始',
            style: {
                x: 0,
                y: 70,
                width: width,
                height: 100,
                fontSize: 36,
                fontWeight: 'bold',
                color: '#3b82f6',
                textAlign: 'center',
                backgroundColor: '#eff6ff',
                borderRadius: 12
            },
            isCompositeChild: true,
            compositeParent: pickerId,
            compositeType: 'randomPicker'
        });
        
        // 创建抽取按钮
        elements.push({
            id: `${pickerId}-button`,
            type: 'button',
            content: '🎲 随机抽取',
            style: {
                x: width / 2 - 100,
                y: 190,
                width: 200,
                height: 50,
                fontSize: 18,
                fontWeight: 'bold',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                borderRadius: 25
            },
            isCompositeChild: true,
            compositeParent: pickerId,
            compositeType: 'randomPicker'
        });
        
        // 创建重置按钮
        elements.push({
            id: `${pickerId}-reset`,
            type: 'button',
            content: '🔄 重置',
            style: {
                x: width / 2 - 60,
                y: 250,
                width: 120,
                height: 40,
                fontSize: 14,
                backgroundColor: '#e4e4e7',
                color: '#52525b',
                borderRadius: 20
            },
            isCompositeChild: true,
            compositeParent: pickerId,
            compositeType: 'randomPicker'
        });
        
        return {
            pickerId,
            compositeType: 'randomPicker',
            elements,
            metadata: {
                title,
                names: names,
                pickedHistory: [],
                allowRepeat: false,
                animationStyle: style,
                animationDuration: 2
            }
        };
    },
    
    /**
     * 执行随机抽取
     */
    performRandomPick(pickerId, store, callback) {
        const state = store.getState();
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        if (!slide) return;
        
        // 找到随机名单组件的元数据
        const pickerElement = slide.elements.find(e => e.compositeParent === pickerId && e.id.includes('-title'));
        if (!pickerElement) return;
        
        // 获取名单
        const names = pickerElement.metadata?.names || [];
        if (names.length === 0) return;
        
        // 动画效果
        const displayElement = slide.elements.find(e => e.id === `${pickerId}-display`);
        if (!displayElement) return;
        
        let currentIndex = 0;
        const duration = 2000; // 2秒
        const interval = 50; // 50ms
        const steps = duration / interval;
        let step = 0;
        
        const animate = () => {
            if (step < steps) {
                // 随机显示名字
                currentIndex = Math.floor(Math.random() * names.length);
                displayElement.content = names[currentIndex];
                store.notify();
                step++;
                setTimeout(animate, interval);
            } else {
                // 最终结果
                const finalIndex = Math.floor(Math.random() * names.length);
                displayElement.content = names[finalIndex];
                displayElement.style.color = '#22c55e';
                store.notify();
                
                if (callback) callback(names[finalIndex]);
            }
        };
        
        animate();
    },
    
    // ==================== 组合控件管理 ====================
    
    /**
     * 检查元素是否为组合控件的子元素
     */
    isCompositeChild(element) {
        return element && element.isCompositeChild === true;
    },
    
    /**
     * 获取组合控件的所有子元素
     */
    getCompositeChildren(slide, parentId) {
        if (!slide || !slide.elements) return [];
        return slide.elements.filter(e => e.compositeParent === parentId);
    },
    
    /**
     * 删除组合控件（删除所有子元素）
     */
    deleteComposite(slide, parentId, store) {
        if (!slide || !slide.elements) return false;
        
        const children = this.getCompositeChildren(slide, parentId);
        if (children.length === 0) return false;
        
        // 删除所有子元素
        slide.elements = slide.elements.filter(e => e.compositeParent !== parentId);
        store.notify();
        
        return true;
    },
    
    /**
     * 释放组合控件（解除绑定）
     */
    releaseComposite(slide, parentId) {
        if (!slide || !slide.elements) return false;
        
        const children = this.getCompositeChildren(slide, parentId);
        if (children.length === 0) return false;
        
        // 移除组合控件标记
        children.forEach(child => {
            delete child.isCompositeChild;
            delete child.compositeParent;
            delete child.compositeType;
        });
        
        return true;
    },
    
    /**
     * 显示删除确认对话框
     */
    showDeleteConfirm(compositeType, onConfirm, onCancel) {
        const typeNames = {
            poll: '投票组件',
            randomPicker: '随机名单组件'
        };
        
        const typeName = typeNames[compositeType] || '组合控件';
        
        const modal = document.createElement('div');
        modal.className = 'composite-delete-modal';
        modal.innerHTML = `
            <div class="composite-delete-content">
                <div class="composite-delete-icon">⚠️</div>
                <h3>确认删除</h3>
                <p>这是一个${typeName}，删除将移除所有相关元素。</p>
                <p class="composite-delete-warning">此操作不可撤销！</p>
                <div class="composite-delete-buttons">
                    <button class="btn btn-secondary" data-action="cancel">取消</button>
                    <button class="btn btn-danger" data-action="confirm">确认删除</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });
    }
};

window.CompositeComponents = CompositeComponents;
