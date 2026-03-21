# Presentation Editor Development Manual

## 1. Project Overview
This project is a web-based presentation editor that allows users to create, edit, and manage slides. It features a canvas for visual editing, a property panel for element customization, and a toolbar for common actions.

## 2. Architecture
- **Framework**: React 18+ with Vite.
- **State Management**: Zustand (`/src/store/useEditorStore.ts`) for global application state.
- **Canvas Rendering**: Fabric.js for manipulating visual elements on the canvas.
- **Styling**: Tailwind CSS for UI components.
- **Internationalization**: `react-i18next` for multi-language support.

## 3. Key Components
- **`CanvasArea.tsx`**: The core component for rendering the active slide. It uses `useEffect` to sync the Zustand state with the Fabric.js canvas instance.
- **`PropertyPanel.tsx`**: Provides an interface for editing properties of the currently selected element(s) or the active slide.
- **`Toolbar.tsx`**: Contains tools for adding elements, managing slides, and performing editor actions.

## 4. State Management (`useEditorStore.ts`)
The `useEditorStore` is the central source of truth. Key state properties include:
- `presentation`: The entire presentation data structure (settings, slides, elements).
- `activeSlideId`: The ID of the currently selected slide.
- `activeElementIds`: An array of IDs of the currently selected elements (supports multi-selection).
- `history`: An array of presentation states for undo/redo functionality.

## 5. Multi-language Support (`i18n.ts`)
The application uses `react-i18next` for translations. All UI labels should be defined in `i18n.ts` and accessed via the `t` function from `useTranslation`.

## 6. Development Workflow
- **Linting**: Run `npm run lint` or use the `lint_applet` tool to check for syntax errors and type issues.
- **Building**: Run `npm run build` for production builds.
- **State Updates**: Always use Zustand actions defined in `useEditorStore.ts` to modify the state.
- **Canvas Sync**: When modifying elements, ensure the `CanvasArea` `useEffect` correctly syncs the state to Fabric.js.
