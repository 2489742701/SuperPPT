const PropertyPanel = {
    render(state, store) {
        const t = getTranslation(state.language);
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        const element = slide?.elements.find(e => e.id === state.activeElementId);
        
        let html;
        if (state.selectedElementIds && state.selectedElementIds.length > 1) {
            html = this.renderMultiSelectProperties(state, store, t);
        } else if (element) {
            html = this.renderElementProperties(element, state, store, t);
        } else {
            html = this.renderSlideProperties(slide, state, store, t);
        }
        
        const topContent = document.getElementById('property-panel-top-content');
        const rightContent = document.getElementById('property-panel-content');
        
        if (topContent) topContent.innerHTML = html;
        if (rightContent) rightContent.innerHTML = html;
        
        this.bindEvents(store, state);
    },
    
    /**
     * 渲染多选属性面板
     * 显示对齐、分布等工具
     */
    renderMultiSelectProperties(state, store, t) {
        const count = state.selectedElementIds?.length || 0;
        return `
            <div class="property-section">
                <div class="property-section-title">多选 (${count} 个元素)</div>
                <div class="property-row" style="justify-content: center; gap: 8px;">
                    <button class="align-btn" data-align="left" title="左对齐">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="3" x2="3" y2="21"/><rect x="7" y="5" width="14" height="4"/><rect x="7" y="11" width="10" height="4"/><rect x="7" y="17" width="6" height="4"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-align="center" title="水平居中">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="3" x2="12" y2="21"/><rect x="6" y="5" width="12" height="4"/><rect x="8" y="11" width="8" height="4"/><rect x="5" y="17" width="14" height="4"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-align="right" title="右对齐">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="21" y1="3" x2="21" y2="21"/><rect x="3" y="5" width="14" height="4"/><rect x="7" y="11" width="10" height="4"/><rect x="11" y="17" width="6" height="4"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-align="top" title="顶部对齐">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="3" x2="21" y2="3"/><rect x="5" y="7" width="4" height="14"/><rect x="11" y="7" width="4" height="10"/><rect x="17" y="7" width="4" height="6"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-align="middle" title="垂直居中">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"/><rect x="5" y="6" width="4" height="12"/><rect x="11" y="8" width="4" height="8"/><rect x="17" y="4" width="4" height="16"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-align="bottom" title="底部对齐">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="3" width="4" height="14"/><rect x="11" y="7" width="4" height="10"/><rect x="17" y="11" width="4" height="6"/>
                        </svg>
                    </button>
                </div>
                <div class="property-row" style="justify-content: center; gap: 8px; margin-top: 8px;">
                    <button class="align-btn" data-distribute="horizontal" title="水平均匀分布">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="8" width="4" height="8"/><rect x="10" y="8" width="4" height="8"/><rect x="17" y="8" width="4" height="8"/>
                        </svg>
                    </button>
                    <button class="align-btn" data-distribute="vertical" title="垂直均匀分布">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="8" y="3" width="8" height="4"/><rect x="8" y="10" width="8" height="4"/><rect x="8" y="17" width="8" height="4"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="property-section">
                <div class="property-section-title">操作</div>
                <div class="property-row">
                    <button class="property-btn" data-action="group-elements">组合</button>
                    <button class="property-btn" data-action="ungroup-elements">取消组合</button>
                </div>
            </div>
        `;
    },

    renderSlideProperties(slide, state, store, t) {
        const masters = store.getSlideMasters ? store.getSlideMasters() : {};
        const currentMasterId = slide?.masterId || 'default';
        
        let masterOptions = '';
        Object.values(masters).forEach(master => {
            const selected = master.id === currentMasterId ? 'selected' : '';
            masterOptions += `<option value="${master.id}" ${selected}>${master.name}</option>`;
        });
        
        return `
            <div class="property-section">
                <div class="property-section-title">${t.panels.settings}</div>
                <div class="property-row">
                    <span class="property-label">${t.properties.advanceMode}</span>
                    <select class="property-input" data-setting="advanceMode" style="width:120px">
                        <option value="click" ${state.presentation.settings.advanceMode === 'click' ? 'selected' : ''}>${t.properties.clickAnywhere}</option>
                        <option value="button" ${state.presentation.settings.advanceMode === 'button' ? 'selected' : ''}>${t.properties.buttonOnly}</option>
                    </select>
                </div>
                <div class="property-row">
                    <span class="property-label">${t.properties.smartGuides}</span>
                    <input type="checkbox" class="property-checkbox" data-setting="smartGuidesEnabled" ${state.presentation.settings.smartGuidesEnabled ? 'checked' : ''}>
                </div>
            </div>
            <div class="property-section">
                <div class="property-section-title">幻灯片母版</div>
                <div class="property-row">
                    <span class="property-label">应用母版</span>
                    <select class="property-input" id="slide-master-select" style="width:120px">
                        ${masterOptions}
                    </select>
                </div>
                <div class="property-row" style="margin-top:8px;">
                    <button class="property-btn" id="btn-edit-master" style="flex:1;">编辑母版</button>
                </div>
            </div>
            <div class="property-section">
                <div class="property-section-title">${t.panels.layers}</div>
                <div class="selection-pane">
                    ${slide ? slide.elements.slice().reverse().map(el => `
                        <div class="layer-item ${el.id === state.activeElementId ? 'active' : ''}" data-element-id="${el.id}">
                            <span class="layer-item-name">${el.type}${el.content ? ' - ' + el.content.substring(0, 20) : ''}</span>
                            <span class="layer-item-delete" data-delete-id="${el.id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </span>
                        </div>
                    `).join('') : `<div style="font-size:12px;color:#71717a;font-style:italic">${t.properties.noElements}</div>`}
                </div>
            </div>
        `;
    },

    renderElementProperties(element, state, store, t) {
        let html = '';
        
        html += `
            <div class="property-section">
                <div class="property-section-title">${t.properties.transform}</div>
                <div class="property-grid">
                    <div class="property-row">
                        <span class="property-label">${t.properties.x}</span>
                        <input type="number" class="property-input" data-prop="x" value="${Math.round(element.style.x)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.y}</span>
                        <input type="number" class="property-input" data-prop="y" value="${Math.round(element.style.y)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.width}</span>
                        <input type="number" class="property-input" data-prop="width" value="${Math.round(element.style.width)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.height}</span>
                        <input type="number" class="property-input" data-prop="height" value="${Math.round(element.style.height)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.angle}</span>
                        <input type="number" class="property-input" data-prop="angle" value="${Math.round(element.style.angle || 0)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.opacity}</span>
                        <input type="number" class="property-input" data-prop="opacity" step="0.1" min="0" max="1" value="${element.style.opacity ?? 1}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.skewX}</span>
                        <input type="number" class="property-input" data-prop="skewX" value="${Math.round(element.style.skewX || 0)}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.skewY}</span>
                        <input type="number" class="property-input" data-prop="skewY" value="${Math.round(element.style.skewY || 0)}">
                    </div>
                </div>
            </div>
        `;

        if (element.type === 'textbox' || element.type === 'button') {
            html += `
                <div class="property-section">
                    <div class="property-section-title">${t.properties.appearance}</div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.fontSize}</span>
                        <input type="number" class="property-input" data-prop="fontSize" value="${element.style.fontSize || 16}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.lineHeight}</span>
                        <input type="number" class="property-input" data-prop="lineHeight" step="0.1" value="${element.style.lineHeight || 1.2}">
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.style}</span>
                        <div class="property-input-group">
                            <button class="property-btn ${element.style.fontWeight === 'bold' ? 'active' : ''}" data-prop="fontWeight" data-value="bold" title="${t.properties.bold}">B</button>
                            <button class="property-btn ${element.style.fontStyle === 'italic' ? 'active' : ''}" data-prop="fontStyle" data-value="italic" style="font-style:italic" title="${t.properties.italic}">I</button>
                            <button class="property-btn ${element.style.textDecoration === 'underline' ? 'active' : ''}" data-prop="textDecoration" data-value="underline" style="text-decoration:underline" title="${t.properties.underline}">U</button>
                        </div>
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.align}</span>
                        <div class="property-input-group">
                            <button class="property-btn ${element.style.textAlign === 'left' || !element.style.textAlign ? 'active' : ''}" data-prop="textAlign" data-value="left" title="${t.properties.left}">L</button>
                            <button class="property-btn ${element.style.textAlign === 'center' ? 'active' : ''}" data-prop="textAlign" data-value="center" title="${t.properties.center}">C</button>
                            <button class="property-btn ${element.style.textAlign === 'right' ? 'active' : ''}" data-prop="textAlign" data-value="right" title="${t.properties.right}">R</button>
                        </div>
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.color}</span>
                        <div class="property-input-group">
                            <input type="color" class="property-input" data-prop="color" value="${element.style.color || '#000000'}">
                            <input type="text" class="property-input" style="width:60px" data-prop="colorText" value="${element.style.color || '#000000'}">
                        </div>
                    </div>
                    ${element.type === 'textbox' ? `
                    <div class="property-section">
                        <div class="property-section-title">文本模式</div>
                        <div class="property-row">
                            <label class="property-radio-label">
                                <input type="radio" name="textMode" value="auto" ${element.textMode !== 'fixed' ? 'checked' : ''}>
                                <span>纯文本模式</span>
                            </label>
                        </div>
                        <div class="property-row" style="font-size:11px;color:#71717a;margin-top:-8px;margin-bottom:8px;">
                            文字随内容自动调整大小，可自由缩放拉伸
                        </div>
                        <div class="property-row">
                            <label class="property-radio-label">
                                <input type="radio" name="textMode" value="fixed" ${element.textMode === 'fixed' ? 'checked' : ''}>
                                <span>文本框模式</span>
                            </label>
                        </div>
                        <div class="property-row" style="font-size:11px;color:#71717a;margin-top:-8px;">
                            固定宽高，文字自动换行，拖动调整框体大小
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        if (element.type === 'shape' || element.type === 'button' || (element.type === 'textbox' && element.textMode === 'fixed')) {
            html += `
                <div class="property-section">
                    <div class="property-section-title">${element.type === 'textbox' ? t.properties.backgroundColor : t.properties.appearance}</div>
                    <div class="property-row">
                        <span class="property-label">${element.type === 'textbox' ? t.properties.backgroundColor : t.properties.fill}</span>
                        <div class="property-input-group">
                            <input type="color" class="property-input" data-prop="${element.type === 'textbox' ? 'backgroundColor' : 'fill'}" value="${element.style.backgroundColor || element.style.fill || '#007acc'}">
                            <input type="text" class="property-input" style="width:60px" data-prop="${element.type === 'textbox' ? 'backgroundColorText' : 'fillText'}" value="${element.style.backgroundColor || element.style.fill || '#007acc'}">
                        </div>
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.stroke}</span>
                        <div class="property-input-group">
                            <input type="color" class="property-input" data-prop="stroke" value="${element.style.stroke || '#000000'}">
                            <input type="text" class="property-input" style="width:60px" data-prop="strokeText" value="${element.style.stroke || '#000000'}">
                        </div>
                    </div>
                    <div class="property-row">
                        <span class="property-label">${t.properties.strokeWidth}</span>
                        <input type="number" class="property-input" data-prop="strokeWidth" min="0" value="${element.style.strokeWidth || 0}">
                    </div>
                </div>
            `;
        }

        html += `
            <div class="property-section">
                <div class="property-section-title">${t.properties.link}</div>
                <button class="property-btn full-width" id="btn-open-link-modal" style="width:100%;justify-content:center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    ${element.style.link ? t.properties.editLink : t.properties.addLink}
                </button>
            </div>
        `;

        html += `
            <div class="property-section">
                <div class="property-section-title">${t.panels.animations}</div>
                <div class="property-row">
                    <span class="property-label">${t.animations.type}</span>
                    <select class="property-input" data-anim="type" style="width:100px">
                        <option value="none" ${element.animation?.type === 'none' ? 'selected' : ''}>${t.animations.none}</option>
                        <option value="fadeIn" ${element.animation?.type === 'fadeIn' ? 'selected' : ''}>${t.animations.fadeIn}</option>
                        <option value="slideInLeft" ${element.animation?.type === 'slideInLeft' ? 'selected' : ''}>${t.animations.slideInLeft}</option>
                        <option value="slideInRight" ${element.animation?.type === 'slideInRight' ? 'selected' : ''}>${t.animations.slideInRight}</option>
                        <option value="slideInUp" ${element.animation?.type === 'slideInUp' ? 'selected' : ''}>${t.animations.slideInUp}</option>
                        <option value="slideInDown" ${element.animation?.type === 'slideInDown' ? 'selected' : ''}>${t.animations.slideInDown}</option>
                        <option value="scaleIn" ${element.animation?.type === 'scaleIn' ? 'selected' : ''}>${t.animations.scaleIn}</option>
                    </select>
                </div>
                ${element.animation?.type !== 'none' ? `
                <div class="property-row">
                    <span class="property-label">${t.animations.duration}</span>
                    <input type="number" class="property-input" data-anim="duration" step="0.1" min="0.1" value="${element.animation?.duration || 0.5}">
                </div>
                <div class="property-row">
                    <span class="property-label">${t.animations.delay}</span>
                    <input type="number" class="property-input" data-anim="delay" step="0.1" min="0" value="${element.animation?.delay || 0}">
                </div>
                ` : ''}
            </div>
        `;
        
        if (element.type === 'image' || element.type === 'shape' || element.type === 'icon') {
            const hasPath = element.pathAnimation && element.pathAnimation.path && element.pathAnimation.path.length >= 2;
            html += `
                <div class="property-section">
                    <div class="property-section-title">路径动画</div>
                    <div class="property-row" style="font-size:11px;color:#71717a;margin-bottom:8px;">
                        让元素沿自定义路径移动。点击"绘制路径"后在画布上点击添加路径点。
                    </div>
                    <button class="property-btn full-width" id="btn-draw-path" style="width:100%;justify-content:center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                        </svg>
                        ${hasPath ? '编辑路径' : '绘制路径'}
                    </button>
                    ${hasPath ? `
                    <div class="property-row" style="margin-top:8px;">
                        <span class="property-label">动画时长</span>
                        <input type="number" class="property-input" data-path="duration" step="0.5" min="0.5" value="${element.pathAnimation?.duration || 3}" style="width:60px">
                        <span style="font-size:11px;color:#71717a;margin-left:4px;">秒</span>
                    </div>
                    <button class="property-btn full-width danger" id="btn-clear-path" style="width:100%;justify-content:center;margin-top:8px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        清除路径
                    </button>
                    ` : ''}
                </div>
            `;
        }

        html += `
            <div class="property-section">
                <div class="property-section-title">${t.panels.layers}</div>
                <div class="layer-buttons">
                    <button class="layer-btn" data-action="top" title="${t.properties.bringToFront}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                    </button>
                    <button class="layer-btn" data-action="up" title="${t.properties.bringForward}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button class="layer-btn" data-action="down" title="${t.properties.sendBackward}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button class="layer-btn" data-action="bottom" title="${t.properties.sendToBack}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
                    </button>
                </div>
            </div>
        `;

        return html;
    },

    bindEvents(store, state) {
        document.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', (e) => this.handlePropertyChange(e, store, state));
        });
        
        document.querySelectorAll('input[name="textMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const newTextMode = e.target.value;
                store.updateElement(state.activeSlideId, state.activeElementId, { textMode: newTextMode });
            });
        });
        
        document.getElementById('btn-draw-path')?.addEventListener('click', () => {
            if (window.PathAnimation) {
                PathAnimation.toggleDrawingMode();
            }
        });
        
        document.getElementById('btn-clear-path')?.addEventListener('click', () => {
            if (window.PathAnimation) {
                PathAnimation.clearElementPath(state.activeElementId);
            }
        });
        
        document.querySelectorAll('[data-path]').forEach(input => {
            input.addEventListener('change', (e) => {
                const prop = e.target.dataset.path;
                const value = parseFloat(e.target.value);
                
                const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                const element = slide?.elements.find(el => el.id === state.activeElementId);
                
                if (element && element.pathAnimation) {
                    store.updateElement(state.activeSlideId, state.activeElementId, {
                        pathAnimation: {
                            ...element.pathAnimation,
                            [prop]: value
                        }
                    });
                }
            });
        });
        
        document.querySelectorAll('.property-checkbox').forEach(input => {
            input.addEventListener('change', (e) => {
                store.updateSettings({ [e.target.dataset.setting]: e.target.checked });
            });
        });
        
        document.querySelectorAll('select[data-setting]').forEach(select => {
            select.addEventListener('change', (e) => {
                store.updateSettings({ [e.target.dataset.setting]: e.target.value });
            });
        });
        
        document.querySelectorAll('.property-btn:not(.full-width)').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleStyleToggle(e, store, state));
        });
        
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLayerChange(e, store, state));
        });
        
        document.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-item-delete')) {
                    store.selectElement(item.dataset.elementId);
                }
            });
        });
        
        document.querySelectorAll('.layer-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                store.deleteElement(state.activeSlideId, btn.dataset.deleteId);
            });
        });

        const linkBtn = document.getElementById('btn-open-link-modal');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
                const element = slide?.elements.find(e => e.id === state.activeElementId);
                if (element && window.LinkModal) {
                    window.LinkModal.open(element.style.link || '', (value) => {
                        store.updateElement(state.activeSlideId, state.activeElementId, { style: { link: value } });
                    });
                }
            });
        }
        
        // 多选对齐按钮事件
        document.querySelectorAll('.align-btn[data-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                const alignType = btn.dataset.align;
                const selectedIds = state.selectedElementIds || [];
                if (selectedIds.length > 1) {
                    store.alignElements(state.activeSlideId, selectedIds, alignType);
                }
            });
        });
        
        // 分布按钮事件
        document.querySelectorAll('.align-btn[data-distribute]').forEach(btn => {
            btn.addEventListener('click', () => {
                const distributeType = btn.dataset.distribute;
                const selectedIds = state.selectedElementIds || [];
                if (selectedIds.length > 2) {
                    store.distributeElements(state.activeSlideId, selectedIds, distributeType);
                }
            });
        });
        
        // 母版选择器事件
        const masterSelect = document.getElementById('slide-master-select');
        if (masterSelect) {
            masterSelect.addEventListener('change', (e) => {
                if (state.activeSlideId && store.applyMasterToSlide) {
                    store.applyMasterToSlide(state.activeSlideId, e.target.value);
                }
            });
        }
        
        // 编辑母版按钮
        const editMasterBtn = document.getElementById('btn-edit-master');
        if (editMasterBtn) {
            editMasterBtn.addEventListener('click', () => {
                if (window.MasterModal) {
                    window.MasterModal.open(state, store);
                } else {
                    alert('母版编辑功能即将推出！');
                }
            });
        }
    },

    handlePropertyChange(e, store, state) {
        const prop = e.target.dataset.prop;
        const anim = e.target.dataset.anim;
        let value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        
        if (prop) {
            if (prop.endsWith('Text')) {
                const realProp = prop.replace('Text', '');
                const colorInput = document.querySelector(`[data-prop="${realProp}"]`);
                if (colorInput) colorInput.value = value;
                store.updateElement(state.activeSlideId, state.activeElementId, { style: { [realProp]: value } });
            } else {
                store.updateElement(state.activeSlideId, state.activeElementId, { style: { [prop]: value } });
            }
        } else if (anim) {
            const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
            const element = slide?.elements.find(el => el.id === state.activeElementId);
            if (element) {
                store.updateElement(state.activeSlideId, state.activeElementId, { 
                    animation: { ...element.animation, [anim]: value } 
                });
            }
        }
    },

    handleStyleToggle(e, store, state) {
        const slide = state.presentation.slides.find(s => s.id === state.activeSlideId);
        const element = slide?.elements.find(el => el.id === state.activeElementId);
        if (!element) return;
        
        const prop = e.target.dataset.prop;
        const value = e.target.dataset.value;
        const currentValue = element.style[prop];
        const newValue = currentValue === value 
            ? (prop === 'fontWeight' ? 'normal' : prop === 'fontStyle' ? 'normal' : 'none') 
            : value;
        
        store.updateElement(state.activeSlideId, state.activeElementId, { style: { [prop]: newValue } });
    },

    handleLayerChange(e, store, state) {
        const action = e.currentTarget.dataset.action;
        const directionMap = { top: 'top', up: 'up', down: 'down', bottom: 'bottom' };
        store.reorderElement(state.activeSlideId, state.activeElementId, directionMap[action]);
    }
};

window.PropertyPanel = PropertyPanel;
