'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application Error:', error)
    }, [error])

    return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-lg dark:border-red-900 dark:bg-slate-950">
                <div className="text-center space-y-4 px-6 pt-8 pb-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">เกิดข้อผิดพลาดบางอย่าง</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        ระบบพบปัญหาในการเรนเดอร์ข้อมูล โปรดลองใหม่อีกครั้ง
                    </p>
                </div>
                <div className="px-6 text-center">
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl overflow-auto max-h-32 text-left dark:bg-slate-900 dark:text-slate-400">
                        {error.message || 'Unknown error occurred'}
                    </p>
                </div>
                <div className="flex justify-center gap-4 px-6 py-6">
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        รีเฟรชหน้าเว็บ
                    </button>
                    <button
                        onClick={() => reset()}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700"
                    >
                        ลองใหม่
                    </button>
                </div>
            </div>
        </div>
    )
}


