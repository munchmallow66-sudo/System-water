"use client";

import * as React from "react";
import { Search, Loader2, Home, Info, AlertTriangle } from "lucide-react";

export interface PublicSearchFormProps {
  onSearch: (houseNumber: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function PublicSearchForm({ onSearch, isLoading = false, className }: PublicSearchFormProps) {
  const [houseNumber, setHouseNumber] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber.trim()) {
      setError("กรุณาระบุเลขที่บ้าน");
      return;
    }
    setError(null);
    await onSearch(houseNumber.trim());
  };

  return (
    <div className={`overflow-hidden rounded-2xl border-2 border-blue-100 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-950 ${className || ""}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-6 py-5 dark:from-blue-950/30 dark:to-sky-950/30">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md">
            <Search className="h-5 w-5" />
          </div>
          ค้นหาข้อมูลการใช้น้ำ
        </h3>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          กรอกเลขที่บ้านเพื่อตรวจสอบประวัติการใช้น้ำ
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="เลขที่บ้าน (เช่น 123/45)"
                value={houseNumber}
                onChange={(e) => { setHouseNumber(e.target.value); setError(null); }}
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-lg outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-8 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700 hover:shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />กำลังค้นหา...</span>
              ) : (
                <span className="flex items-center gap-2"><Search className="h-5 w-5" />ค้นหา</span>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {error}
              </p>
            </div>
          )}
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-medium text-slate-700 mb-2 flex items-center gap-2 dark:text-slate-300">
            <Info className="h-5 w-5 text-blue-500" />
            หมายเหตุ:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>ข้อมูลแสดงเฉพาะประวัติ 6 เดือนล่าสุด</li>
            <li>ไม่แสดงข้อมูลส่วนบุคคลอื่นๆ</li>
            <li>เพื่อความปลอดภัย ไม่สามารถแก้ไขข้อมูลได้</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PublicSearchForm;


