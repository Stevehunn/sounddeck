/**
 * @file Barrel export for the editor modal components.
 *
 * Each modal is a self-contained `isOpen`-gated component. They render
 * nothing when `isOpen` is `false` (no `visibility: hidden` — the parent
 * mounts/unmounts them conditionally).
 *
 * @see ./AddTrackModal.jsx
 * @see ./ExportModal.jsx
 * @see ./ImportFileModal.jsx
 * @see ./NormalizeModal.jsx
 * @see ./ProjectManagerModal.jsx
 * @see ./TimelineLoopModal.jsx
 * @see ./TrimClipModal.jsx
 */

export { default as AddTrackModal } from './AddTrackModal'
export { default as ExportModal } from './ExportModal'
export { default as ImportFileModal } from './ImportFileModal'
export { default as TrimClipModal } from './TrimClipModal'
export { default as NormalizeModal } from './NormalizeModal'
export { default as TimelineLoopModal } from './TimelineLoopModal'