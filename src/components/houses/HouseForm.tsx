"use client";

import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Image as ImageIcon, Loader2, Check } from "lucide-react";

// Form validation schema
const houseFormSchema = z.object({
  houseNumber: z.string().min(1, "กรุณาระบุเลขที่บ้าน").max(20, "เลขที่บ้านต้องไม่เกิน 20 ตัวอักษร"),
  ownerName: z.string().min(1, "กรุณาระบุชื่อเจ้าของบ้าน").max(100, "ชื่อเจ้าของบ้านต้องไม่เกิน 100 ตัวอักษร"),
  initialReading: z.coerce.number().min(0, "ค่ามิเตอร์ต้องไม่ติดลบ"),
  isActive: z.union([z.boolean(), z.string()]).transform(val => val === true || val === "true"),
});

// Use z.input for the form type (pre-transform) and z.output for submit data (post-transform)
type HouseFormInput = z.input<typeof houseFormSchema>;
type HouseFormOutput = z.output<typeof houseFormSchema>;

export type HouseFormData = HouseFormOutput;

export interface HouseFormProps {
  defaultValues?: Partial<HouseFormData & { imageUrl?: string }>;
  onSubmit: (data: HouseFormData, image?: File | null) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  isSubmitting?: boolean;
  className?: string;
}

export function HouseForm({ defaultValues, onSubmit, onCancel, isEditing = false, isSubmitting = false, className }: HouseFormProps) {
  const [imagePreview, setImagePreview] = React.useState<string | null>(defaultValues?.imageUrl || null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HouseFormInput, unknown, HouseFormOutput>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: {
      houseNumber: defaultValues?.houseNumber || "",
      ownerName: defaultValues?.ownerName || "",
      initialReading: defaultValues?.initialReading ?? 0,
      isActive: defaultValues?.isActive !== undefined ? defaultValues.isActive : true,
    },
  });

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

  const onFormSubmit: SubmitHandler<HouseFormOutput> = async (data) => {
    await onSubmit(data, imageFile);
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300";
  const errorClass = "text-xs text-rose-600 mt-1 dark:text-rose-400";

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className || ""}`}>
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{isEditing ? "แก้ไขข้อมูลบ้าน" : "เพิ่มบ้านใหม่"}</h3>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{isEditing ? "แก้ไขข้อมูลบ้านและเจ้าของบ้าน" : "กรอกข้อมูลบ้านและเจ้าของบ้านใหม่"}</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="space-y-6 p-6">
          {/* Image Upload */}
          <div>
            <label className={labelClass}>รูปภาพบ้าน</label>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors dark:border-slate-600 dark:hover:border-blue-500 dark:hover:text-blue-400">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">อัพโหลดรูป</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <div className="text-sm text-slate-500 space-y-1 dark:text-slate-400">
                <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />รองรับไฟล์ JPG, PNG, GIF</p>
                <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />ขนาดไฟล์ไม่เกิน 5 MB</p>
                <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />แนะนำขนาด 800x600 พิกเซล</p>
              </div>
            </div>
          </div>

          {/* House Number & Owner Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>เลขที่บ้าน *</label>
              <input {...register("houseNumber")} placeholder="เช่น 123/45" className={inputClass} />
              {errors.houseNumber && <p className={errorClass}>{errors.houseNumber.message}</p>}
            </div>
            <div>
              <label className={labelClass}>ชื่อเจ้าของบ้าน *</label>
              <input {...register("ownerName")} placeholder="ชื่อ-นามสกุล" className={inputClass} />
              {errors.ownerName && <p className={errorClass}>{errors.ownerName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>เลขมิเตอร์ตั้งต้น (เริ่มจดที่)</label>
              <input type="number" step="0.01" {...register("initialReading")} placeholder="0.00" className={inputClass} />
              {errors.initialReading && <p className={errorClass}>{errors.initialReading.message}</p>}
            </div>
            <div>
              <label className={labelClass}>สถานะ</label>
              <select {...register("isActive")} className={inputClass}>
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              ยกเลิก
            </button>
          )}
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700 disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />กำลังบันทึก...</span>
            ) : isEditing ? "บันทึกการแก้ไข" : "เพิ่มบ้าน"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default HouseForm;
