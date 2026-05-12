'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Wallet,
  X,
  FileText,
  User,
  MapPin,
  CheckCircle,
  Download,
  Printer
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PaymentForm, type PaymentFormData } from '@/components/payments/PaymentForm'
import { useToast } from '@/hooks/use-toast'

interface Payment {
  id: string
  billId: string
  billNumber: string
  billTotal: number
  houseId: string
  houseNumber: string
  ownerName: string
  address?: string
  amount: number
  paymentMethod: string
  receiptNumber: string
  slipUrl?: string
  notes?: string
  paymentDate: string
  createdAt: string
  collector?: { id?: string; name?: string }
  previousReading?: number
  currentReading?: number
  usage?: number
}

interface PaymentSummary {
  totalAmount: number
  todayAmount: number
  todayCount: number
}

interface SelectedBill {
  id: string
  billNumber: string
  houseNumber: string
  ownerName: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  dueDate: string
  outstandingAmount: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(value)

const formatThaiDate = (value?: string, pattern = 'dd MMM yyyy') => {
  if (!value) return '-'
  return format(new Date(value), pattern, { locale: th })
}

export default function PaymentsPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentSummary>({ totalAmount: 0, todayAmount: 0, todayCount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null)
  const [selectedBill, setSelectedBill] = useState<SelectedBill | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const billId = params.get('billId')
    const houseId = params.get('houseId')

    if (billId) {
      setSelectedBillId(billId)
      setIsFormOpen(true)
    }

    if (houseId) {
      setSelectedHouseId(houseId)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPayments()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchQuery, selectedBillId, selectedHouseId])

  useEffect(() => {
    if (!selectedBillId) {
      setSelectedBill(null)
      return
    }

    void fetchSelectedBill(selectedBillId)
  }, [selectedBillId])

  const fetchSelectedBill = async (billId: string) => {
    try {
      const response = await fetch(`/api/bills/${billId}`)
      if (!response.ok) throw new Error('ไม่สามารถโหลดรายละเอียดบิลได้')

      const data = await response.json()
      setSelectedBill(data.data || null)
    } catch (error) {
      console.error('Failed to fetch selected bill:', error)
      setSelectedBill(null)
      toast({
        title: 'โหลดรายละเอียดบิลไม่สำเร็จ',
        description: 'ไม่สามารถแสดงชื่อและยอดที่ต้องชำระจากหน้าบิลได้',
        variant: 'destructive',
      })
    }
  }

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200', sortBy: 'paymentDate', sortOrder: 'desc' })
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (selectedBillId) params.set('billId', selectedBillId)
      if (selectedHouseId) params.set('houseId', selectedHouseId)

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลการชำระเงินได้')

      const data = await response.json()
      setPayments(data.data || [])
      setSummary(data.summary || { totalAmount: 0, todayAmount: 0, todayCount: 0 })
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      toast({
        title: 'โหลดข้อมูลการชำระเงินไม่สำเร็จ',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: data.billId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'ไม่สามารถบันทึกการชำระเงินได้')
      }

      setIsFormOpen(false)
      setSelectedBillId(null)
      await fetchPayments()
      toast({
        title: 'บันทึกการชำระเงินแล้ว',
        description: `ใบเสร็จ ${result?.data?.receiptNumber || 'ถูกสร้างเรียบร้อยแล้ว'}`,
      })
    } catch (error) {
      console.error('Failed to save payment:', error)
      toast({
        title: 'บันทึกการชำระเงินไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาตรวจสอบข้อมูลและลองอีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const uniqueHouses = useMemo(() => new Set(payments.map((payment) => payment.houseId)).size, [payments])
  const averageAmount = payments.length ? summary.totalAmount / payments.length : 0
  const latestPayment = payments[0]

  const paymentMethodStats = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [payments])

  const topMethod = Object.entries(paymentMethodStats).sort((left, right) => right[1] - left[1])[0]?.[0]

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'เงินสด'
      case 'TRANSFER':
        return 'โอนเงิน'
      case 'PROMPTPAY':
        return 'พร้อมเพย์'
      default:
        return method || '-'
    }
  }

  const handlePrintReceipt = (payment: Payment) => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) {
      toast({ title: 'เปิดหน้าพิมพ์ไม่สำเร็จ', description: 'กรุณาอนุญาต popup ของเบราว์เซอร์ก่อน', variant: 'destructive' })
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>ใบเสร็จรับเงิน ${payment.receiptNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; margin: 0; color: #0f172a; }
            .receipt-no { color: #2563eb; font-weight: bold; margin-top: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
            .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold; margin-bottom: 8px; }
            .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; }
            .label { font-size: 14px; color: #64748b; }
            .value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            .amount-box { background: #eff6ff; padding: 30px; border-radius: 20px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 20px; font-weight: 800; }
            .total-value { font-size: 32px; font-weight: 900; color: #2563eb; }
            .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature { border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 14px; color: #64748b; margin-top: 40px; }
            @media print { body { padding: 0; } .amount-box { -webkit-print-color-adjust: exact; background-color: #eff6ff !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">ใบเสร็จรับเงิน</h1>
            <div class="receipt-no">เลขที่ใบเสร็จ ${payment.receiptNumber}</div>
          </div>
          
          <div class="grid">
            <div class="info-box">
              <div class="section-title">ข้อมูลผู้ชำระเงิน</div>
              <div class="label">บ้านเลขที่</div>
              <div class="value">${payment.houseNumber}</div>
              <div style="margin-top: 12px;"></div>
              <div class="label">ชื่อเจ้าของบ้าน</div>
              <div class="value">${payment.ownerName}</div>
            </div>
            <div class="info-box">
              <div class="section-title">รายละเอียดการชำระ</div>
              <div class="label">วันที่ชำระ</div>
              <div class="value">${formatThaiDate(payment.paymentDate, 'dd MMMM yyyy')}</div>
              <div style="margin-top: 12px;"></div>
              <div class="label">เวลา</div>
              <div class="value">${formatThaiDate(payment.paymentDate, 'HH:mm')} น.</div>
            </div>
          </div>

          <div class="info-box" style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;">
            <div>
              <div class="label">เลขครั้งก่อน</div>
              <div class="value">${Math.floor(payment.previousReading || 0).toString().padStart(4, '0')}</div>
            </div>
            <div style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <div class="label">เลขครั้งล่าสุด</div>
              <div class="value">${Math.floor(payment.currentReading || 0).toString().padStart(4, '0')}</div>
            </div>
            <div>
              <div class="label">ใช้น้ำ</div>
              <div class="value">${Math.floor(payment.usage || 0).toString()} หน่วย</div>
            </div>
          </div>

          <div class="grid" style="margin-bottom: 20px;">
            <div>
              <div class="section-title">ชำระสำหรับ</div>
              <div class="value">ค่าน้ำประปาประจำงวด (บิลเลขที่ ${payment.billNumber})</div>
            </div>
            <div style="text-align: right;">
              <div class="section-title">ช่องทางการชำระ</div>
              <div class="value">${getPaymentMethodLabel(payment.paymentMethod)}</div>
            </div>
          </div>

          <div class="amount-box">
            <span class="total-label">ยอดรับเงินทั้งสิ้น</span>
            <span class="total-value">${formatCurrency(payment.amount)}</span>
          </div>

          <div class="footer">
            <div></div>
            <div>
              <div class="signature">
                ( ลงชื่อ ) ............................................................<br>
                ผู้ออกใบเสร็จ / ผู้รับเงิน<br>
                (${payment.collector?.name || '...........................................'})
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const handleDownloadReceipt = async (payment: Payment) => {
    if (!receiptRef.current) return

    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0',
        },
      })

      const link = document.createElement('a')
      link.download = `Receipt-${payment.receiptNumber}.png`
      link.href = dataUrl
      link.click()

      toast({
        title: 'ดาวน์โหลดใบเสร็จแล้ว',
        description: 'ระบบได้ดาวน์โหลดรูปภาพใบเสร็จเรียบร้อยแล้ว',
      })
    } catch (err) {
      console.error('Failed to download receipt as image:', err)
      toast({
        title: 'ดาวน์โหลดไม่สำเร็จ',
        description: 'ไม่สามารถแปลงใบเสร็จเป็นรูปภาพได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      case 'TRANSFER':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      case 'PROMPTPAY':
        return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-white/40 bg-white/40 p-6 md:p-8 shadow-[0_32px_120px_-40px_rgba(14,165,233,0.3)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/40">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-sky-500/10 blur-[100px]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  ประวัติการชำระเงิน
                </h1>
                <p className="max-w-md text-base font-medium text-slate-500 dark:text-slate-400">
                  ตรวจสอบและจัดการข้อมูลการรับชำระเงินค่าน้ำประปาทั้งหมดในระบบ
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="group relative flex h-12 items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-950 px-6 font-bold text-sm text-white transition-all hover:scale-105 hover:bg-slate-900 active:scale-95 dark:bg-white dark:text-slate-950"
                >
                  <Plus className="h-4 w-4" />
                  บันทึกการชำระเงิน
                  <div className="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-white/10 to-transparent transition-transform group-hover:translate-y-0" />
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  {formatNumber(payments.length)} รายการ
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[420px]">
              {[
                { label: 'ยอดรับรวม', value: formatCurrency(summary.totalAmount), icon: DollarSign, color: 'from-blue-600 to-sky-600', shadow: 'shadow-blue-500/25' },
                { label: 'ยอดวันนี้', value: formatCurrency(summary.todayAmount), icon: Wallet, color: 'from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200', shadow: 'shadow-slate-900/25', light: true },
              ].map((item) => (
                <div key={item.label} className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${item.color} p-5 text-white ${item.shadow} shadow-xl dark:text-slate-900`}>
                  <item.icon className="absolute -right-3 -top-3 h-20 w-20 opacity-10" />
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${item.light ? 'text-slate-400 dark:text-slate-500' : 'text-blue-100'}`}>{item.label}</p>
                  <p className="mt-3 text-xl font-black">{item.value}</p>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">บ้านที่มีการชำระ</p>
                    <p className="text-lg font-bold text-slate-950 dark:text-white">{formatNumber(uniqueHouses)} หลัง</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">รายการวันนี้</p>
                  <p className="text-lg font-bold text-slate-950 dark:text-white">{formatNumber(summary.todayCount)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 w-full md:max-w-2xl group">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
              <input
                placeholder="ค้นหาเลขที่ใบเสร็จ, เลขที่บิล, บ้านเลขที่ หรือชื่อเจ้าของบ้าน..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-6 text-lg font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">กำลังโหลดข้อมูลรายการ...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="rounded-full bg-slate-50 p-6 dark:bg-slate-900">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <p className="text-lg font-bold text-slate-400">ไม่พบข้อมูลการชำระเงินที่คุณกำลังค้นหา</p>
              </div>
            ) : (
              <div className="relative">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">วันที่ / เวลา</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ข้อมูลใบเสร็จ</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">บ้าน / สมาชิก</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ยอดชำระ</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ช่องทาง</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-900 dark:text-white">{formatThaiDate(payment.paymentDate)}</p>
                            <p className="text-xs font-medium text-slate-400">{formatThaiDate(payment.paymentDate, 'HH:mm')} น.</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Receipt className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{payment.receiptNumber}</p>
                                <p className="text-xs font-medium text-slate-500">บิล: {payment.billNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-900 dark:text-white">บ้าน {payment.houseNumber}</p>
                            <p className="text-xs font-medium text-slate-500">{payment.ownerName}</p>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(payment.amount)}</p>
                            <p className="text-[10px] font-bold text-slate-400">จากยอดบิล {formatCurrency(payment.billTotal)}</p>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`inline-flex rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getPaymentMethodBadge(payment.paymentMethod)}`}>
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center gap-2 transition-opacity">
                              <button
                                onClick={() => setSelectedPayment(payment)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handlePrintReceipt(payment)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{payment.receiptNumber}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatThaiDate(payment.paymentDate)} • {formatThaiDate(payment.paymentDate, 'HH:mm')} น.</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getPaymentMethodBadge(payment.paymentMethod)}`}>
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">บ้าน / สมาชิก</p>
                          <p className="font-bold text-slate-900 dark:text-white mt-0.5">บ้าน {payment.houseNumber}</p>
                          <p className="text-xs font-medium text-slate-500">{payment.ownerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ยอดรับชำระ</p>
                          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(payment.amount)}</p>
                          <p className="text-[9px] font-bold text-slate-400">บิล: {payment.billNumber}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                        >
                          <FileText className="h-4 w-4 text-blue-500" />
                          ดูรายละเอียด
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(payment)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Payment Detail Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPayment(null)} />
            <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div ref={receiptRef} className="relative bg-white dark:bg-slate-950">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-sky-600" />

                <div className="relative px-8 pt-8 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className="rounded-2xl bg-white p-3 shadow-lg dark:bg-slate-900">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    {/* Placeholder for X button spacing when captured */}
                    <div className="h-10 w-10" />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">ใบเสร็จรับเงิน</h2>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">เลขที่ใบเสร็จ {selectedPayment.receiptNumber}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-y border-slate-100 py-6 dark:border-slate-800">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">บ้าน / สมาชิก</p>
                          <p className="font-bold text-slate-900 dark:text-white">บ้าน {selectedPayment.houseNumber}</p>
                          <p className="text-sm font-medium text-slate-500">{selectedPayment.ownerName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">วันที่ชำระ</p>
                          <p className="font-bold text-slate-900 dark:text-white">{formatThaiDate(selectedPayment.paymentDate, 'dd MMMM yyyy')}</p>
                          <p className="text-sm font-medium text-slate-500">เวลา {formatThaiDate(selectedPayment.paymentDate, 'HH:mm')} น.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ช่องทางการชำระ</p>
                          <span className={`inline-flex rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getPaymentMethodBadge(selectedPayment.paymentMethod)}`}>
                            {getPaymentMethodLabel(selectedPayment.paymentMethod)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ผู้รับชำระ</p>
                          <p className="font-bold text-slate-900 dark:text-white">{selectedPayment.collector?.name || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 rounded-2xl bg-blue-50/30 p-4 dark:bg-blue-900/10">
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">เลขครั้งก่อน</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedPayment.previousReading !== undefined ? Math.floor(selectedPayment.previousReading).toString().padStart(4, '0') : '0000'}</p>
                      </div>
                      <div className="text-center border-x border-blue-100 dark:border-blue-900/30">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">เลขครั้งล่าสุด</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedPayment.currentReading !== undefined ? Math.floor(selectedPayment.currentReading).toString().padStart(4, '0') : '0000'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ใช้น้ำ</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">{Math.floor(selectedPayment.usage || 0).toString()} หน่วย</p>
                      </div>
                    </div>

                    <div className="rounded-[24px] bg-slate-50 p-6 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500">ยอดชำระตามบิล {selectedPayment.billNumber}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(selectedPayment.billTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-slate-900 dark:text-white">ยอดรับเงินทั้งสิ้น</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(selectedPayment.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* UI Controls - Hidden from capture */}
              <button onClick={() => setSelectedPayment(null)} className="absolute top-8 right-8 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors z-[60]">
                <X className="h-6 w-6" />
              </button>

              <div className="px-8 pb-8 space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePrintReceipt(selectedPayment)}
                    className="flex-1 rounded-2xl bg-slate-950 py-4 font-black text-sm text-white transition-all hover:bg-slate-900 active:scale-95 dark:bg-white dark:text-slate-950"
                  >
                    พิมพ์ใบเสร็จ
                  </button>
                  <button
                    onClick={() => handleDownloadReceipt(selectedPayment)}
                    className="flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
            <div className="relative z-50 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl dark:bg-slate-950">
              <PaymentForm
                bill={selectedBill ? {
                  id: selectedBill.id,
                  billNumber: selectedBill.billNumber,
                  houseNumber: selectedBill.houseNumber,
                  ownerName: selectedBill.ownerName,
                  period: `${formatThaiDate(selectedBill.periodStart)} - ${formatThaiDate(selectedBill.periodEnd)}`,
                  amount: selectedBill.outstandingAmount || selectedBill.totalAmount,
                  dueDate: selectedBill.dueDate,
                  status: selectedBill.outstandingAmount <= 0 ? 'PAID' : 'PENDING',
                } : undefined}
                billId={selectedBillId || undefined}
                isSubmitting={isSubmitting}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false)
                  setSelectedBillId(null)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


