"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, CheckCircle } from "lucide-react";

const paymentFormSchema = z.object({
  billId: z.string().min(1, "กรุณาเลือกใบแจ้งหนี้"),
  amount: z.number().min(1, "จำนวนเงินต้องมากกว่า 0"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "PROMPTPAY"]),
  paymentDate: z.string().min(1, "กรุณาระบุวันที่ชำระ"),
  notes: z.string().max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร").optional(),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;

export interface BillInfo {
  id: string;
  billNumber: string;
  houseNumber: string;
  ownerName: string;
  period: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface PaymentFormProps {
  bill?: BillInfo;
  billId?: string;
  onSubmit: (data: any, slip?: File | null) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const paymentMethods = [
  { value: "CASH", label: "เงินสด", description: "รับเงินสดโดยตรง" },
  { value: "TRANSFER", label: "โอนเงิน", description: "โอนผ่านธนาคาร" },
  { value: "PROMPTPAY", label: "พร้อมเพย์", description: "ชำระผ่าน PromptPay" },
];

export function PaymentForm({ bill, billId, onSubmit, onCancel, isSubmitting = false, className }: PaymentFormProps) {
  const [showSuccess, setShowSuccess] = React.useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      billId: bill?.id || billId || "",
      amount: bill?.amount || 0,
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const selectedMethod = watch("paymentMethod");

  React.useEffect(() => {
    if (bill?.id || billId) setValue("billId", bill?.id || billId || "", { shouldValidate: true });
    if (bill?.amount) setValue("amount", bill.amount);
  }, [bill, billId, setValue]);

  const onFormSubmit = async (data: PaymentFormData) => {
    await onSubmit(data, null);
    setShowSuccess(true);
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500";

  if (showSuccess) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 ${className || ""}`}>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-sky-600" />
            <h4 className="font-semibold text-sky-800 dark:text-sky-300">บันทึกการชำระเงินสำเร็จ</h4>
          </div>
          <p className="mt-1 text-sm text-sky-700 dark:text-sky-400">สถานะของใบแจ้งหนี้ถูกอัปเดตแล้ว</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CreditCard className="h-5 w-5 text-blue-500" />บันทึกการชำระเงิน
          </h3>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            {bill ? `สำหรับใบแจ้งหนี้ ${bill.billNumber}` : billId ? "รับชำระจากใบแจ้งหนี้ที่เลือกไว้แล้ว" : "กรุณาเปิดจากหน้าบิลเพื่อระบุใบแจ้งหนี้ที่จะรับชำระ"}
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      {/* Bill info */}
      {bill && (
        <div className="px-6 pt-6 pb-0">
          <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">ใบแจ้งหนี้</span><span className="font-medium text-slate-900 dark:text-white">{bill.billNumber}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">บ้านเลขที่</span><span className="font-medium text-slate-900 dark:text-white">{bill.houseNumber}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">งวด</span><span className="font-medium text-slate-900 dark:text-white">{bill.period}</span></div>
            <div className="flex items-center justify-between text-lg"><span className="font-semibold text-slate-900 dark:text-white">ยอดที่ต้องชำระ</span><span className="font-bold text-blue-600">{bill.amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="space-y-6 p-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">จำนวนเงิน (บาท) *</label>
            <input type="number" placeholder="จำนวนเงิน" {...register("amount", { valueAsNumber: true })} className={inputClass} />
            {errors.amount && <p className="text-xs text-rose-600 mt-1 dark:text-rose-400">{errors.amount.message}</p>}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 dark:text-slate-300">วิธีการชำระ *</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`
                    flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 p-4 transition-all
                    ${selectedMethod === method.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                    }
                  `}
                >
                  <input type="radio" value={method.value} {...register("paymentMethod")} className="sr-only" />
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{method.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{method.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">วันที่ชำระ *</label>
            <input type="date" {...register("paymentDate")} className={inputClass} />
            {errors.paymentDate && <p className="text-xs text-rose-600 mt-1 dark:text-rose-400">{errors.paymentDate.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">หมายเหตุ</label>
            <input placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" {...register("notes")} className={inputClass} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !(bill?.id || billId)}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700 disabled:opacity-50"
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการชำระเงิน"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PaymentForm;


