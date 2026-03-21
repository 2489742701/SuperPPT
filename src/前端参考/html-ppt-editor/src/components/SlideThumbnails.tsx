import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Plus, Trash2, X, Copy } from 'lucide-react';
import { useTranslation } from '../i18n';

export function SlideThumbnails() {
  const { presentation, activeSlideId, addSlide, selectSlide, deleteSlide, duplicateSlide, language, togglePanel } = useEditorStore();
  const t = useTranslation(language);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, slideId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, slideId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, slideId });
  };

  return (
    <div className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col h-full overflow-y-auto z-10" onClick={() => setContextMenu(null)} onContextMenu={(e) => e.preventDefault()}>
      <div className="p-4 border-b border-zinc-200 flex justify-between items-center sticky top-0 bg-zinc-50 z-10">
        <h2 className="font-semibold text-sm text-zinc-700 uppercase tracking-wider">{t.panels.slides}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={addSlide}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
            title="New Slide"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => togglePanel('left')}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            onContextMenu={(e) => handleContextMenu(e, slide.id)}
            className={`
              relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all group
              ${activeSlideId === slide.id ? 'border-zinc-800 shadow-md ring-2 ring-zinc-200' : 'border-zinc-200 hover:border-zinc-300'}
            `}
          >
            <div 
              className="absolute inset-0 z-0"
              onClick={() => selectSlide(slide.id)}
            />
            <div className="absolute top-1 left-2 text-xs font-bold text-zinc-400 z-10 pointer-events-none">
              {index + 1}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSlide(slide.id);
              }}
              className="absolute top-1 right-1 p-1.5 bg-white/80 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
              title={t.properties.delete}
            >
              <Trash2 size={14} />
            </button>

            <div className="aspect-video bg-white w-full flex items-center justify-center p-2 pointer-events-none relative overflow-hidden">
              {slide.elements.map(el => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${(el.style.x / 1200) * 100}%`,
                    top: `${(el.style.y / 675) * 100}%`,
                    width: `${(el.style.width / 1200) * 100}%`,
                    height: `${(el.style.height / 675) * 100}%`,
                    opacity: el.style.opacity ?? 1,
                    backgroundColor: el.type === 'textbox' ? 'transparent' : (el.style.fill || '#ccc'),
                    border: el.type === 'textbox' ? '1px solid #999' : 'none',
                    filter: 'blur(1px)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div 
          className="fixed bg-white border border-zinc-200 shadow-xl rounded py-1 w-48 z-50 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100 flex items-center gap-2"
            onClick={() => {
              duplicateSlide(contextMenu.slideId);
              setContextMenu(null);
            }}
          >
            <Copy size={14} /> {t.contextMenu.duplicate}
          </button>
          <div className="h-px bg-zinc-200 my-1" />
          <button 
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => {
              deleteSlide(contextMenu.slideId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} /> {t.contextMenu.delete}
          </button>
        </div>
      )}
    </div>
  );
}
