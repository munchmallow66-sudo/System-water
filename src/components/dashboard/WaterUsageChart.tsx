"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MonthlyData {
  month: string;
  usage: number;
  amount: number;
}

export interface WaterUsageChartProps {
  data: MonthlyData[];
  title?: string;
  description?: string;
  showAmount?: boolean;
  className?: string;
  height?: number;
}

const defaultData: MonthlyData[] = [
  { month: "ม.ค.", usage: 120, amount: 360 },
  { month: "ก.พ.", usage: 145, amount: 435 },
  { month: "มี.ค.", usage: 180, amount: 540 },
  { month: "เม.ย.", usage: 220, amount: 660 },
  { month: "พ.ค.", usage: 195, amount: 585 },
  { month: "มิ.ย.", usage: 160, amount: 480 },
];

export function WaterUsageChart({
  data = defaultData,
  title = "กราฟการใช้น้ำ 6 เดือนล่าสุด",
  description = "แสดงปริมาณการใช้น้ำรายเดือน",
  showAmount = true,
  className,
  height = 300,
}: WaterUsageChartProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className || ""}`}>
      <div className="px-6 pt-5 pb-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="px-6 pb-4">
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(186, 100%, 37%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(186, 100%, 37%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "usage") return [`${value} หน่วย`, "ปริมาณ"];
                  return [`${value} บาท`, "จำนวนเงิน"];
                }}
              />
              <Area
                type="monotone"
                dataKey="usage"
                stroke="hsl(186, 100%, 37%)"
                strokeWidth={2}
                fill="url(#usageGradient)"
                dot={{ fill: "hsl(186, 100%, 37%)", stroke: "white", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(186, 100%, 37%)", strokeWidth: 2, fill: "white" }}
              />
              {showAmount && (
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  fill="url(#amountGradient)"
                  dot={{ fill: "hsl(217, 91%, 60%)", stroke: "white", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(217, 91%, 60%)", strokeWidth: 2, fill: "white" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default WaterUsageChart;
