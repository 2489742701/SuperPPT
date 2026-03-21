/**
 * Property Panel Component
 * 
 * This component displays and allows editing of properties for the currently
 * selected element or the active slide. It provides controls for layout (x, y, width, height),
 * appearance (colors, fonts, borders), animations, and layer ordering.
 */
import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { useTranslation } from '../i18n';
import { Trash2, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Settings, X, Link as LinkIcon } from 'lucide-react';

const LinkModal = ({ isOpen, onClose, link, onChange }: { isOpen: boolean, onClose: () => void, link: string, onChange: (val: string) => void }) => {
  const { presentation } = useEditorStore();
  const [linkType, setLinkType] = useState<'url' | 'slide'>('url');
  const [urlValue, setUrlValue] = useState(link || '');
  const [slideValue, setSlideValue] = useState(presentation.slides[0]?.id || '');

  // Initialize state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (link.startsWith('slide://')) {
        setLinkType('slide');
        setSlideValue(link.replace('slide://', ''));
      } else {
        setLinkType('url');
        setUrlValue(link);
      }
    }
  }, [isOpen, link]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (linkType === 'url') {
      onChange(urlValue);
    } else {
      onChange(`slide://${slideValue}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h3 className="font-bold text-lg mb-4 text-zinc-800">Set Link</h3>
        
        <div className="flex gap-4 mb-4 border-b border-zinc-200 pb-2">
          <button 
            className={`text-sm font-medium px-2 py-1 ${linkType === 'url' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
            onClick={() => setLinkType('url')}
          >
            Website / Media
          </button>
          <button 
            className={`text-sm font-medium px-2 py-1 ${linkType === 'slide' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
            onClick={() => setLinkType('slide')}
          >
            Slide
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {linkType === 'url' ? (
            <>
              <label className="text-sm font-medium text-zinc-600">URL</label>
              <input 
                type="text" 
                value={urlValue} 
                onChange={(e) => setUrlValue(e.target.value)} 
                className="border border-zinc-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500 mt-1">Enter a website URL or media link.</p>
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-zinc-600">Select Slide</label>
              <select 
                value={slideValue} 
                onChange={(e) => setSlideValue(e.target.value)}
                className="border border-zinc-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {presentation.slides.map((slide, index) => (
                  <option key={slide.id} value={slide.id}>
                    Slide {index + 1}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">Navigate to another slide in this presentation.</p>
            </>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded font-medium transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
};

export function PropertyPanel({ layout = 'vertical' }: { layout?: 'horizontal' | 'vertical' }) {
  const { presentation, activeSlideId, activeElementId, updateElement, deleteElement, reorderElement, language, updateSettings, setPropertyPanelPosition } = useEditorStore();
  const t = useTranslation(language);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const activeSlide = presentation.slides.find((s) => s.id === activeSlideId);
  const activeElement = activeSlide?.elements.find((e) => e.id === activeElementId);

  const isHorizontal = layout === 'horizontal';

  const InputRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className={`flex ${isHorizontal ? 'flex-col items-start gap-1' : 'items-center justify-between gap-2'} mb-2`}>
      <label className="text-xs font-medium text-zinc-500 truncate" title={label}>{label}</label>
      <div className={isHorizontal ? 'w-full' : 'w-2/3'}>{children}</div>
    </div>
  );

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className={`${isHorizontal ? 'min-w-[200px] border-r border-zinc-200 pr-4 mr-4' : ''}`}>
      <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-3">{title}</div>
      <div className={isHorizontal ? 'flex gap-4' : ''}>
        {children}
      </div>
    </div>
  );

  if (!activeElement) {
    return (
      <div className={`${isHorizontal ? 'h-48 border-b w-full flex-row' : 'w-72 border-l flex-col h-full'} border-zinc-200 bg-white flex overflow-y-auto overflow-x-auto z-10`}>
        <div className={`p-4 ${isHorizontal ? 'border-r' : 'border-b'} border-zinc-200 flex justify-between items-center bg-zinc-50 sticky top-0 z-10 min-w-[150px]`}>
          <h2 className="font-semibold text-sm text-zinc-700 uppercase tracking-wider flex items-center gap-2">
            <Settings size={16} />
            {t.toolbar.tools}
          </h2>
          <button
            onClick={() => setPropertyPanelPosition('hidden')}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`p-4 flex ${isHorizontal ? 'flex-row gap-8' : 'flex-col gap-6'}`}>
          <Section title="Presentation Settings">
            <div className={isHorizontal ? 'flex gap-4' : ''}>
              <InputRow label={t.properties.advanceMode}>
                <select 
                  value={presentation.settings.advanceMode} 
                  onChange={(e) => updateSettings({ advanceMode: e.target.value as 'click' | 'button' })}
                  className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none"
                >
                  <option value="click">{t.properties.clickAnywhere}</option>
                  <option value="button">{t.properties.buttonOnly}</option>
                </select>
              </InputRow>
              <div className="flex items-center justify-between gap-2 mb-2 mt-2">
                <label className="text-xs font-medium text-zinc-500 truncate">{t.properties.smartGuides}</label>
                <input 
                  type="checkbox" 
                  checked={presentation.settings.smartGuidesEnabled}
                  onChange={(e) => updateSettings({ smartGuidesEnabled: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
            </div>
          </Section>
          
          {activeSlide && (
            <Section title="Selection Pane (Layers)">
              <div className={`flex flex-col gap-1 overflow-y-auto pr-1 ${isHorizontal ? 'max-h-32 w-64' : 'max-h-48'}`}>
                {activeSlide.elements.slice().reverse().map((el, i) => (
                  <div 
                    key={el.id} 
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer ${activeElementId === el.id ? 'bg-blue-50 border-blue-200' : 'border-zinc-200 hover:bg-zinc-50'}`}
                    onClick={() => useEditorStore.getState().selectElement(el.id)}
                  >
                    <span className="text-sm truncate w-3/4">{el.type} {el.content ? `- ${el.content}` : ''}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteElement(activeSlideId, el.id); }}
                      className="text-zinc-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {activeSlide.elements.length === 0 && (
                  <div className="text-sm text-zinc-500 italic">{t.properties.noElements}</div>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    if (!activeSlideId || !activeElementId) return;
    
    if (field === 'content') {
      updateElement(activeSlideId, activeElementId, { content: value });
    } else if (field === 'textMode') {
      updateElement(activeSlideId, activeElementId, { textMode: value });
    } else if (field.startsWith('anim_')) {
      const animField = field.replace('anim_', '');
      updateElement(activeSlideId, activeElementId, {
        animation: { ...activeElement.animation, [animField]: value } as any,
      });
    } else {
      updateElement(activeSlideId, activeElementId, {
        style: { ...activeElement.style, [field]: value },
      });
    }
  };

  const handleDelete = () => {
    if (!activeSlideId || !activeElementId) return;
    deleteElement(activeSlideId, activeElementId);
  };

  const handleReorder = (direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!activeSlideId || !activeElementId) return;
    reorderElement(activeSlideId, activeElementId, direction);
  };

  return (
    <div className={`${isHorizontal ? 'h-48 border-b w-full flex-row' : 'w-72 border-l flex-col h-full'} border-zinc-200 bg-white flex overflow-y-auto overflow-x-auto z-10`}>
      <div className={`p-4 ${isHorizontal ? 'border-r' : 'border-b'} border-zinc-200 flex justify-between items-center bg-zinc-50 sticky top-0 z-10 min-w-[150px]`}>
        <h2 className="font-semibold text-sm text-zinc-700 uppercase tracking-wider">{t.panels.properties}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1 text-zinc-400 hover:text-red-500 hover:bg-zinc-200 rounded transition-colors"
            title={t.properties.delete}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setPropertyPanelPosition('hidden')}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className={`p-4 flex ${isHorizontal ? 'flex-row gap-8' : 'flex-col gap-6'}`}>
        {/* Appearance Section */}
        <Section title={t.properties.appearance}>
          <div className={isHorizontal ? 'flex gap-4' : ''}>
            {(activeElement.type === 'textbox' || activeElement.type === 'button') && (
              <div className={isHorizontal ? 'flex flex-col gap-2' : ''}>
                <div className={isHorizontal ? 'flex gap-2' : ''}>
                  <InputRow label={t.properties.fontSize}>
                    <input type="number" value={activeElement.style.fontSize || 16} onChange={(e) => handleChange('fontSize', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
                  </InputRow>
                  <InputRow label={t.properties.lineHeight}>
                    <input type="number" step="0.1" value={activeElement.style.lineHeight || 1.2} onChange={(e) => handleChange('lineHeight', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
                  </InputRow>
                </div>
                <div className={isHorizontal ? 'flex gap-2' : ''}>
                  <InputRow label={t.properties.style}>
                    <div className="flex gap-1">
                      <button onClick={() => handleChange('fontWeight', activeElement.style.fontWeight === 'bold' ? 'normal' : 'bold')} className={`p-1.5 rounded border ${activeElement.style.fontWeight === 'bold' ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100`} title={t.properties.bold}>B</button>
                      <button onClick={() => handleChange('fontStyle', activeElement.style.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-1.5 rounded border ${activeElement.style.fontStyle === 'italic' ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100 italic`} title={t.properties.italic}>I</button>
                      <button onClick={() => handleChange('textDecoration', activeElement.style.textDecoration === 'underline' ? 'none' : 'underline')} className={`p-1.5 rounded border ${activeElement.style.textDecoration === 'underline' ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100 underline`} title={t.properties.underline}>U</button>
                    </div>
                  </InputRow>
                  <InputRow label={t.properties.align}>
                    <div className="flex gap-1">
                      <button onClick={() => handleChange('textAlign', 'left')} className={`p-1.5 rounded border ${activeElement.style.textAlign === 'left' || !activeElement.style.textAlign ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100`} title={t.properties.left}>L</button>
                      <button onClick={() => handleChange('textAlign', 'center')} className={`p-1.5 rounded border ${activeElement.style.textAlign === 'center' ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100`} title={t.properties.center}>C</button>
                      <button onClick={() => handleChange('textAlign', 'right')} className={`p-1.5 rounded border ${activeElement.style.textAlign === 'right' ? 'bg-zinc-200 border-zinc-300' : 'bg-white border-zinc-200'} hover:bg-zinc-100`} title={t.properties.right}>R</button>
                    </div>
                  </InputRow>
                </div>
                <div className={isHorizontal ? 'flex gap-2' : ''}>
                  <InputRow label={t.properties.color}>
                    <div className="flex gap-2">
                      <input type="color" value={activeElement.style.color || '#000000'} onChange={(e) => handleChange('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                      <input type="text" value={activeElement.style.color || '#000000'} onChange={(e) => handleChange('color', e.target.value)} className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-zinc-800 outline-none uppercase w-20" />
                    </div>
                  </InputRow>
                  {activeElement.type === 'textbox' && (
                    <InputRow label="Mode">
                      <select 
                        value={activeElement.textMode || 'auto'} 
                        onChange={(e) => handleChange('textMode', e.target.value)}
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none"
                      >
                        <option value="auto">Pure Text</option>
                        <option value="fixed">Text Box</option>
                      </select>
                    </InputRow>
                  )}
                </div>
              </div>
            )}

            <div className={isHorizontal ? 'flex flex-col gap-2' : ''}>
              {(activeElement.type === 'shape' || activeElement.type === 'button' || (activeElement.type === 'textbox' && activeElement.textMode === 'fixed')) && (
                <InputRow label={activeElement.type === 'textbox' ? 'Background' : t.properties.fill}>
                  <div className="flex gap-2">
                    <input type="color" value={activeElement.style.backgroundColor || activeElement.style.fill || '#000000'} onChange={(e) => handleChange(activeElement.type === 'textbox' ? 'backgroundColor' : 'fill', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                    <input type="text" value={activeElement.style.backgroundColor || activeElement.style.fill || '#000000'} onChange={(e) => handleChange(activeElement.type === 'textbox' ? 'backgroundColor' : 'fill', e.target.value)} className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-zinc-800 outline-none uppercase w-20" />
                  </div>
                </InputRow>
              )}

              <InputRow label={t.properties.stroke}>
                <div className="flex gap-2">
                  <input type="color" value={activeElement.style.stroke || '#000000'} onChange={(e) => handleChange('stroke', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                  <input type="text" value={activeElement.style.stroke || '#000000'} onChange={(e) => handleChange('stroke', e.target.value)} className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-zinc-800 outline-none uppercase w-20" />
                </div>
              </InputRow>

              <InputRow label={t.properties.strokeWidth}>
                <input type="number" min="0" value={activeElement.style.strokeWidth || 0} onChange={(e) => handleChange('strokeWidth', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
              </InputRow>

              <InputRow label="Link (URL)">
                <button 
                  onClick={() => setIsLinkModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 border border-zinc-300 rounded px-2 py-1 text-sm hover:bg-zinc-50 transition-colors"
                >
                  <LinkIcon size={14} />
                  {activeElement.style.link ? 'Edit Link' : 'Add Link'}
                </button>
              </InputRow>
            </div>
          </div>
        </Section>

        {/* Animations Section */}
        <Section title={t.panels.animations}>
          <div className={isHorizontal ? 'flex gap-4' : ''}>
            <InputRow label={t.properties.type}>
              <select 
                value={activeElement.animation?.type || 'none'} 
                onChange={(e) => handleChange('anim_type', e.target.value)}
                className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none"
              >
                <option value="none">{t.animations.none}</option>
                <option value="fadeIn">{t.animations.fadeIn}</option>
                <option value="slideInLeft">{t.animations.slideInLeft}</option>
                <option value="slideInRight">{t.animations.slideInRight}</option>
                <option value="slideInUp">{t.animations.slideInUp}</option>
                <option value="slideInDown">{t.animations.slideInDown}</option>
                <option value="scaleIn">{t.animations.scaleIn}</option>
              </select>
            </InputRow>
            {activeElement.animation?.type !== 'none' && (
              <>
                <InputRow label={t.animations.duration}>
                  <input type="number" step="0.1" min="0.1" value={activeElement.animation?.duration || 0.5} onChange={(e) => handleChange('anim_duration', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
                </InputRow>
                <InputRow label={t.animations.delay}>
                  <input type="number" step="0.1" min="0" value={activeElement.animation?.delay || 0} onChange={(e) => handleChange('anim_delay', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
                </InputRow>
              </>
            )}
          </div>
        </Section>

        {/* Layers Section */}
        <Section title={t.panels.layers}>
          <div className={isHorizontal ? 'flex gap-4' : ''}>
            <div className={`grid grid-cols-4 gap-2 ${isHorizontal ? 'w-48' : 'mb-4'}`}>
              <button onClick={() => handleReorder('top')} className="p-2 border border-zinc-300 rounded hover:bg-zinc-100 flex justify-center" title={t.properties.bringToFront}><ArrowUpToLine size={16}/></button>
              <button onClick={() => handleReorder('up')} className="p-2 border border-zinc-300 rounded hover:bg-zinc-100 flex justify-center" title={t.properties.bringForward}><ArrowUp size={16}/></button>
              <button onClick={() => handleReorder('down')} className="p-2 border border-zinc-300 rounded hover:bg-zinc-100 flex justify-center" title={t.properties.sendBackward}><ArrowDown size={16}/></button>
              <button onClick={() => handleReorder('bottom')} className="p-2 border border-zinc-300 rounded hover:bg-zinc-100 flex justify-center" title={t.properties.sendToBack}><ArrowDownToLine size={16}/></button>
            </div>
          </div>
        </Section>

        {/* Transform Section */}
        <Section title={t.properties.transform}>
          <div className={`grid ${isHorizontal ? 'grid-cols-4' : 'grid-cols-2'} gap-x-4 gap-y-1`}>
            <InputRow label={t.properties.x}>
              <input type="number" value={Math.round(activeElement.style.x)} onChange={(e) => handleChange('x', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label={t.properties.y}>
              <input type="number" value={Math.round(activeElement.style.y)} onChange={(e) => handleChange('y', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label={t.properties.width}>
              <input type="number" value={Math.round(activeElement.style.width)} onChange={(e) => handleChange('width', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label={t.properties.height}>
              <input type="number" value={Math.round(activeElement.style.height)} onChange={(e) => handleChange('height', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label={t.properties.angle}>
              <input type="number" value={Math.round(activeElement.style.angle || 0)} onChange={(e) => handleChange('angle', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label={t.properties.opacity}>
              <input type="number" step="0.1" min="0" max="1" value={activeElement.style.opacity ?? 1} onChange={(e) => handleChange('opacity', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label="Skew X">
              <input type="number" value={Math.round(activeElement.style.skewX || 0)} onChange={(e) => handleChange('skewX', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
            <InputRow label="Skew Y">
              <input type="number" value={Math.round(activeElement.style.skewY || 0)} onChange={(e) => handleChange('skewY', Number(e.target.value))} className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-zinc-800 outline-none" />
            </InputRow>
          </div>
        </Section>
      </div>

      <LinkModal 
        isOpen={isLinkModalOpen} 
        onClose={() => setIsLinkModalOpen(false)} 
        link={activeElement.style.link || ''} 
        onChange={(val) => handleChange('link', val)} 
      />
    </div>
  );
}
