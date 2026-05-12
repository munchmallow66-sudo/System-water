import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-lg dark:border-slate-800 dark:bg-slate-950">
                <div className="space-y-4 px-6 pt-8 pb-4">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                        <FileQuestion className="h-10 w-10 text-slate-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">404</h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                        ไม่พบหน้าที่คุณต้องการ
                    </p>
                </div>
                <div className="px-6">
                    <p className="text-slate-500 dark:text-slate-400">
                        หน้าที่คุณพยายามเข้าถึงอาจถูกลบ ย้าย หรือไม่มีอยู่จริงในระบบ
                    </p>
                </div>
                <div className="flex justify-center px-6 py-6">
                    <Link
                        href="/"
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700 hover:shadow-md"
                    >
                        กลับสู่หน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    )
}


