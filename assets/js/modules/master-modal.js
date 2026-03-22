/**
 * 母版编辑器模块
 */

const MasterModal = {
    currentMasterId: null,
    state: null,
    store: null,
    
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        const self = this;
        
        // 关闭按钮
        document.querySelectorAll('[data-close="master-modal"]').forEach(btn => {
            btn.addEventListener('click', () => self.close());
        });
        
        // 新建母版
        document.getElementById('btn-add-master')?.addEventListener('click', () => {
            self.addNewMaster();
        });
        
        // 删除母版
        document.getElementById('btn-delete-master')?.addEventListener('click', () => {
            self.deleteCurrentMaster();
        });
        
        // 保存母版
        document.getElementById('btn-save-master')?.addEventListener('click', () => {
            self.saveCurrentMaster();
        });
        
        // 应用母版
        document.getElementById('btn-apply-master')?.addEventListener('click', () => {
            self.applyCurrentMaster();
        });
        
        // 背景颜色选择器
        document.getElementById('master-bg-color')?.addEventListener('input', (e) => {
            document.getElementById('master-bg-color-text').value = e.target.value;
            self.updatePreview();
        });
        
        document.getElementById('master-bg-color-text')?.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                document.getElementById('master-bg-color').value = color;
                self.updatePreview();
            }
        });
        
        // 渐变选择器
        document.getElementById('master-gradient')?.addEventListener('change', () => {
            self.updatePreview();
        });
        
        // 名称输入
        document.getElementById('master-name')?.addEventListener('input', () => {
            // 实时更新预览
        });
    },
    
    open: function(state, store) {
        this.state = state;
        this.store = store;
        
        const modal = document.getElementById('master-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadMasters();
        }
    },
    
    close: function() {
        const modal = document.getElementById('master-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },
    
    loadMasters: function() {
        const masters = this.store.getSlideMasters ? this.store.getSlideMasters() : {};
        const container = document.getElementById('master-items');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(masters).forEach(master => {
            const item = document.createElement('div');
            item.className = 'master-item' + (master.id === this.currentMasterId ? ' active' : '');
            item.dataset.masterId = master.id;
            
            item.innerHTML = `
                <div class="master-item-preview" style="background: ${master.backgroundColor || '#ffffff'}"></div>
                <div class="master-item-name">${master.name}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectMaster(master.id);
            });
            
            container.appendChild(item);
        });
        
        // 默认选中第一个
        if (!this.currentMasterId && Object.keys(masters).length > 0) {
            this.selectMaster(Object.keys(masters)[0]);
        }
    },
    
    selectMaster: function(masterId) {
        this.currentMasterId = masterId;
        
        const masters = this.store.getSlideMasters ? this.store.getSlideMasters() : {};
        const master = masters[masterId];
        
        if (!master) return;
        
        // 更新选中状态
        document.querySelectorAll('.master-item').forEach(item => {
            item.classList.toggle('active', item.dataset.masterId === masterId);
        });
        
        // 填充表单
        document.getElementById('master-name').value = master.name || '';
        
        const bgColor = master.backgroundColor || '#ffffff';
        if (bgColor.startsWith('linear-gradient')) {
            document.getElementById('master-bg-color').value = '#ffffff';
            document.getElementById('master-bg-color-text').value = '#ffffff';
            document.getElementById('master-gradient').value = bgColor;
        } else {
            document.getElementById('master-bg-color').value = bgColor;
            document.getElementById('master-bg-color-text').value = bgColor;
            document.getElementById('master-gradient').value = '';
        }
        
        this.updatePreview();
        
        // 禁用删除默认母版
        const deleteBtn = document.getElementById('btn-delete-master');
        if (deleteBtn) {
            deleteBtn.disabled = masterId === 'default';
            deleteBtn.style.opacity = masterId === 'default' ? '0.5' : '1';
        }
    },
    
    updatePreview: function() {
        const preview = document.getElementById('master-preview');
        const gradient = document.getElementById('master-gradient').value;
        const bgColor = document.getElementById('master-bg-color').value;
        
        if (preview) {
            preview.style.background = gradient || bgColor;
        }
    },
    
    addNewMaster: function() {
        const id = 'master-' + Date.now();
        const newMaster = {
            id: id,
            name: '新母版',
            backgroundColor: '#ffffff',
            elements: []
        };
        
        if (this.store.addSlideMaster) {
            this.store.addSlideMaster(newMaster);
        }
        
        this.loadMasters();
        this.selectMaster(id);
    },
    
    deleteCurrentMaster: function() {
        if (!this.currentMasterId || this.currentMasterId === 'default') {
            alert('无法删除默认母版');
            return;
        }
        
        if (!confirm('确定要删除此母版吗？')) {
            return;
        }
        
        if (this.store.deleteSlideMaster) {
            this.store.deleteSlideMaster(this.currentMasterId);
        }
        
        this.currentMasterId = 'default';
        this.loadMasters();
    },
    
    saveCurrentMaster: function() {
        if (!this.currentMasterId) return;
        
        const name = document.getElementById('master-name').value || '未命名母版';
        const gradient = document.getElementById('master-gradient').value;
        const bgColor = document.getElementById('master-bg-color').value;
        
        const master = {
            id: this.currentMasterId,
            name: name,
            backgroundColor: gradient || bgColor,
            elements: []
        };
        
        if (this.store.updateSlideMaster) {
            this.store.updateSlideMaster(this.currentMasterId, master);
        }
        
        this.loadMasters();
        alert('母版已保存');
    },
    
    applyCurrentMaster: function() {
        if (!this.currentMasterId || !this.state.activeSlideId) return;
        
        if (this.store.applyMasterToSlide) {
            this.store.applyMasterToSlide(this.state.activeSlideId, this.currentMasterId);
        }
        
        this.close();
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    MasterModal.init();
});

// 暴露到全局
window.MasterModal = MasterModal;
