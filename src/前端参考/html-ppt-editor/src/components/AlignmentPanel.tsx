import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { useTranslation } from '../i18n';

export function AlignmentPanel({ onClose }: { onClose: () => void }) {
  const { activeSlideId, activeElementIds, alignElements, language } = useEditorStore();
  const t = useTranslation(language);

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (activeSlideId && activeElementIds.length > 0) {
      alignElements(activeSlideId, activeElementIds, type);
    }
  };

  return (
    <div className="absolute top-10 right-10 bg-white border border-zinc-200 shadow-xl rounded p-2 z-50 flex gap-1">
      <button onClick={() => handleAlign('left')} title={t.alignment.left} className="p-1 hover:bg-zinc-100 rounded"><AlignLeft size={16} /></button>
      <button onClick={() => handleAlign('center')} title={t.alignment.center} className="p-1 hover:bg-zinc-100 rounded"><AlignCenter size={16} /></button>
      <button onClick={() => handleAlign('right')} title={t.alignment.right} className="p-1 hover:bg-zinc-100 rounded"><AlignRight size={16} /></button>
      <button onClick={() => handleAlign('top')} title={t.alignment.top} className="p-1 hover:bg-zinc-100 rounded"><ArrowUp size={16} /></button>
      <button onClick={() => handleAlign('middle')} title={t.alignment.middle} className="p-1 hover:bg-zinc-100 rounded"><ArrowLeftRight size={16} /></button>
      <button onClick={() => handleAlign('bottom')} title={t.alignment.bottom} className="p-1 hover:bg-zinc-100 rounded"><ArrowDown size={16} /></button>
      <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-zinc-800">×</button>
    </div>
  );
}
