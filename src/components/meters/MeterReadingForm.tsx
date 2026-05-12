"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  Droplets,
  Search,
  Waves,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const meterReadingSchema = z
  .object({
    houseId: z.string().min(1, "กรุณาเลือกบ้าน"),
    readingDate: z.string().min(1, "กรุณาเลือกวันที่จด"),
    previousReading: z.number().min(0, "ค่ามิเตอร์ก่อนหน้าต้องไม่ติดลบ"),
    currentReading: z.number().min(0, "ค่ามิเตอร์ปัจจุบันต้องไม่ติดลบ"),
    notes: z.string().max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร").optional(),
  })
  .refine((data) => data.currentReading >= data.previousReading, {
    message: "ค่ามิเตอร์ปัจจุบันต้องมากกว่าหรือเท่ากับค่าก่อนหน้า",
    path: ["currentReading"],
  });

export type MeterReadingFormData = z.infer<typeof meterReadingSchema>;

export interface HouseInfo {
  id: string;
  houseNumber: string;
  ownerName: string;
  previousReading: number;
  previousDate: string;
}

export interface MeterReadingFormProps {
  houses: HouseInfo[];
  anomalyThreshold?: number;
  initialHouseId?: string;
  onSubmit: (data: MeterReadingFormData & { usage: number; amount: number }, image?: File | null) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const formatNumber = (value: number) => {
  const num = Math.floor(value);
  return num.toString().padStart(4, "0");
};
const formatCurrency = (value: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(value);

export function MeterReadingForm({ houses, anomalyThreshold = 50, initialHouseId, onSubmit, onCancel, isSubmitting = false, className }: MeterReadingFormProps) {
  const { calculateWaterBill, waterRates } = useSettings();
  const [selectedHouse, setSelectedHouse] = React.useState<HouseInfo | null>(null);
  const [showAnomalyWarning, setShowAnomalyWarning] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchRef = React.useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<MeterReadingFormData>({
    resolver: zodResolver(meterReadingSchema),
    defaultValues: {
      houseId: initialHouseId || "",
      readingDate: new Date().toISOString().split("T")[0],
      previousReading: 0,
      currentReading: 0,
      notes: "",
    },
  });

  const watchedHouseId = useWatch({ control, name: "houseId" });
  const watchedCurrentReading = useWatch({ control, name: "currentReading" });
  const watchedPreviousReading = useWatch({ control, name: "previousReading" });

  // Close search on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => {
    if (initialHouseId) setValue("houseId", initialHouseId, { shouldValidate: true });
  }, [initialHouseId, setValue]);

  React.useEffect(() => {
    const house = houses.find((h) => h.id === watchedHouseId);
    if (house) {
      setSelectedHouse(house);
      setValue("previousReading", house.previousReading, { shouldValidate: true });
    } else {
      setSelectedHouse(null);
      setValue("previousReading", 0, { shouldValidate: true });
    }
  }, [houses, watchedHouseId, setValue]);

  const usage = React.useMemo(() => Math.max(0, (watchedCurrentReading || 0) - (watchedPreviousReading || 0)), [watchedCurrentReading, watchedPreviousReading]);
  const amount = React.useMemo(() => calculateWaterBill(usage), [calculateWaterBill, usage]);

  React.useEffect(() => {
    if (!selectedHouse || usage <= 0) { setShowAnomalyWarning(false); return; }
    const baseline = Math.max(selectedHouse.previousReading || 0, 10);
    const pct = ((usage - baseline) / baseline) * 100;
    setShowAnomalyWarning(pct > anomalyThreshold);
  }, [anomalyThreshold, selectedHouse, usage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) { alert("กรุณาเลือกไฟล์รูปภาพ"); return; }
      if (file.size > 5 * 1024 * 1024) { alert("ขนาดไฟล์ต้องไม่เกิน 5 MB"); return; }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFormSubmit = async (data: MeterReadingFormData) => {
    await onSubmit({ ...data, usage, amount }, imageFile);
  };

  const filteredHouses = houses.filter((h) => {
    const q = searchQuery.toLowerCase();
    return !q || h.houseNumber.toLowerCase().includes(q) || h.ownerName.toLowerCase().includes(q);
  });

  const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  return (
    <div className={`${className || ""}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Droplets className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">แบบฟอร์มจดมิเตอร์</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">ตรวจสอบค่าก่อนหน้า กรอกค่าปัจจุบัน และยืนยันยอดโดยประมาณ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="space-y-6">
          {/* House selector */}
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">บ้าน</label>
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className={`${inputClass} text-left flex items-center justify-between`}
            >
              <span className={selectedHouse ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                {selectedHouse ? `บ้าน ${selectedHouse.houseNumber} - ${selectedHouse.ownerName}` : "ค้นหาเลขที่บ้านหรือชื่อเจ้าของ"}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {errors.houseId && <p className="text-xs text-rose-600 mt-1 dark:text-rose-400">{errors.houseId.message}</p>}

            {searchOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาเลขที่บ้านหรือเจ้าของ..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto py-1">
                  {filteredHouses.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">ไม่พบบ้านที่ตรงกัน</p>
                  ) : (
                    filteredHouses.map((house) => (
                      <button
                        key={house.id}
                        type="button"
                        onClick={() => {
                          setValue("houseId", house.id, { shouldValidate: true });
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className={`flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${house.id === watchedHouseId ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-white">บ้าน {house.houseNumber} - {house.ownerName}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date + Previous */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">วันที่จดมิเตอร์</label>
              <input type="date" {...register("readingDate")} className={inputClass} />
              {errors.readingDate && <p className="text-xs text-rose-600 mt-1 dark:text-rose-400">{errors.readingDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">ค่ามิเตอร์ก่อนหน้า</label>
              <input type="number" {...register("previousReading", { valueAsNumber: true })} disabled className={`${inputClass} bg-slate-50 dark:bg-slate-900`} />
            </div>
          </div>

          {/* Current reading */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">ค่ามิเตอร์ปัจจุบัน</label>
            <input type="number" placeholder="กรอกค่ามิเตอร์ปัจจุบัน" {...register("currentReading", { valueAsNumber: true })} className={inputClass} />
            {errors.currentReading && <p className="text-xs text-rose-600 mt-1 dark:text-rose-400">{errors.currentReading.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">หมายเหตุ</label>
            <textarea {...register("notes")} placeholder="หมายเหตุ เช่น มิเตอร์ชำรุด, เข้าถึงไม่ได้" rows={3} className={`${inputClass} min-h-[70px]`} />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">รูปภาพมิเตอร์ (ถ้ามี)</label>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-2xl border border-slate-200 dark:border-slate-800" />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors dark:border-slate-800 dark:hover:border-blue-500 dark:hover:text-blue-400">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">อัพโหลดรูป</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <div className="text-sm text-slate-500 space-y-1 dark:text-slate-400 pt-1">
                <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> รองรับ JPG, PNG</p>
                <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> ขนาดไม่เกิน 5 MB</p>
              </div>
            </div>
          </div>

          {/* Info panels */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* Selected house info */}
            <div className="rounded-[28px] border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-5 shadow-sm dark:border-slate-800 dark:from-sky-950/30 dark:to-slate-950">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"><Waves className="h-4 w-4" /></div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">บ้านที่เลือก</p>
              </div>
              {selectedHouse ? (
                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">บ้าน {selectedHouse.houseNumber}</p>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{selectedHouse.ownerName}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-xs uppercase tracking-wider text-slate-500">เลขมิเตอร์ล่าสุด</p>
                      <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-950 dark:text-white">{selectedHouse.previousReading}</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-xs uppercase tracking-wider text-slate-500">วันที่จดล่าสุด</p>
                      <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{selectedHouse.previousDate}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  เลือกบ้านเพื่อแสดงข้อมูลสรุป
                </div>
              )}
            </div>

            {/* Anomaly Warning */}
            {showAnomalyWarning && (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
                <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />อาจพบความผิดปกติ</div>
                <p className="mt-1 text-sm">ปริมาณการใช้น้ำครั้งนี้สูงกว่าปกติ กรุณาตรวจสอบค่ามิเตอร์อีกครั้ง</p>
              </div>
            )}

            {/* Usage summary */}
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-white shadow-lg dark:border-slate-800 xl:self-start">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-sky-300" /><span className="font-semibold">สรุปการใช้น้ำ</span></div>
                {waterRates.length > 1 && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-200">tiered rate</span>}
              </div>
              <div className="mt-4 grid gap-3 grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">ใช้น้ำ</p>
                  <p className="mt-2 text-2xl font-semibold">{formatNumber(usage)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">รูปแบบ</p>
                  <p className="mt-2 text-2xl font-semibold">{waterRates.length > 1 ? "ขั้นบันได" : "อัตราเดียว"}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-sky-400/10 bg-sky-400/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">ประมาณการ</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{formatCurrency(amount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              ยกเลิก
            </button>
          )}
          <button type="submit" disabled={isSubmitting || !selectedHouse} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกค่ามิเตอร์"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MeterReadingForm;


