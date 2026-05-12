"use client"

import * as React from "react"

// ─── Standalone Toast System (no Radix UI) ───

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

type ToastInput = Omit<Toast, "id">

const TOAST_LIMIT = 5
const TOAST_DURATION = 4000

let toastCount = 0
function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return toastCount.toString()
}

// ─── Global state ───
type Listener = (toasts: Toast[]) => void

let memoryToasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((fn) => fn([...memoryToasts]))
}

function addToast(input: ToastInput): Toast {
  const id = genId()
  const t: Toast = { ...input, id }
  memoryToasts = [t, ...memoryToasts].slice(0, TOAST_LIMIT)
  emit()

  // Auto-dismiss
  const ms = input.duration ?? TOAST_DURATION
  if (ms > 0) {
    setTimeout(() => dismissToast(id), ms)
  }

  return t
}

function dismissToast(id: string) {
  memoryToasts = memoryToasts.filter((t) => t.id !== id)
  emit()
}

function dismissAll() {
  memoryToasts = []
  emit()
}

// ─── Public API ───

/** Fire-and-forget toast from anywhere */
export function toast(input: ToastInput) {
  return addToast(input)
}

/** React hook – returns current toasts + helpers */
export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(memoryToasts)

  React.useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  return {
    toasts,
    toast: addToast,
    dismiss: dismissToast,
    dismissAll,
  }
}