'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toPng } from 'html-to-image'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarRange,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Home,
  LayoutGrid,
  List,
  Loader2,
  ReceiptText,
  RefreshCcw,
  Search,
  Sparkles,
  Wallet,
  X,
  AlertCircle,
  CheckCircle,
  CheckCircle2
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BillCard } from '@/components/bills/BillCard'
import { useToast } from '@/hooks/use-toast'

interface Bill {
  id: string
  billNumber: string
  houseId: string
  houseNumber: string
  ownerName: string
  address: string
  periodStart: string
  periodEnd: string
  previousReading: number
  currentReading: number
  usage: number
  baseFee: number
  usageFee: number
  totalAmount: number
  dueDate: string
  isPaid: boolean
  paidAt?: string
  totalPaid: number
  outstandingAmount: number
  paymentsCount: number
  createdAt: string
  carryOverAmount?: number
  imageUrl?: string
}

interface HouseSummary {
  id: string
  houseNumber: string
  ownerName: string
  address?: string
  latestReading: {
    id: string
    readingValue: number
    usage: number
    readingDate: string
  } | null
}

const currency = (value: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(value)

const number = (value: number) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(value)

const formatThaiDate = (value?: string) => {
  if (!value) return '-'
  return format(new Date(value), 'dd MMM yyyy', { locale: th })
}

const formatPeriod = (start: string, end?: string) => {
  if (!start) return '-'
  const startDate = new Date(start)
  if (!end) return format(startDate, 'MMMM yyyy', { locale: th })
  const endDate = new Date(end)
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return format(startDate, 'MMMM yyyy', { locale: th })
  }
  return `${format(startDate, 'dd MMM', { locale: th })} - ${format(endDate, 'dd MMM yyyy', { locale: th })}`
}

export default function BillsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [bills, setBills] = useState<Bill[]>([])
  const [houses, setHouses] = useState<HouseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingImage, setIsExportingImage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'ready'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [userRole, setUserRole] = useState('')
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [billPendingDelete, setBillPendingDelete] = useState<Bill | null>(null)
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  })
  const billRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const handleExportReportImage = async () => {
    if (!reportRef.current) return
    setIsExportingImage(true)
    try {
      toast({ title: 'กำลังสร้างรูปภาพสรุป...', description: 'กรุณารอสักครู่' })
      const dataUrl = await toPng(reportRef.current, { quality: 1.0, pixelRatio: 2, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `bills-summary-${format(new Date(), 'yyyy-MM-dd')}.png`
      link.href = dataUrl
      link.click()
      toast({ title: 'สำเร็จ', description: 'ดาวน์โหลดรูปภาพสรุปยอดแล้ว' })
    } catch (err) {
      console.error(err)
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถสร้างรูปภาพสรุปได้', variant: 'destructive' })
    } finally {
      setIsExportingImage(false)
    }
  }

  const handleDownloadBillImage = async () => {
    if (!billRef.current || !selectedBill) return
    try {
      toast({ title: 'กำลังสร้างรูปภาพ...', description: 'กรุณารอสักครู่' })
      // Use pixelRatio: 3 for high-res crisp text
      const dataUrl = await toPng(billRef.current, { quality: 1.0, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `bill-${selectedBill.billNumber}.png`
      link.href = dataUrl
      link.click()
      toast({ title: 'สำเร็จ', description: 'ดาวน์โหลดรูปภาพบิลเรียบร้อยแล้ว' })
    } catch (err) {
      console.error(err)
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถสร้างรูปภาพได้', variant: 'destructive' })
    }
  }

  const fetchSessionAndHouses = async () => {
    const [sessionResponse, housesResponse] = await Promise.all([
      fetch('/api/auth/session'),
      fetch('/api/houses?limit=1000'),
    ])

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      setUserRole(sessionData.user?.role || '')
    }

    if (housesResponse.ok) {
      const housesData = await housesResponse.json()
      setHouses(housesData.data || [])
    }
  }

  const fetchBills = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200', sortBy: 'createdAt', sortOrder: 'desc' })
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (statusFilter === 'paid') params.set('isPaid', 'true')
      if (statusFilter === 'unpaid') params.set('isPaid', 'false')

      const response = await fetch(`/api/bills?${params.toString()}`)
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลบิลได้')

      const data = await response.json()
      let nextBills: Bill[] = data.data || []
      if (statusFilter === 'overdue') {
        nextBills = nextBills.filter((bill) => !bill.isPaid && new Date(bill.dueDate) < new Date())
      }

      setBills(nextBills)
      setSummary(data.summary || { totalAmount: 0, totalPaid: 0, totalUnpaid: 0 })
    } catch (error) {
      console.error('Failed to fetch bills:', error)
      toast({ title: 'โหลดข้อมูลบิลไม่สำเร็จ', description: 'กรุณาลองใหม่อีกครั้ง', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchSessionAndHouses()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchBills(), 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery, statusFilter])

  const unpaidBillsCount = useMemo(() => bills.filter((bill) => !bill.isPaid).length, [bills])
  const overdueBillsCount = useMemo(() => bills.filter((bill) => !bill.isPaid && new Date(bill.dueDate) < new Date()).length, [bills])
  const housesReadyForBilling = useMemo(() => houses.filter((house) => house.latestReading), [houses])
  const housesAwaitingBills = useMemo(() => {
    const billedReadingIds = new Set(bills.map((bill) => `${bill.houseId}:${bill.currentReading}:${bill.periodEnd}`))
    return housesReadyForBilling.filter((house) => {
      if (!house.latestReading) return false
      return !billedReadingIds.has(`${house.id}:${house.latestReading.readingValue}:${house.latestReading.readingDate}`)
    })
  }, [bills, housesReadyForBilling])

  const handleRefresh = async () => {
    await Promise.all([fetchBills(), fetchSessionAndHouses()])
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/bills/export')
      if (!response.ok) throw new Error('ไม่สามารถส่งออกไฟล์ได้')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `bills-${format(new Date(), 'yyyy-MM-dd')}.csv`
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast({ title: 'ส่งออกสำเร็จ', description: 'ไฟล์ CSV ถูกดาวน์โหลดแล้ว' })
    } catch (error) {
      console.error('Failed to export bills:', error)
      toast({ title: 'ส่งออกไฟล์ไม่สำเร็จ', description: 'เฉพาะผู้ดูแลระบบที่มีสิทธิ์เท่านั้น หรือระบบอาจมีปัญหาชั่วคราว', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleGenerateBills = async () => {
    setIsGenerating(true)
    try {
      const now = new Date()
      const periodStart = startOfMonth(now)
      const periodEnd = endOfMonth(now)
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 15)

      const response = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          dueDate: dueDate.toISOString(),
          baseFee: 0,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || data?.message || 'ไม่สามารถสร้างบิลได้')

      await Promise.all([fetchBills(), fetchSessionAndHouses()])
      toast({
        title: 'อัปเดตข้อมูลบิลแล้ว',
        description: data?.message || (data?.generatedCount > 0 ? `สร้างบิลใหม่ ${data.generatedCount} รายการ` : 'ยังไม่มีข้อมูลมิเตอร์ที่พร้อมสร้างบิล'),
      })
    } catch (error) {
      console.error('Failed to generate bills:', error)
      toast({ title: 'สร้างบิลไม่สำเร็จ', description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง', variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditBill = async (bill: Bill) => {
    const nextDueDate = window.prompt('แก้ไขวันครบกำหนดชำระ (รูปแบบ YYYY-MM-DD)', bill.dueDate.slice(0, 10))
    if (nextDueDate === null) return

    const nextBaseFeeText = window.prompt('แก้ไขค่าบริการพื้นฐาน', String(bill.baseFee))
    if (nextBaseFeeText === null) return

    const nextBaseFee = Number(nextBaseFeeText)
    if (Number.isNaN(nextBaseFee) || nextBaseFee < 0) {
      toast({ title: 'ข้อมูลไม่ถูกต้อง', description: 'ค่าบริการพื้นฐานต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: new Date(nextDueDate).toISOString(),
          baseFee: nextBaseFee,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || data?.message || 'ไม่สามารถแก้ไขบิลได้')

      await fetchBills()
      setSelectedBill((current) => (current?.id === bill.id ? { ...current, dueDate: nextDueDate, baseFee: nextBaseFee, totalAmount: data?.data?.totalAmount ?? current.totalAmount } : current))
      toast({ title: 'แก้ไขข้อมูลบิลแล้ว', description: `อัปเดตบิล ${bill.billNumber} เรียบร้อยแล้ว` })
    } catch (error) {
      console.error('Failed to edit bill:', error)
      toast({ title: 'แก้ไขข้อมูลบิลไม่สำเร็จ', description: error instanceof Error ? error.message : 'กรุณาลองใหมีกครั้ง', variant: 'destructive' })
    }
  }

  const handleDeleteBill = async () => {
    if (!billPendingDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bills/${billPendingDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || data?.message || 'ไม่สามารถลบบิลได้')

      setBills((current) => current.filter((bill) => bill.id !== billPendingDelete.id))
      setSelectedBill((current) => (current?.id === billPendingDelete.id ? null : current))
      setBillPendingDelete(null)
      await fetchBills()
      toast({ title: 'ลบข้อมูลบิลแล้ว', description: 'ลบบิลและข้อมูลการชำระที่ผูกกับบิลนี้แล้ว' })
    } catch (error) {
      console.error('Failed to delete bill:', error)
      toast({ title: 'ลบข้อมูลบิลไม่สำเร็จ', description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrintBill = (bill: Bill) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) {
      toast({ title: 'เปิดหน้าพิมพ์ไม่สำเร็จ', description: 'กรุณาอนุญาต popup ของเบราว์เซอร์ก่อน', variant: 'destructive' })
      return
    }

    const statusText = bill.isPaid ? 'ชำระแล้ว' : new Date(bill.dueDate) < new Date() ? 'เกินกำหนด' : 'รอชำระ'
    printWindow.document.write(`
      <html>
        <head>
          <title>${bill.billNumber}</title>
          <style>
            body { font-family: Tahoma, sans-serif; padding: 32px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-top: 20px; }
            .row { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>ใบแจ้งค่าน้ำ</h1>
          <div>เลขที่บิล ${bill.billNumber}</div>
          <div class="box">
            <div class="row"><strong>บ้านเลขที่</strong><span>${bill.houseNumber}</span></div>
            <div class="row"><strong>เจ้าของบ้าน</strong><span>${bill.ownerName}</span></div>
            <div class="row"><strong>รอบบิล</strong><span>${formatPeriod(bill.periodStart, bill.periodEnd)}</span></div>
            <div class="row"><strong>เลขครั้งก่อน</strong><span>${number(bill.previousReading)}</span></div>
            <div class="row"><strong>เลขครั้งล่าสุด</strong><span>${number(bill.currentReading)}</span></div>
            <div class="row"><strong>ใช้น้ำ</strong><span>${number(bill.usage)} หน่วย</span></div>
            <div class="row"><strong>ค่าบริการพื้นฐาน</strong><span>${currency(bill.baseFee)}</span></div>
            <div class="row"><strong>ค่าน้ำตามการใช้จริง</strong><span>${currency(bill.usageFee)}</span></div>
            <div class="row"><strong>ครบกำหนดชำระ</strong><span>${formatThaiDate(bill.dueDate)}</span></div>
            <div class="row"><strong>สถานะ</strong><span>${statusText}</span></div>
            <div class="row"><strong>ยอดรวมทั้งสิ้น</strong><span>${currency(bill.totalAmount)}</span></div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Simplified Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              จัดการใบแจ้งหนี้
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              ตรวจสอบ และสร้างบิลค่าน้ำสำหรับบ้านแต่ละหลัง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {userRole === 'ADMIN' && (
              <button
                onClick={handleGenerateBills}
                disabled={isGenerating}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 font-medium text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-all active:scale-95"
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                สร้างบิลรอบใหม่
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Clean Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">บิลทั้งหมด</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{number(bills.length)}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">ชำระแล้ว</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currency(summary.totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">ค้างชำระ</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currency(summary.totalUnpaid)}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">เกินกำหนด</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{number(overdueBillsCount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Tabs Row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              บิลทั้งหมด ({number(bills.length)})
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2 ${activeTab === 'ready' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              พร้อมสร้างบิล
              {housesAwaitingBills.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  {housesAwaitingBills.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 md:flex-row md:max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขบิล, บ้านเลขที่, ชื่อเจ้าของ..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
              />
            </div>
            {activeTab === 'all' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm md:w-[160px]"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="unpaid">รอชำระ</option>
                <option value="overdue">เกินกำหนด</option>
              </select>
            )}
            {userRole === 'ADMIN' && activeTab === 'all' && (
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                >
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  CSV
                </button>
                <button
                  onClick={handleExportReportImage}
                  disabled={isExportingImage}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                >
                  {isExportingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  รูปภาพรายงาน
                </button>
              </div>
            )}
            <div className="hidden items-center rounded-2xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/50 sm:flex">
              <button className={`p-2 rounded-xl ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 dark:bg-slate-800' : 'text-slate-400'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></button>
              <button className={`p-2 rounded-xl ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 dark:bg-slate-800' : 'text-slate-400'}`} onClick={() => setViewMode('list')}><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'ready' ? (
          <div className="space-y-4">
            {housesAwaitingBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                <div className="p-4 bg-slate-50 rounded-full dark:bg-slate-900 mb-4">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">ไม่มีรายการค้างสร้างบิล</h3>
                <p className="text-slate-500 mt-1 max-w-sm text-center">บ้านทุกหลังที่จดมิเตอร์แล้ว มีใบแจ้งหนี้สร้างไว้เรียบร้อยแล้วครับ</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {housesAwaitingBills.map((house) => (
                  <div key={house.id} className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <Home className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">บ้านเลขที่ {house.houseNumber}</p>
                          <p className="text-xs text-slate-500">{house.ownerName}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 uppercase tracking-wider">
                        พร้อมออกบิล
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-900/50">
                        <p className="text-[10px] uppercase font-semibold text-slate-400">เลขล่าสุด</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{number(house.latestReading?.readingValue || 0)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-900/50">
                        <p className="text-[10px] uppercase font-semibold text-slate-400">ใช้น้ำ</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{number(house.latestReading?.usage || 0)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-900/50">
                        <p className="text-[10px] uppercase font-semibold text-slate-400">วันที่จด</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{format(new Date(house.latestReading?.readingDate || Date.now()), 'dd MMM')}</p>
                      </div>
                    </div>

                    {userRole === 'ADMIN' && (
                      <button
                        onClick={handleGenerateBills}
                        disabled={isGenerating}
                        className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        สร้างบิลเดี๋ยวนี้
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* All Bills View */
          <>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลใบแจ้งหนี้...</p>
              </div>
            ) : bills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                <div className="p-4 bg-slate-50 rounded-full dark:bg-slate-900 mb-4">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">ไม่พบบิลที่ต้องการ</h3>
                <p className="text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะครับ</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {bills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    id={bill.id}
                    billNumber={bill.billNumber}
                    houseNumber={bill.houseNumber}
                    ownerName={bill.ownerName}
                    period={formatPeriod(bill.periodStart, bill.periodEnd)}
                    issueDate={formatThaiDate(bill.createdAt)}
                    dueDate={formatThaiDate(bill.dueDate)}
                    previousReading={bill.previousReading}
                    currentReading={bill.currentReading}
                    usage={bill.usage}
                    ratePerUnit={bill.usage > 0 ? bill.usageFee / bill.usage : 0}
                    amount={bill.totalAmount}
                    status={bill.isPaid ? 'paid' : new Date(bill.dueDate) < new Date() ? 'overdue' : 'issued'}
                    paidDate={bill.paidAt ? formatThaiDate(bill.paidAt) : undefined}
                    onView={() => setSelectedBill(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onPrint={() => handlePrintBill(bill)}
                    onPay={() => router.push(`/dashboard/payments?billId=${bill.id}`)}
                    onDelete={() => setBillPendingDelete(bill)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">บิล / รอบบิล</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">บ้าน</th>
                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">ใช้น้ำ</th>
                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">ยอดรวม</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">สถานะ</th>
                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bills.map((bill) => {
                        const overdue = !bill.isPaid && new Date(bill.dueDate) < new Date()
                        return (
                          <tr key={bill.id} className="group hover:bg-slate-50 transition-colors dark:hover:bg-slate-900/40">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 dark:text-white">{bill.billNumber}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{formatPeriod(bill.periodStart, bill.periodEnd)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">บ้าน {bill.houseNumber}</div>
                              <div className="text-xs text-slate-400">{bill.ownerName}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-bold text-slate-900 dark:text-white">{number(bill.usage)}</div>
                              <div className="text-[10px] text-slate-400">หน่วย</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{currency(bill.totalAmount)}</td>
                            <td className="px-6 py-4">
                              {bill.isPaid ? (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-500/10 dark:text-green-400 uppercase tracking-wide">ชำระแล้ว</span>
                              ) : overdue ? (
                                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 uppercase tracking-wide">เกินกำหนด</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 uppercase tracking-wide">รอชำระ</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/30" onClick={() => setSelectedBill(bill)}><FileText className="h-4 w-4" /></button>
                                <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800" onClick={() => handlePrintBill(bill)}><Download className="h-4 w-4" /></button>
                                {!bill.isPaid && <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg dark:hover:bg-green-900/30" onClick={() => router.push(`/dashboard/payments?billId=${bill.id}`)}><Wallet className="h-4 w-4" /></button>}
                                <button className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-900/30" onClick={() => setBillPendingDelete(bill)}><X className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals remain same but with cleaned styles */}
        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            <div className="relative z-50 w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">บิลเลขที่ {selectedBill.billNumber}</h3>
                    <p className="text-sm text-slate-500">บ้าน {selectedBill.houseNumber} · {selectedBill.ownerName}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedBill(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-8 p-8 md:grid-cols-[1fr_0.8fr]">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">รอบบิล</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{formatPeriod(selectedBill.periodStart, selectedBill.periodEnd)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">วันครบกำหนด</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{formatThaiDate(selectedBill.dueDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">เลขจดครั้งก่อน</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{number(selectedBill.previousReading)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">เลขจดล่าสุด</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{number(selectedBill.currentReading)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-50/50 p-6 dark:bg-blue-900/10">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-3 mb-3 dark:border-blue-900/30">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">ปริมาณการใช้น้ำ</span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{number(selectedBill.usage)} หน่วย</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>ค่าบริการพื้นฐาน</span><span>{currency(selectedBill.baseFee)}</span></div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>ค่าน้ำตามจริง</span><span>{currency(selectedBill.usageFee)}</span></div>
                      <div className="flex justify-between text-amber-600 font-medium"><span>ยอดค้างชำระเดิม</span><span>{currency(selectedBill.carryOverAmount || 0)}</span></div>
                    </div>
                  </div>

                  {selectedBill.imageUrl && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400">รูปภาพมิเตอร์</p>
                      <img
                        src={selectedBill.imageUrl}
                        alt="Meter Reading"
                        className="w-full h-48 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(selectedBill.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-[24px] bg-slate-900 p-8 text-white dark:bg-white dark:text-slate-950">
                  <div>
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-400">ยอดรวมที่ต้องชำระ</p>
                    <p className="mt-4 text-5xl font-bold tracking-tighter">{currency(selectedBill.totalAmount)}</p>
                    <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle className={`h-4 w-4 ${selectedBill.isPaid ? 'text-green-400' : 'text-slate-600'}`} />
                      {selectedBill.isPaid ? `ชำระแล้วเมื่อ ${formatThaiDate(selectedBill.paidAt)}` : 'ยังไม่ได้ชำระเงิน'}
                    </div>
                  </div>

                  <div className="mt-12 space-y-3">
                    {!selectedBill.isPaid && (
                      <button
                        onClick={() => router.push(`/dashboard/payments?billId=${selectedBill.id}`)}
                        className="w-full rounded-2xl bg-white py-4 text-sm font-bold text-slate-950 transition-all hover:bg-slate-100 dark:bg-slate-950 dark:text-white"
                      >
                        รับชำระเงินตอนนี้
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintBill(selectedBill)}
                      className="w-full rounded-2xl border border-white/20 py-3 text-sm font-bold text-white transition-all hover:bg-white/5 dark:border-slate-200 dark:text-slate-950"
                    >
                      พิมพ์ใบแจ้งหนี้
                    </button>
                    <button
                      onClick={handleDownloadBillImage}
                      className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 py-3 text-sm font-bold text-blue-400 transition-all hover:bg-blue-500/20"
                    >
                      บันทึกเป็นรูปภาพ (สำหรับมือถือ)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {billPendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setBillPendingDelete(null)} />
            <div className="relative z-50 w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 text-center shadow-2xl dark:bg-slate-950 animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">ยืนยันการลบบิล</h3>
              <p className="mb-8 text-slate-500 dark:text-slate-400">
                {`บิล ${billPendingDelete.billNumber} จะถูกลบถาวรพร้อมข้อมูลการชำระเงินที่เกี่ยวข้องทั้งหมด`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBillPendingDelete(null)}
                  disabled={isDeleting}
                  className="rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteBill}
                  disabled={isDeleting}
                  className="rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden beautiful bill template for image export */}
        {selectedBill && (
          <div className="absolute left-[-9999px] top-[-9999px]">
            <div ref={billRef} className="w-[600px] bg-white p-10 font-sans text-slate-900" style={{ backgroundImage: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
              {/* Header */}
              <div className="flex justify-between items-center mb-8 border-b-2 border-blue-500 pb-6">
                <div>
                  <h1 className="text-3xl font-black text-blue-700 tracking-tight">ใบแจ้งค่าน้ำประปา</h1>
                  <p className="text-slate-500 mt-1 text-sm font-medium">ระบบบริหารจัดการน้ำหมู่บ้าน</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">เลขที่บิล</p>
                  <p className="text-xl font-bold text-slate-900">{selectedBill.billNumber}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="flex justify-between mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">ข้อมูลผู้ใช้น้ำ</p>
                  <p className="text-lg font-bold text-slate-900">บ้านเลขที่ {selectedBill.houseNumber}</p>
                  <p className="text-slate-600 font-medium">{selectedBill.ownerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">ประจำเดือน</p>
                  <p className="text-lg font-bold text-slate-900">{formatPeriod(selectedBill.periodStart, selectedBill.periodEnd)}</p>
                  <p className="text-sm text-slate-500">ครบกำหนด: {formatThaiDate(selectedBill.dueDate)}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">เลขครั้งก่อน</p>
                  <p className="text-xl font-bold text-slate-900">{number(selectedBill.previousReading)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">เลขครั้งล่าสุด</p>
                  <p className="text-xl font-bold text-slate-900">{number(selectedBill.currentReading)}</p>
                </div>
                <div className="bg-blue-600 p-4 rounded-2xl text-center shadow-lg shadow-blue-200">
                  <p className="text-xs font-bold text-blue-200 uppercase mb-1">ปริมาณน้ำที่ใช้</p>
                  <p className="text-xl font-bold text-white">{number(selectedBill.usage)} <span className="text-sm font-medium opacity-80">หน่วย</span></p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-slate-600 font-medium py-2">
                  <span>ค่าบริการพื้นฐาน</span>
                  <span>{currency(selectedBill.baseFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium py-2">
                  <span>ค่าน้ำประปาตามการใช้จริง</span>
                  <span>{currency(selectedBill.usageFee)}</span>
                </div>
                {(selectedBill.carryOverAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium py-2 border-t border-slate-100">
                    <span>ยอดค้างชำระจากรอบก่อน</span>
                    <span>{currency(selectedBill.carryOverAmount || 0)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดรวมทั้งสิ้น</p>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${selectedBill.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {selectedBill.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                    </div>
                  </div>
                </div>
                <p className="text-4xl font-black">{currency(selectedBill.totalAmount)}</p>
              </div>
              
              <div className="mt-8 text-center text-xs text-slate-400 font-medium">
                เอกสารนี้สร้างโดยระบบอัตโนมัติเมื่อวันที่ {formatThaiDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        )}

        {/* Hidden Report Summary for Image Export */}
        <div className="absolute left-[-9999px] top-[-9999px]">
          <div ref={reportRef} className="w-[800px] bg-white p-10 font-sans text-slate-900" style={{ backgroundImage: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
            <div className="text-center mb-8 pb-6 border-b border-slate-200">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">รายงานสรุปใบแจ้งค่าน้ำ</h1>
              <p className="text-slate-500 mt-2 text-sm font-medium">
                ประจำวันที่ {formatThaiDate(new Date().toISOString())}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">ยอดเรียกเก็บทั้งหมด</p>
                <p className="text-3xl font-bold text-slate-900">{currency(summary.totalAmount)}</p>
                <p className="text-sm text-slate-500 mt-2">{number(bills.length)} บิล</p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <p className="text-sm font-bold text-green-600/70 uppercase tracking-wider mb-2">ชำระแล้ว</p>
                <p className="text-3xl font-bold text-green-700">{currency(summary.totalPaid)}</p>
                <p className="text-sm text-green-600 mt-2">{number(bills.filter(b => b.isPaid).length)} บิล</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <p className="text-sm font-bold text-rose-600/70 uppercase tracking-wider mb-2">ค้างชำระ / เกินกำหนด</p>
                <p className="text-3xl font-bold text-rose-700">{currency(summary.totalUnpaid)}</p>
                <p className="text-sm text-rose-600 mt-2">{number(bills.filter(b => !b.isPaid).length)} บิล</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-sm font-bold text-blue-600/70 uppercase tracking-wider mb-2">อัตราการชำระเงิน</p>
                <p className="text-3xl font-bold text-blue-700">
                  {summary.totalAmount > 0 ? Math.round((summary.totalPaid / summary.totalAmount) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-blue-500 pl-3">รายการบิล (ล่าสุด 15 รายการ)</h3>
            </div>
            
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-2 font-bold text-slate-600">เลขที่บิล</th>
                  <th className="py-3 px-2 font-bold text-slate-600">บ้านเลขที่</th>
                  <th className="py-3 px-2 font-bold text-slate-600 text-right">ยอดรวม</th>
                  <th className="py-3 px-2 font-bold text-slate-600 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 15).map((bill, index) => (
                  <tr key={bill.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="py-3 px-2 font-medium">{bill.billNumber}</td>
                    <td className="py-3 px-2">{bill.houseNumber}</td>
                    <td className="py-3 px-2 text-right font-bold">{currency(bill.totalAmount)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${bill.isPaid ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                        {bill.isPaid ? 'ชำระแล้ว' : 'ค้างชำระ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bills.length > 15 && (
              <p className="text-center text-sm text-slate-500 mt-4 italic">
                ... และรายการอื่นๆ อีก {bills.length - 15} รายการ
              </p>
            )}

            <div className="mt-12 text-center text-xs text-slate-400 font-medium border-t border-slate-100 pt-6">
              สร้างโดยระบบจัดการน้ำหมู่บ้าน
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


