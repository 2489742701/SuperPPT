import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Type, Square, Circle, Triangle, Image as ImageIcon, Play, Settings, Code, Globe, MousePointerClick, PanelLeft, PanelRight, Undo, Redo, Table, Video, Music, Smile, FileDown, Camera, Star, Hexagon, AlignLeft } from 'lucide-react';
import { useTranslation } from '../i18n';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarDropdown } from './ToolbarDropdown';

export function Toolbar() {
  const { activeSlideId, addElement, setPreview, language, setLanguage, panels, togglePanel, undo, redo, historyIndex, history, toggleAlignment, setPropertyPanelPosition } = useEditorStore();
  const t = useTranslation(language);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleAddText = (type: 'heading' | 'body') => {
    if (!activeSlideId) return;
    addElement(activeSlideId, {
      type: 'textbox',
      content: type === 'heading' ? 'Heading' : 'Body text',
      textMode: 'auto',
      style: { 
        x: 100, 
        y: 100, 
        width: type === 'heading' ? 400 : 300, 
        height: type === 'heading' ? 80 : 50, 
        fontSize: type === 'heading' ? 48 : 24, 
        color: '#000000' 
      },
    });
  };

  const handleAddShape = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line' | 'star' | 'polygon') => {
    if (!activeSlideId) return;
    let points: number | undefined;
    if (shapeType === 'star' || shapeType === 'polygon') {
      const input = prompt(`Enter number of points for ${shapeType}:`, '5');
      points = input ? parseInt(input, 10) : 5;
    }
    addElement(activeSlideId, {
      type: 'shape',
      shapeType,
      points,
      style: { x: 100, y: 100, width: 100, height: 100, fill: '#007acc' },
    });
  };

  const handleAddButton = () => {
    if (!activeSlideId) return;
    const action = prompt('Enter button action (e.g., "next", "prev", "url"):', 'next') || 'next';
    addElement(activeSlideId, {
      type: 'button',
      content: 'Click Me',
      action,
      style: { x: 100, y: 100, width: 120, height: 40, fill: '#3b82f6', color: '#ffffff', fontSize: 16 },
    });
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        if (activeSlideId) {
          addElement(activeSlideId, { type: 'media', mediaType: 'image', content: dataUrl, style: { x: 50, y: 50, width: 600, height: 400 } });
        }
      }
      
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    } catch (err) {
      console.error('Error taking screenshot:', err);
    }
  };

  return (
    <div className="h-14 border-b border-zinc-200 bg-white flex items-center px-4 gap-2 shadow-sm relative z-20">
      <div className="font-bold text-lg mr-4 text-zinc-800">HTML PPT</div>
      
      <ToolbarButton onClick={undo} icon={Undo} disabled={!canUndo} title="Undo" />
      <ToolbarButton onClick={redo} icon={Redo} disabled={!canRedo} title="Redo" />
      <ToolbarButton onClick={toggleAlignment} icon={AlignLeft} title="Alignment Tools" />

      <div className="h-6 w-px bg-zinc-300 mx-1" />

      <ToolbarDropdown icon={Type} label={t.toolbar.text}>
        <button onClick={() => handleAddText('heading')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm">{t.toolbar.heading}</button>
        <button onClick={() => handleAddText('body')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm">{t.toolbar.body}</button>
      </ToolbarDropdown>

      <ToolbarDropdown icon={Square} label={t.toolbar.shapes}>
        <button onClick={() => handleAddShape('rectangle')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Square size={14}/> {t.toolbar.rectangle}</button>
        <button onClick={() => handleAddShape('circle')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Circle size={14}/> {t.toolbar.circle}</button>
        <button onClick={() => handleAddShape('triangle')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Triangle size={14}/> {t.toolbar.triangle}</button>
        <button onClick={() => handleAddShape('line')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><div className="w-3 h-px bg-current rotate-45" /> {t.toolbar.line}</button>
        <button onClick={() => handleAddShape('star')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Star size={14}/> {t.toolbar.star}</button>
        <button onClick={() => handleAddShape('polygon')} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Hexagon size={14}/> {t.toolbar.polygon}</button>
      </ToolbarDropdown>

      <ToolbarDropdown icon={ImageIcon} label="Insert">
        <button onClick={() => {
          const url = prompt('Enter image URL:', 'https://picsum.photos/400/300');
          if (url && activeSlideId) {
            addElement(activeSlideId, { type: 'media', mediaType: 'image', content: url, style: { x: 100, y: 100, width: 400, height: 300 } });
          }
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><ImageIcon size={14}/> Image</button>
        <button onClick={() => {
          const url = prompt('Enter video URL (mp4):', 'https://www.w3schools.com/html/mov_bbb.mp4');
          if (url && activeSlideId) {
            addElement(activeSlideId, { type: 'media', mediaType: 'video', content: url, style: { x: 100, y: 100, width: 400, height: 300 } });
          }
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Video size={14}/> Video</button>
        <button onClick={() => {
          const url = prompt('Enter audio URL (mp3):', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
          if (url && activeSlideId) {
            addElement(activeSlideId, { type: 'media', mediaType: 'audio', content: url, style: { x: 100, y: 100, width: 300, height: 50 } });
          }
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Music size={14}/> Audio</button>
        <button onClick={handleScreenshot} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Camera size={14}/> Screenshot</button>
        <button onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && activeSlideId) {
              let offset = 0;
              Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    addElement(activeSlideId, { type: 'media', mediaType: 'image', content: event.target.result as string, style: { x: 100 + offset, y: 100 + offset, width: 300, height: 200 } });
                    offset += 20;
                  }
                };
                reader.readAsDataURL(file);
              });
            }
          };
          input.click();
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><ImageIcon size={14}/> {t.toolbar.album}</button>
        <div className="h-px bg-zinc-200 my-1" />
        <button onClick={() => {
          if (activeSlideId) {
            addElement(activeSlideId, { type: 'table', content: 'Table', style: { x: 100, y: 100, width: 300, height: 150, fill: '#f4f4f5', stroke: '#d4d4d8', strokeWidth: 1 } });
          }
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Table size={14}/> {t.toolbar.table}</button>
        <button onClick={() => {
          if (activeSlideId) {
            addElement(activeSlideId, { type: 'icon', iconName: 'smile', style: { x: 100, y: 100, width: 64, height: 64, color: '#000000' } });
          }
        }} className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"><Smile size={14}/> {t.toolbar.icon}</button>
      </ToolbarDropdown>

      <ToolbarButton onClick={handleAddButton} icon={MousePointerClick} label={t.toolbar.button} />

      <div className="flex-1" />

      <ToolbarButton onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} icon={Globe} label={language.toUpperCase()} title={t.toolbar.language} />

      <ToolbarDropdown icon={Settings} label={t.toolbar.window}>
        <button 
          onClick={() => togglePanel('left')} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <PanelLeft size={14} className={panels.left ? 'text-blue-500' : 'text-zinc-400'} /> 
          {t.toolbar.toggleLeftPanel}
        </button>
        <button 
          onClick={() => togglePanel('bottom')} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <Code size={14} className={panels.bottom ? 'text-blue-500' : 'text-zinc-400'} /> 
          {t.toolbar.toggleBottomPanel}
        </button>
        <div className="h-px bg-zinc-200 my-1" />
        <div className="px-4 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Property Panel</div>
        <button 
          onClick={() => setPropertyPanelPosition('top')} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <div className={`w-3 h-3 rounded-full ${panels.propertyPanelPosition === 'top' ? 'bg-blue-500' : 'bg-zinc-300'}`} />
          Top Bar
        </button>
        <button 
          onClick={() => setPropertyPanelPosition('right')} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <div className={`w-3 h-3 rounded-full ${panels.propertyPanelPosition === 'right' ? 'bg-blue-500' : 'bg-zinc-300'}`} />
          Right Sidebar
        </button>
        <button 
          onClick={() => setPropertyPanelPosition('hidden')} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <div className={`w-3 h-3 rounded-full ${panels.propertyPanelPosition === 'hidden' ? 'bg-blue-500' : 'bg-zinc-300'}`} />
          Hidden
        </button>
        <div className="h-px bg-zinc-200 my-1" />
        <button 
          onClick={handleExportPDF} 
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-sm flex items-center gap-2"
        >
          <FileDown size={14}/> 
          {t.toolbar.exportPdf}
        </button>
      </ToolbarDropdown>

      <div className="h-6 w-px bg-zinc-300 mx-1" />

      <ToolbarButton onClick={() => setPreview(true)} icon={Play} label={t.toolbar.preview} />
    </div>
  );
}
