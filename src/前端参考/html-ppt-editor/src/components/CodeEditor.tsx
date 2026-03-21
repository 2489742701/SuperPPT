import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../store/useEditorStore';
import { X } from 'lucide-react';

export function CodeEditor() {
  const { presentation, updatePresentation, togglePanel } = useEditorStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCode(JSON.stringify(presentation, null, 2));
      setError(null);
    } catch (e) {
      // Ignore stringify errors
    }
  }, [presentation]);

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    setCode(value);
    try {
      const parsed = JSON.parse(value);
      // Basic validation
      if (parsed && Array.isArray(parsed.slides)) {
        updatePresentation(parsed);
        setError(null);
      } else {
        setError('Invalid format: missing slides array');
      }
    } catch (e: any) {
      setError(`JSON Error: ${e.message}`);
    }
  };

  return (
    <div className="h-1/3 border-t border-zinc-200 flex flex-col bg-white relative z-10">
      <div className="h-8 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 text-xs font-semibold text-zinc-600 uppercase tracking-wider justify-between">
        <div className="flex items-center gap-4">
          <span>JSON Data Model</span>
          {error && <span className="text-red-500 font-normal normal-case">{error}</span>}
        </div>
        <button
          onClick={() => togglePanel('bottom')}
          className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
          title="Close Panel"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: 'on',
            formatOnPaste: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
