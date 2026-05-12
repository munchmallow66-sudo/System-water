"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface WaterRateData {
    id: string;
    name: string;
    minUnits: number;
    maxUnits: number;
    ratePerUnit: number;
    isActive: boolean;
}

interface SettingsContextType {
    waterRates: WaterRateData[];
    isLoading: boolean;
    refreshRates: () => Promise<void>;
    calculateWaterBill: (usage: number) => number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [waterRates, setWaterRates] = useState<WaterRateData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRates = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/settings/water-rates");
            if (res.ok) {
                const data = await res.json();
                setWaterRates(data.data?.filter((r: any) => r.isActive) || []);
            }
        } catch (error) {
            console.error("Failed to fetch water rates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    useEffect(() => {
        const handleRatesUpdated = () => {
            void fetchRates();
        };

        window.addEventListener("water-rates-updated", handleRatesUpdated);
        window.addEventListener("focus", handleRatesUpdated);

        return () => {
            window.removeEventListener("water-rates-updated", handleRatesUpdated);
            window.removeEventListener("focus", handleRatesUpdated);
        };
    }, []);

    const calculateWaterBill = (usage: number): number => {
        if (!waterRates.length) return usage * 3; // Fallback

        let total = 0;

        const sortedRates = [...waterRates].sort((a, b) => a.minUnits - b.minUnits);

        for (const tier of sortedRates) {
            if (usage <= tier.minUnits) continue;

            const tierMax = tier.maxUnits === 999999 ? Infinity : tier.maxUnits;

            const tierUsage = tierMax === Infinity
                ? usage - tier.minUnits
                : Math.min(usage - tier.minUnits, tier.maxUnits - tier.minUnits);

            if (tierUsage > 0) {
                total += tierUsage * tier.ratePerUnit;
            }

            if (tierMax !== Infinity && usage <= tier.maxUnits) break;
        }

        return Math.round(total * 100) / 100;
    };

    return (
        <SettingsContext.Provider value={{ waterRates, isLoading, refreshRates: fetchRates, calculateWaterBill }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
