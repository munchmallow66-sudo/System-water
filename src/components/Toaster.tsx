"use client"

import * as React from "react"
import { useToast, type Toast } from "@/hooks/use-toast"
import { X, CheckCircle2, AlertTriangle } from "lucide-react"

// ─── Pure Tailwind Toaster (replaces Shadcn <Toaster />) ───

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    // trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const isDestructive = toast.variant === "destructive"

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3
        rounded-2xl border px-4 py-3.5
        shadow-[0_16px_48px_-12px_rgba(0,0,0,0.25)]
        backdrop-blur-md
        transition-all duration-300 ease-out
        ${show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}
        ${
          isDestructive
            ? "border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-100"
            : "border-slate-200 bg-white/95 text-slate-900 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        }
      `}
      role="alert"
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {isDestructive ? (
          <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-sky-500 dark:text-sky-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        )}
        {toast.description && (
          <p
            className={`mt-0.5 text-sm leading-snug ${
              isDestructive
                ? "text-rose-700 dark:text-rose-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {toast.description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        className={`
          shrink-0 rounded-lg p-1 transition-colors
          ${
            isDestructive
              ? "hover:bg-rose-200/60 dark:hover:bg-rose-800/50"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }
        `}
        aria-label="ปิด"
      >
        <X className="h-4 w-4 opacity-60" />
      </button>
    </div>
  )
}

export default Toaster

