"use client";

import * as React from "react";
import {
  Home,
  User,
  Droplets,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MeterHistory {
  period: string;
  previousReading: number;
  currentReading: number;
  usage: number;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

export interface SearchResultData {
  houseNumber: string;
  ownerName: string;
  meterHistory: MeterHistory[];
  outstandingBalance: number;
  lastReadingDate: string;
}

export interface SearchResultProps {
  data: SearchResultData;
  className?: string;
}

const statusConfig = {
  paid: { label: "ชำระแล้ว", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  pending: { label: "รอชำระ", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  overdue: { label: "ค้างชำระ", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function SearchResult({ data, className }: SearchResultProps) {
  const totalUsage = data.meterHistory.reduce((sum, h) => sum + h.usage, 0);
  const totalAmount = data.meterHistory.reduce((sum, h) => sum + h.amount, 0);
  const avgUsage = data.meterHistory.length ? totalUsage / data.meterHistory.length : 0;

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Read Only Warning */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <Eye className="h-5 w-5 text-amber-600" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          โหมดดูเท่านั้น - ข้อมูลนี้ไม่สามารถแก้ไขได้
        </span>
      </div>

      {/* House Information */}
      <div className="overflow-hidden rounded-2xl border-2 border-blue-100 bg-white dark:border-blue-900 dark:bg-slate-950">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-6 py-4 dark:from-blue-950/30 dark:to-sky-950/30">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Home className="h-5 w-5 text-blue-600" />ข้อมูลบ้าน
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><p className="text-sm text-slate-500 dark:text-slate-400">เลขที่บ้าน</p><p className="text-lg font-semibold text-slate-900 dark:text-white">{data.houseNumber}</p></div>
            <div><p className="text-sm text-slate-500 dark:text-slate-400">ชื่อเจ้าของบ้าน</p><p className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white"><User className="h-4 w-4 text-blue-500" />{data.ownerName}</p></div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "การใช้น้ำรวม (6 เดือน)", value: `${totalUsage.toLocaleString()} หน่วย`, icon: Droplets, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "เฉลี่ย/เดือน", value: `${avgUsage.toFixed(0)} หน่วย`, icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-900/30" },
          { label: "ยอดชำระรวม", value: `฿${totalAmount.toLocaleString()}`, icon: Calendar, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
          { label: "ยอดค้างชำระ", value: `฿${data.outstandingBalance.toLocaleString()}`, icon: AlertCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Chart */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="px-6 pt-5 pb-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">กราฟการใช้น้ำ 6 เดือนล่าสุด</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">แสดงปริมาณการใช้น้ำรายเดือน</p>
        </div>
        <div className="px-6 pb-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.meterHistory.map((h) => ({ period: h.period, usage: h.usage, amount: h.amount }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageGradientSearch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(186, 100%, 37%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(186, 100%, 37%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                  formatter={(value: number) => [`${value} หน่วย`, "การใช้น้ำ"]}
                />
                <Area type="monotone" dataKey="usage" stroke="hsl(186, 100%, 37%)" strokeWidth={2} fill="url(#usageGradientSearch)" dot={{ fill: "hsl(186, 100%, 37%)", stroke: "white", strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Meter History Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="px-6 pt-5 pb-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">ประวัติการใช้น้ำ</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">รายละเอียดการอ่านมิเตอร์ 6 เดือนล่าสุด</p>
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-xl border border-slate-200 overflow-x-auto dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">งวด</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">มิเตอร์ก่อน</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">มิเตอร์ปัจจุบัน</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">ใช้ (หน่วย)</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.meterHistory.map((history, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{history.period}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{history.previousReading.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{history.currentReading.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{history.usage.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">฿{history.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[history.status].className}`}>
                        {statusConfig[history.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Last Reading Info */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Clock className="h-4 w-4" />
        <span>อัปเดตล่าสุด: {data.lastReadingDate}</span>
      </div>
    </div>
  );
}

export default SearchResult;


