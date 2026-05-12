"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Home,
  Droplets,
  FileText,
  Gauge,
  Wallet,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

// Types
export type UserRole = "ADMIN" | "STAFF";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roles: UserRole[];
}

// Navigation items based on roles
const navItems: NavItem[] = [
  {
    title: "หน้าหลัก",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "บ้าน/สมาชิก",
    href: "/dashboard/houses",
    icon: Home,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "มิเตอร์น้ำ",
    href: "/dashboard/meters",
    icon: Gauge,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "ใบแจ้งหนี้",
    href: "/dashboard/bills",
    icon: FileText,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "การชำระเงิน",
    href: "/dashboard/payments",
    icon: Wallet,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "จัดการผู้ใช้",
    href: "/dashboard/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "ตั้งค่า",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login");
      }
    };

    fetchUser();
  }, [router]);

  // Close user menu on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const filteredNavItems = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  // Loading state
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 dark:text-slate-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64" : "w-[68px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md">
              <Droplets className="h-4 w-4" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  ระบบจัดการน้ำ
                </span>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  หมู่บ้าน
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sidebarOpen && (
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              เมนูหลัก
            </p>
          )}
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 shadow-sm dark:from-blue-950/40 dark:to-sky-950/40 dark:text-blue-300"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                      }
                      ${!sidebarOpen ? "justify-center px-2" : ""}
                    `}
                    title={item.title}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                      }`}
                    />
                    {sidebarOpen && <span className="truncate">{item.title}</span>}
                    {sidebarOpen && item.badge && (
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer – User menu */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800" ref={userMenuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`
                flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors
                hover:bg-slate-100 dark:hover:bg-slate-900
                ${!sidebarOpen ? "justify-center" : ""}
              `}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-sm font-semibold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "พนักงาน"}
                  </span>
                </div>
              )}
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {mounted && theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {mounted && theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="mt-4 px-3 text-[10px] text-slate-400 dark:text-slate-600 text-center">
              พัฒนาโดย Watchara Phonchai
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
          {/* Mobile toggle */}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop sidebar collapse */}
          <button
            type="button"
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:flex dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200 ${!sidebarOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" />

          <div className="flex-1" />

          {/* Theme Toggle */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;


