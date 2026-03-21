import React from 'react';
import { Toolbar } from './Toolbar';
import { SlideThumbnails } from './SlideThumbnails';
import { CanvasArea } from './CanvasArea';
import { CodeEditor } from './CodeEditor';
import { PropertyPanel } from './PropertyPanel';
import { Preview } from './Preview';
import { useEditorStore } from '../store/useEditorStore';

export function EditorLayout() {
  const { isPreview, panels } = useEditorStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 overflow-hidden font-sans text-zinc-900">
      <Toolbar />
      {panels.propertyPanelPosition === 'top' && <PropertyPanel layout="horizontal" />}
      <div className="flex flex-1 overflow-hidden">
        {panels.left && <SlideThumbnails />}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <CanvasArea />
          {panels.bottom && <CodeEditor />}
        </div>
        {panels.propertyPanelPosition === 'right' && <PropertyPanel layout="vertical" />}
      </div>
      {isPreview && <Preview />}
    </div>
  );
}
