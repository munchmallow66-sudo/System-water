"use client";

import * as React from "react";
import { MoreVertical, Edit, Trash2, Droplets } from "lucide-react";

export type PaymentStatus = "paid" | "pending" | "overdue";

export interface HouseCardProps {
  id: string;
  houseNumber: string;
  ownerName: string;
  imageUrl?: string;
  latestReading?: {
    date: string;
    units: number;
  };
  paymentStatus?: PaymentStatus;
  outstandingBalance?: number;
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

const paymentStatusConfig = {
  paid: { label: "ชำระแล้ว", className: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400" },
  pending: { label: "รอชำระ", className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  overdue: { label: "ค้างชำระ", className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" },
};

export function HouseCard({
  id,
  houseNumber,
  ownerName,
  imageUrl,
  latestReading,
  paymentStatus = "pending",
  outstandingBalance = 0,
  showActions = true,
  onEdit,
  onDelete,
  onClick,
  className,
}: HouseCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const statusConfig = paymentStatusConfig[paymentStatus];

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      className={`
        group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200
        bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-800
        hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md
        ${onClick ? "cursor-pointer" : ""}
        ${className || ""}
      `}
      onClick={() => onClick?.(id)}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-full border shadow-sm ${imageUrl ? "border-slate-200 dark:border-slate-800" : "border-transparent"}`}>
              {imageUrl ? (
                <img src={imageUrl} alt={ownerName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {houseNumber.substring(0, 3)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold tracking-tight text-slate-900 truncate flex items-center gap-2 dark:text-slate-50">
                บ้านเลขที่ {houseNumber}
              </h3>
              <p className="text-sm text-slate-500 truncate mt-0.5 dark:text-slate-400">
                {ownerName}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="h-8 w-8 -m-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 sm:opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 dark:hover:text-slate-100"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(id); setMenuOpen(false); }}
                  >
                    <Edit className="h-4 w-4" />แก้ไข
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(id); setMenuOpen(false); }}
                  >
                    <Trash2 className="h-4 w-4" />ลบข้อมูล
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-0 space-y-2.5 flex-1">
        {latestReading && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
            <Droplets className="h-4 w-4 shrink-0 text-sky-500" />
            <span>
              มิเตอร์ล่าสุด: <span className="font-medium text-slate-900 dark:text-slate-200">{Math.floor(latestReading.units).toString().padStart(4, '0')}</span> หน่วย
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between mt-auto">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
        {outstandingBalance > 0 && (
          <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            ฿{outstandingBalance.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default HouseCard;


