"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: {
    value: number;
    direction?: TrendDirection;
    isPositive?: boolean;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, description, trend, className, onClick }: StatsCardProps) {
  const getTrendDirection = (): TrendDirection => {
    if (!trend) return "neutral";
    if (trend.direction) return trend.direction;
    if (trend.isPositive !== undefined) return trend.isPositive ? "up" : "down";
    return "neutral";
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    const direction = getTrendDirection();
    switch (direction) {
      case "up": return <TrendingUp className="h-4 w-4" />;
      case "down": return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-slate-500";
    const direction = getTrendDirection();
    switch (direction) {
      case "up": return "text-green-600 dark:text-green-400";
      case "down": return "text-red-600 dark:text-red-400";
      default: return "text-slate-500";
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm transition-all duration-300
        hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-200
        dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800
        ${onClick ? "cursor-pointer" : ""}
        ${className || ""}
      `}
      onClick={onClick}
    >
      <div className="flex flex-row items-center justify-between space-y-0 px-6 pt-5 pb-2">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {Icon && (
          <div className="rounded-md p-2 bg-gradient-to-br from-blue-500/10 to-sky-500/10 transition-all duration-300">
            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
      <div className="px-6 pb-5">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span className={`flex items-center gap-1 font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                {Math.abs(trend.value)}%
              </span>
            )}
            {trend?.label && <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>}
            {description && !trend && <span className="text-slate-500 dark:text-slate-400">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsCard;


