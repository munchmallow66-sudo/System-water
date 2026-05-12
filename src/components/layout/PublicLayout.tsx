"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Droplets, Moon, Sun, Phone, Mail, MapPin } from "lucide-react";

export interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md">
              <Droplets className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                ระบบจัดการน้ำ
              </span>
              <span className="text-xs text-slate-500 hidden sm:block dark:text-slate-400">
                หมู่บ้านเชียงเครือ
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
            >
              ค้นหาข้อมูล
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
            >
              ติดต่อเรา
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span className="sr-only">สลับธีม</span>
              </button>
            )}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700 hover:shadow-md"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-white">
                  <Droplets className="size-5" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">ระบบจัดการน้ำ</span>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                ระบบจัดการน้ำประปาหมู่บ้าน สำหรับการบริหารจัดการข้อมูลการใช้น้ำ
                การเก็บเงิน และการดูแลสมาชิก
              </p>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ติดต่อเรา</h3>
              <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>164 หมู่ 1 บ.เชียงเครือ ต.เชียงเครือ อ.เมือง จ.กาฬสินธุ์ 46000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <span>098-042-0324</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>watchara47114145@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ลิงก์ที่เกี่ยวข้อง</h3>
              <nav className="flex flex-col gap-2 text-sm">
                <Link href="/search" className="text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">
                  ค้นหาข้อมูลการใช้น้ำ
                </Link>
                <Link href="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">
                  นโยบายความเป็นส่วนตัว
                </Link>
                <Link href="/terms" className="text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">
                  ข้อกำหนดการใช้งาน
                </Link>
              </nav>
            </div>
          </div>

          <div className="my-8 h-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-slate-500 md:text-left dark:text-slate-400">
              © {new Date().getFullYear()} ระบบจัดการน้ำหมู่บ้าน สงวนลิขสิทธิ์
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>พัฒนาโดย</span>
              <span className="font-medium text-slate-900 dark:text-white">Watchara Phonchai</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;


