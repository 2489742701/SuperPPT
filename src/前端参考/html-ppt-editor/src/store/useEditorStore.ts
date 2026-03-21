/**
 * Editor State Management
 * 
 * This file uses Zustand to manage the global state of the presentation editor.
 * It handles the presentation data structure (slides, elements, settings),
 * UI state (active slide/element, panels, preview mode), and history (undo/redo).
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '../i18n';

// Supported element types in the editor
export type ElementType = 'textbox' | 'shape' | 'media' | 'button' | 'table' | 'icon' | 'container';

// Animation properties for elements
export interface ElementAnimation {
  type: 'none' | 'fadeIn' | 'slideInLeft' | 'slideInRight' | 'slideInUp' | 'slideInDown' | 'scaleIn';
  duration: number;
  delay: number;
}

export interface ElementStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  angle?: number;
  skewX?: number;
  skewY?: number;
  scaleX?: number;
  scaleY?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify' | 'justify-left' | 'justify-center' | 'justify-right';
  letterSpacing?: number;
  lineHeight?: number;
  boxShadow?: string;
  link?: string;
  links?: { id: string, label: string, target: string }[];
}

export interface SlideElement {
  id: string;
  type: ElementType;
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line' | 'star' | 'polygon';
  points?: number;
  mediaType?: 'image' | 'video' | 'audio';
  iconName?: string;
  content?: string;
  action?: string;
  textMode?: 'auto' | 'fixed';
  style: ElementStyle;
  animation?: ElementAnimation;
}

export interface Slide {
  id: string;
  elements: SlideElement[];
  height?: number;
}

export interface PresentationSettings {
  advanceMode: 'click' | 'button';
  smartGuidesEnabled: boolean;
  baseWidth?: number;
  baseHeight?: number;
}

export interface Presentation {
  settings: PresentationSettings;
  slides: Slide[];
}

interface EditorState {
  presentation: Presentation;
  activeSlideId: string | null;
  activeElementId: string | null;
  clipboard: SlideElement | null;
  showAlignment: boolean;
  isPreview: boolean;
  language: Language;
  panels: {
    left: boolean;
    right: boolean;
    bottom: boolean;
    propertyPanelPosition: 'top' | 'right' | 'hidden';
  };
  history: Presentation[];
  historyIndex: number;
  addSlide: () => void;
  deleteSlide: (id: string) => void;
  duplicateSlide: (id: string) => void;
  selectSlide: (id: string) => void;
  addElement: (slideId: string, element: Omit<SlideElement, 'id'>) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  reorderElement: (slideId: string, elementId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  resetElement: (slideId: string, elementId: string) => void;
  copyElement: (element: SlideElement) => void;
  pasteElement: (slideId: string) => void;
  alignElements: (slideId: string, elementIds: string[], type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  selectElement: (id: string | null) => void;
  toggleAlignment: () => void;
  updatePresentation: (presentation: Presentation) => void;
  setPreview: (isPreview: boolean) => void;
  setLanguage: (lang: Language) => void;
  togglePanel: (panel: 'left' | 'right' | 'bottom') => void;
  setPropertyPanelPosition: (position: 'top' | 'right' | 'hidden') => void;
  updateSettings: (settings: Partial<PresentationSettings>) => void;
  undo: () => void;
  redo: () => void;
}

const initialSlideId = uuidv4();

const initialPresentation: Presentation = {
  settings: {
    advanceMode: 'click',
    smartGuidesEnabled: true,
  },
  slides: [
    {
      id: initialSlideId,
      elements: [
        {
          id: uuidv4(),
          type: 'textbox',
          content: 'Double click to edit',
          style: {
            x: 400,
            y: 200,
            width: 400,
            height: 100,
            fontSize: 48,
            color: '#333333',
            opacity: 1,
            strokeWidth: 0,
            skewX: 0,
            skewY: 0,
            textAlign: 'center',
          },
          animation: { type: 'none', duration: 0.5, delay: 0 },
        },
      ],
    },
  ],
};

const pushHistory = (state: EditorState, newPresentation: Presentation) => {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newPresentation);
  // Optional: limit history size
  if (newHistory.length > 50) {
    newHistory.shift();
  }
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
    presentation: newPresentation,
  };
};

export const useEditorStore = create<EditorState>((set) => ({
  presentation: initialPresentation,
  activeSlideId: initialSlideId,
  activeElementId: null,
  isPreview: false,
  language: 'zh',
  panels: {
    left: true,
    right: true,
    bottom: false,
    propertyPanelPosition: 'top',
  },
  history: [initialPresentation],
  historyIndex: 0,
  clipboard: null,
  showAlignment: false,

  addSlide: () =>
    set((state) => {
      const newSlideId = uuidv4();
      const newPresentation = {
        ...state.presentation,
        slides: [
          ...state.presentation.slides,
          { id: newSlideId, elements: [] },
        ],
      };
      return {
        ...pushHistory(state, newPresentation),
        activeSlideId: newSlideId,
        activeElementId: null,
      };
    }),

  deleteSlide: (id) =>
    set((state) => {
      const newSlides = state.presentation.slides.filter((s) => s.id !== id);
      const newActiveId =
        state.activeSlideId === id
          ? newSlides.length > 0
            ? newSlides[0].id
            : null
          : state.activeSlideId;
      const newPresentation = {
        ...state.presentation,
        slides: newSlides,
      };
      return {
        ...pushHistory(state, newPresentation),
        activeSlideId: newActiveId,
        activeElementId: state.activeSlideId === id ? null : state.activeElementId,
      };
    }),

  duplicateSlide: (id) =>
    set((state) => {
      const slideIndex = state.presentation.slides.findIndex((s) => s.id === id);
      if (slideIndex === -1) return state;
      
      const slideToDuplicate = state.presentation.slides[slideIndex];
      const newSlideId = uuidv4();
      
      // We keep the same element IDs so that Framer Motion can do Magic Move (layout animations)
      // between slides.
      const newSlide = {
        ...slideToDuplicate,
        id: newSlideId,
        elements: slideToDuplicate.elements.map(el => ({ ...el }))
      };

      const newSlides = [...state.presentation.slides];
      newSlides.splice(slideIndex + 1, 0, newSlide);

      const newPresentation = {
        ...state.presentation,
        slides: newSlides,
      };

      return {
        ...pushHistory(state, newPresentation),
        activeSlideId: newSlideId,
        activeElementId: null,
      };
    }),

  selectSlide: (id) =>
    set({
      activeSlideId: id,
      activeElementId: null,
    }),

  addElement: (slideId, element) =>
    set((state) => {
      const newElement = {
        ...element,
        id: uuidv4(),
        style: {
          opacity: 1,
          strokeWidth: 0,
          skewX: 0,
          skewY: 0,
          ...element.style,
        },
        animation: element.animation || { type: 'none', duration: 0.5, delay: 0 },
      };
      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? { ...slide, elements: [...slide.elements, newElement] }
            : slide
        ),
      };
      return {
        ...pushHistory(state, newPresentation),
        activeElementId: newElement.id,
      };
    }),

  updateElement: (slideId, elementId, updates) =>
    set((state) => {
      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? {
                ...slide,
                elements: slide.elements.map((el) =>
                  el.id === elementId
                    ? {
                        ...el,
                        ...updates,
                        style: { ...el.style, ...(updates.style || {}) },
                        animation: { ...el.animation, ...(updates.animation || {}) } as ElementAnimation,
                      }
                    : el
                ),
              }
            : slide
        ),
      };
      return pushHistory(state, newPresentation);
    }),

  deleteElement: (slideId, elementId) =>
    set((state) => {
      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? {
                ...slide,
                elements: slide.elements.filter((el) => el.id !== elementId),
              }
            : slide
        ),
      };
      return {
        ...pushHistory(state, newPresentation),
        activeElementId: state.activeElementId === elementId ? null : state.activeElementId,
      };
    }),

  reorderElement: (slideId, elementId, direction) =>
    set((state) => {
      const slides = state.presentation.slides.map((slide) => {
        if (slide.id !== slideId) return slide;
        const elements = [...slide.elements];
        const index = elements.findIndex((el) => el.id === elementId);
        if (index === -1) return slide;

        const [el] = elements.splice(index, 1);
        if (direction === 'up') {
          elements.splice(Math.min(index + 1, elements.length), 0, el);
        } else if (direction === 'down') {
          elements.splice(Math.max(index - 1, 0), 0, el);
        } else if (direction === 'top') {
          elements.push(el);
        } else if (direction === 'bottom') {
          elements.unshift(el);
        }
        return { ...slide, elements };
      });
      const newPresentation = { ...state.presentation, slides };
      return pushHistory(state, newPresentation);
    }),

  resetElement: (slideId, elementId) =>
    set((state) => {
      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? {
                ...slide,
                elements: slide.elements.map((el) =>
                  el.id === elementId
                    ? {
                        ...el,
                        style: {
                          ...el.style,
                          angle: 0,
                          skewX: 0,
                          skewY: 0,
                          scaleX: 1,
                          scaleY: 1,
                        },
                      }
                    : el
                ),
              }
            : slide
        ),
      };
      return pushHistory(state, newPresentation);
    }),

  copyElement: (element) => set({ clipboard: element }),

  pasteElement: (slideId) =>
    set((state) => {
      if (!state.clipboard) return state;
      const newElement = {
        ...state.clipboard,
        id: uuidv4(),
        style: {
          ...state.clipboard.style,
          x: state.clipboard.style.x + 20,
          y: state.clipboard.style.y + 20,
        },
      };
      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? { ...slide, elements: [...slide.elements, newElement] }
            : slide
        ),
      };
      return {
        ...pushHistory(state, newPresentation),
        activeElementId: newElement.id,
      };
    }),

  alignElements: (slideId, elementIds, type) =>
    set((state) => {
      const slide = state.presentation.slides.find((s) => s.id === slideId);
      if (!slide) return state;

      const canvasWidth = 800;
      const canvasHeight = 600;

      const newPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((s) =>
          s.id === slideId
            ? {
                ...s,
                elements: s.elements.map((e) => {
                  if (!elementIds.includes(e.id)) return e;
                  let { x, y } = e.style;
                  if (type === 'left') x = 0;
                  else if (type === 'center') x = (canvasWidth - e.style.width) / 2;
                  else if (type === 'right') x = canvasWidth - e.style.width;
                  else if (type === 'top') y = 0;
                  else if (type === 'middle') y = (canvasHeight - e.style.height) / 2;
                  else if (type === 'bottom') y = canvasHeight - e.style.height;
                  return { ...e, style: { ...e.style, x, y } };
                }),
              }
            : s
        ),
      };
      return pushHistory(state, newPresentation);
    }),

  selectElement: (id) => set({ activeElementId: id }),

  toggleAlignment: () => set((state) => ({ showAlignment: !state.showAlignment })),
  updatePresentation: (presentation) => set((state) => pushHistory(state, presentation)),

  setPreview: (isPreview) => set({ isPreview }),

  setLanguage: (language) => set({ language }),

  togglePanel: (panel) =>
    set((state) => ({
      panels: { ...state.panels, [panel]: !state.panels[panel] },
    })),

  setPropertyPanelPosition: (position) =>
    set((state) => ({
      panels: { ...state.panels, propertyPanelPosition: position },
    })),

  updateSettings: (settings) =>
    set((state) => {
      const newPresentation = {
        ...state.presentation,
        settings: { ...state.presentation.settings, ...settings },
      };
      return pushHistory(state, newPresentation);
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          historyIndex: newIndex,
          presentation: state.history[newIndex],
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          historyIndex: newIndex,
          presentation: state.history[newIndex],
        };
      }
      return state;
    }),
}));
