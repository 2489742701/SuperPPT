/**
 * Canvas Area Component
 * 
 * This component is responsible for rendering the active slide using Fabric.js.
 * It translates the application state (Zustand) into Fabric objects and handles
 * user interactions like dragging, resizing, rotating, and text editing.
 * It also manages the context menu for elements.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { AlignmentPanel } from './AlignmentPanel';
import { useEditorStore } from '../store/useEditorStore';
import { useTranslation } from '../i18n';

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);
  
  const { presentation, activeSlideId, activeElementId, updateElement, selectElement, deleteElement, reorderElement, language, showAlignment, toggleAlignment } = useEditorStore();
  const t = useTranslation(language);
  const smartGuidesEnabled = presentation.settings.smartGuidesEnabled;

  const activeSlide = presentation.slides.find((s) => s.id === activeSlideId);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    setFabricCanvas(canvas);

    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const ratio = 16 / 9;
      let width = clientWidth - 40;
      let height = width / ratio;

      if (height > clientHeight - 40) {
        height = clientHeight - 40;
        width = height * ratio;
      }

      canvas.setDimensions({ width, height });
      const scale = width / 1200;
      canvas.setZoom(scale);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Sync Zustand to Fabric
  useEffect(() => {
    if (!fabricCanvas || !activeSlide) return;

    fabricCanvas.off('object:modified');
    fabricCanvas.off('selection:created');
    fabricCanvas.off('selection:updated');
    fabricCanvas.off('selection:cleared');
    fabricCanvas.off('text:changed');
    fabricCanvas.off('mouse:down');

    // Temporarily discard active selection to safely sync absolute coordinates
    const activeObjects = fabricCanvas.getActiveObjects();
    const isMultiSelection = activeObjects.length > 1;
    if (isMultiSelection) {
      fabricCanvas.discardActiveObject();
    }

    const existingObjects = fabricCanvas.getObjects();
    const newIds = new Set(activeSlide.elements.map(e => e.id));

    // Remove deleted objects
    existingObjects.forEach(obj => {
      if ((obj as any).id && !newIds.has((obj as any).id)) {
        fabricCanvas.remove(obj);
      }
    });

    // Add or update objects
    activeSlide.elements.forEach((element, index) => {
      const existingObj = existingObjects.find(o => (o as any).id === element.id);

      const needsRecreate = existingObj && element.type === 'textbox' && (
        (element.textMode === 'fixed' && !(existingObj instanceof fabric.Textbox)) ||
        (element.textMode !== 'fixed' && existingObj instanceof fabric.Textbox)
      );

      const commonProps = {
        left: element.style.x,
        top: element.style.y,
        width: element.style.width,
        height: element.style.height,
        scaleX: element.style.scaleX || 1,
        scaleY: element.style.scaleY || 1,
        angle: element.style.angle || 0,
        skewX: element.style.skewX || 0,
        skewY: element.style.skewY || 0,
        opacity: element.style.opacity ?? 1,
        stroke: element.style.stroke || undefined,
        strokeWidth: element.style.strokeWidth || 0,
      };

      if (existingObj && !needsRecreate) {
        existingObj.set(commonProps);

        if (element.type === 'textbox' && existingObj instanceof fabric.IText) {
          existingObj.set({
            text: element.content || '',
            fontSize: element.style.fontSize || 16,
            fill: element.style.color || '#000000',
            backgroundColor: element.style.backgroundColor || '',
            fontWeight: element.style.fontWeight || 'normal',
            fontStyle: element.style.fontStyle || 'normal',
            underline: element.style.textDecoration === 'underline',
            textAlign: element.style.textAlign || 'left',
            charSpacing: element.style.letterSpacing || 0,
            lineHeight: element.style.lineHeight || 1.2,
          });
        } else if (element.type === 'shape') {
          if (element.shapeType === 'line') {
            existingObj.set({ stroke: element.style.fill || '#000000' });
          } else {
            existingObj.set({ fill: element.style.fill || '#000000' });
          }
        } else if (element.type === 'button' && existingObj instanceof fabric.Group) {
          const rect = existingObj.item(0) as fabric.Rect;
          const text = existingObj.item(1) as fabric.IText;
          if (rect && text) {
            rect.set({ fill: element.style.fill || '#3b82f6', width: element.style.width, height: element.style.height });
            text.set({ text: element.content || '', fill: element.style.color || '#ffffff', fontSize: element.style.fontSize || 16 });
            existingObj.setCoords();
          }
        }
        fabricCanvas.insertAt(index, existingObj);
      } else {
        if (existingObj && needsRecreate) {
          fabricCanvas.remove(existingObj);
        }

        let newObj: fabric.Object | null = null;

        if (element.type === 'textbox') {
          const textProps = {
            ...commonProps,
            fontSize: element.style.fontSize || 16,
            fill: element.style.color || '#000000',
            backgroundColor: element.style.backgroundColor || '',
            fontFamily: 'Inter, sans-serif',
            fontWeight: element.style.fontWeight || 'normal',
            fontStyle: element.style.fontStyle || 'normal',
            underline: element.style.textDecoration === 'underline',
            textAlign: element.style.textAlign || 'left',
            charSpacing: element.style.letterSpacing || 0,
            lineHeight: element.style.lineHeight || 1.2,
          };
          
          if (element.textMode === 'fixed') {
            newObj = new fabric.Textbox(element.content || '', {
              ...textProps,
              splitByGrapheme: true,
            });
          } else {
            newObj = new fabric.IText(element.content || '', textProps);
          }
        } else if (element.type === 'shape') {
          if (element.shapeType === 'rectangle') {
            newObj = new fabric.Rect({ ...commonProps, fill: element.style.fill || '#007acc' });
          } else if (element.shapeType === 'circle') {
            newObj = new fabric.Circle({ ...commonProps, radius: element.style.width / 2, fill: element.style.fill || '#007acc' });
          } else if (element.shapeType === 'triangle') {
            newObj = new fabric.Triangle({ ...commonProps, fill: element.style.fill || '#007acc' });
          } else if (element.shapeType === 'line') {
            newObj = new fabric.Line([0, 0, element.style.width, 0], { ...commonProps, stroke: element.style.fill || '#007acc', strokeWidth: 4, fill: '' });
          } else if (element.shapeType === 'star') {
            const points = [
              { x: 50, y: 0 }, { x: 61, y: 35 }, { x: 98, y: 35 }, { x: 68, y: 57 },
              { x: 79, y: 91 }, { x: 50, y: 70 }, { x: 21, y: 91 }, { x: 32, y: 57 },
              { x: 2, y: 35 }, { x: 39, y: 35 }
            ];
            newObj = new fabric.Polygon(points, { ...commonProps, fill: element.style.fill || '#007acc' });
          }
        } else if (element.type === 'media' && element.mediaType === 'image' && element.content) {
          fabric.Image.fromURL(element.content, { crossOrigin: 'anonymous' }).then((img) => {
            img.set(commonProps);
            if (img.width && img.height) {
              img.scaleToWidth(element.style.width);
            }
            (img as any).id = element.id;
            fabricCanvas.insertAt(index, img);
            fabricCanvas.renderAll();
          }).catch(console.error);
        } else if (element.type === 'media' && (element.mediaType === 'video' || element.mediaType === 'audio')) {
          const rect = new fabric.Rect({ width: element.style.width, height: element.style.height, fill: '#e4e4e7', rx: 4, ry: 4, originX: 'center', originY: 'center' });
          const text = new fabric.IText(element.mediaType === 'video' ? '🎥 Video' : '🎵 Audio', { fontSize: 24, fill: '#52525b', fontFamily: 'Inter, sans-serif', originX: 'center', originY: 'center' });
          newObj = new fabric.Group([rect, text], { ...commonProps });
        } else if (element.type === 'table') {
          const rect = new fabric.Rect({ width: element.style.width, height: element.style.height, fill: element.style.fill || '#f4f4f5', stroke: element.style.stroke || '#d4d4d8', strokeWidth: element.style.strokeWidth || 1, originX: 'center', originY: 'center' });
          const text = new fabric.IText('📊 Table', { fontSize: 24, fill: '#52525b', fontFamily: 'Inter, sans-serif', originX: 'center', originY: 'center' });
          newObj = new fabric.Group([rect, text], { ...commonProps });
        } else if (element.type === 'icon') {
          const text = new fabric.IText('😊', { fontSize: Math.min(element.style.width, element.style.height), fill: element.style.color || '#000000', fontFamily: 'Inter, sans-serif', ...commonProps });
          newObj = text;
        } else if (element.type === 'button') {
          const rect = new fabric.Rect({
            width: element.style.width,
            height: element.style.height,
            fill: element.style.fill || '#3b82f6',
            rx: 4,
            ry: 4,
            originX: 'center',
            originY: 'center',
          });
          const text = new fabric.IText(element.content || 'Button', {
            fontSize: element.style.fontSize || 16,
            fill: element.style.color || '#ffffff',
            fontFamily: 'Inter, sans-serif',
            originX: 'center',
            originY: 'center',
          });
          newObj = new fabric.Group([rect, text], {
            ...commonProps,
          });
        }

        if (newObj) {
          (newObj as any).id = element.id;
          fabricCanvas.insertAt(index, newObj);
        }
      }
    });

    // Handle selection from state
    if (isMultiSelection) {
      const sel = new fabric.ActiveSelection(activeObjects, { canvas: fabricCanvas });
      fabricCanvas.setActiveObject(sel);
    } else {
      const currentSelection = fabricCanvas.getActiveObjects();
      if (activeElementId) {
        if (currentSelection.length === 0 || (currentSelection[0] as any).id !== activeElementId) {
          const objToSelect = fabricCanvas.getObjects().find(o => (o as any).id === activeElementId);
          if (objToSelect) {
            fabricCanvas.setActiveObject(objToSelect);
          }
        }
      } else {
        fabricCanvas.discardActiveObject();
      }
    }

    fabricCanvas.renderAll();

    // Re-attach event listeners
    const handleModify = (e: any) => {
      const target = e.target;
      if (!target || !activeSlideId) return;

      if (target.type === 'activeSelection') {
        const objects = target.getObjects();
        objects.forEach((obj: any) => {
          const id = obj.id;
          if (!id) return;
          
          const matrix = obj.calcTransformMatrix();
          const options = fabric.util.qrDecompose(matrix);
          
          updateElement(activeSlideId, id, {
            style: {
              x: options.translateX || 0,
              y: options.translateY || 0,
              width: obj.width || 0,
              height: obj.height || 0,
              scaleX: options.scaleX || 1,
              scaleY: options.scaleY || 1,
              angle: options.angle || 0,
              skewX: options.skewX || 0,
              skewY: options.skewY || 0,
            }
          });
        });
        return;
      }

      const id = target.id;
      if (!id) return;

      updateElement(activeSlideId, id, {
        style: {
          x: target.left || 0,
          y: target.top || 0,
          width: target.width || 0,
          height: target.height || 0,
          scaleX: target.scaleX || 1,
          scaleY: target.scaleY || 1,
          angle: target.angle || 0,
          skewX: target.skewX || 0,
          skewY: target.skewY || 0,
        }
      });
    };

    const handleSelection = (e: any) => {
      if (e.selected && e.selected.length > 0) {
        selectElement(e.selected[0].id);
      } else {
        selectElement(null);
      }
    };

    const handleTextChange = (e: any) => {
      const target = e.target;
      if (!target || !activeSlideId || (target.type !== 'i-text' && target.type !== 'textbox')) return;
      
      const id = target.id;
      if (!id) return;

      updateElement(activeSlideId, id, {
        content: target.text,
        style: {
          ...activeSlide.elements.find(el => el.id === id)?.style,
          width: target.width,
          height: target.height,
        } as any
      });
    };

    const handleMouseDown = (e: any) => {
      if (e.button === 3 && e.target) { // Right click
        const id = e.target.id;
        if (id) {
          selectElement(id);
          setContextMenu({
            x: e.e.clientX,
            y: e.e.clientY,
            elementId: id,
          });
        }
      } else {
        setContextMenu(null);
      }
    };

    const handleMoving = (e: any) => {
      if (!smartGuidesEnabled) return;
      const target = e.target;
      if (!target) return;

      const objects = fabricCanvas.getObjects();
      const threshold = 10;
      let snapped = false;

      objects.forEach((obj) => {
        if (obj === target) return;

        const targetCenter = target.getCenterPoint();
        const objCenter = obj.getCenterPoint();

        // Snap to center
        if (Math.abs(targetCenter.x - objCenter.x) < threshold) {
          target.set({ left: objCenter.x - target.getScaledWidth() / 2 });
          snapped = true;
        }
        if (Math.abs(targetCenter.y - objCenter.y) < threshold) {
          target.set({ top: objCenter.y - target.getScaledHeight() / 2 });
          snapped = true;
        }
      });
    };

    fabricCanvas.on('object:moving', handleMoving);
    fabricCanvas.on('object:modified', handleModify);
    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleSelection);
    fabricCanvas.on('text:changed', handleTextChange);
    fabricCanvas.on('mouse:down', handleMouseDown);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        useEditorStore.getState().redo();
        e.preventDefault();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0 && activeSlideId) {
          activeObjects.forEach(obj => {
            const id = (obj as any).id;
            if (id) {
              deleteElement(activeSlideId, id);
            }
          });
          fabricCanvas.discardActiveObject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricCanvas, activeSlide, activeSlide?.elements, activeSlideId, activeElementId, updateElement, selectElement, deleteElement, smartGuidesEnabled]);

  return (
    <div ref={containerRef} className="flex-1 bg-zinc-200 flex items-center justify-center overflow-hidden relative" onClick={() => setContextMenu(null)} onContextMenu={(e) => e.preventDefault()}>
      <div className="shadow-2xl bg-white">
        <canvas ref={canvasRef} />
      </div>
      
      {showAlignment && <AlignmentPanel onClose={toggleAlignment} />}
      
      {contextMenu && (
        <div 
          className="fixed bg-white border border-zinc-200 shadow-xl rounded py-1 w-48 z-50 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              if (activeSlideId) reorderElement(activeSlideId, contextMenu.elementId, 'up');
              setContextMenu(null);
            }}
          >
            {t.contextMenu.bringForward}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              if (activeSlideId) reorderElement(activeSlideId, contextMenu.elementId, 'down');
              setContextMenu(null);
            }}
          >
            {t.contextMenu.sendBackward}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              if (activeSlideId && activeSlide) {
                const el = activeSlide.elements.find(e => e.id === contextMenu.elementId);
                if (el) useEditorStore.getState().copyElement(el);
              }
              setContextMenu(null);
            }}
          >
            {t.contextMenu.copy}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              if (activeSlideId) useEditorStore.getState().pasteElement(activeSlideId);
              setContextMenu(null);
            }}
          >
            {t.contextMenu.paste}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              if (activeSlideId) useEditorStore.getState().resetElement(activeSlideId, contextMenu.elementId);
              setContextMenu(null);
            }}
          >
            {t.contextMenu.reset}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-zinc-100"
            onClick={() => {
              // Hyperlink logic would go here, for now just a placeholder
              console.log("Hyperlink clicked for", contextMenu.elementId);
              setContextMenu(null);
            }}
          >
            {t.contextMenu.hyperlink}
          </button>
          <div className="h-px bg-zinc-200 my-1" />
          <button 
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
            onClick={() => {
              if (activeSlideId) deleteElement(activeSlideId, contextMenu.elementId);
              setContextMenu(null);
            }}
          >
            {t.contextMenu.delete}
          </button>
        </div>
      )}
    </div>
  );
}
