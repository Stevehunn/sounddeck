// src/store/middleware/undoRedo.js

// Configuration
const UNDO_HISTORY_LIMIT = 50

// ─── FONCTIONS POUR L'HISTORIQUE ──────────────────────────────────────────

export function pushToUndoStack(undoStack, state, limit = UNDO_HISTORY_LIMIT) {
  const newStack = [...undoStack, state]
  if (newStack.length > limit) {
    newStack.shift()
  }
  return newStack
}

export function popFromUndoStack(undoStack, redoStack, currentState) {
  if (undoStack.length === 0) return null
  
  const newUndoStack = [...undoStack]
  const previousState = newUndoStack.pop()
  const newRedoStack = [...redoStack, currentState]
  
  return {
    state: previousState,
    undoStack: newUndoStack,
    redoStack: newRedoStack,
    canUndo: newUndoStack.length > 0,
    canRedo: true
  }
}

export function popFromRedoStack(redoStack, undoStack, currentState) {
  if (redoStack.length === 0) return null
  
  const newRedoStack = [...redoStack]
  const nextState = newRedoStack.pop()
  const newUndoStack = [...undoStack, currentState]
  
  return {
    state: nextState,
    undoStack: newUndoStack,
    redoStack: newRedoStack,
    canUndo: true,
    canRedo: newRedoStack.length > 0
  }
}

export function createSnapshot(project) {
  return JSON.parse(JSON.stringify(project))
}

export default {
  UNDO_HISTORY_LIMIT,
  pushToUndoStack,
  popFromUndoStack,
  popFromRedoStack,
  createSnapshot,
}