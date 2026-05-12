'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock3,
  Droplets,
  FileText,
  Gauge,
  Home,
  Loader2,
  MapPin,
  Plus,
  Receipt,
  Search,
  User,
  X,
  Pencil,
  Trash2
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MeterReadingForm } from '@/components/meters/MeterReadingForm'
import { useToast } from '@/hooks/use-toast'

interface MeterReading {
  id: string
  houseId: string
  house: { id?: string; houseNumber: string; ownerName: string }
  readingDate: string
  readingValue: number
  usage: number
  isAnomaly: boolean
  notes?: string
  imageUrl?: string
  recordedBy: { name: string }
  bill?: { id: string; isPaid: boolean } | null
  createdAt: string
}

interface HouseOption {
  id: string
  houseNumber: string
  ownerName: string
  previousReading: number
  previousDate: string
  previousUsage: number
  unpaidBills: number
  outstandingBalance: number
  totalReadings: number
  isActive: boolean
}

interface BillPreview {
  meterReadingId: string
  houseId: string
  house: { houseNumber: string; ownerName: string }
  previousReading: number
  currentReading: number
  usage: number
  usageFee: number
  carryOverAmount: number
  totalAmount: number
  breakdown: Array<{ tier: string; rate: number; usage: number; amount: number }>
  unpaidBillsCount: number
}

const formatNumber = (value: number) => {
  const num = Math.floor(value)
  return num.toString().padStart(4, '0')
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(value)

const formatThaiDate = (value?: string, pattern = 'dd MMM yyyy') => {
  if (!value || value === '-') return '-'
  return format(new Date(value), pattern, { locale: th })
}

export default function MetersPage() {
  const { toast } = useToast()
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [houses, setHouses] = useState<HouseOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedHouseId, setSelectedHouseId] = useState<string | undefined>()
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false)
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null)
  const [isCreatingBill, setIsCreatingBill] = useState(false)
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const houseId = params.get('houseId')
    if (houseId) {
      setSelectedHouseId(houseId)
    }

    void Promise.all([fetchReadings(), fetchHouses()])
  }, [])

  const fetchHouses = async () => {
    try {
      const response = await fetch('/api/houses?limit=1000&sortBy=houseNumber&sortOrder=asc')
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลบ้านได้')
      const data = await response.json()
      setHouses(
        (data.data || []).map((house: any) => ({
          id: house.id,
          houseNumber: house.houseNumber,
          ownerName: house.ownerName,
          previousReading: house.latestReading?.readingValue ?? house.initialReading ?? 0,
          previousDate: house.latestReading?.readingDate || '-',
          previousUsage: house.latestReading?.usage || 0,
          unpaidBills: house.unpaidBills || 0,
          outstandingBalance: Number(house.outstandingBalance || 0),
          totalReadings: house.totalReadings || 0,
          isActive: Boolean(house.isActive),
        }))
      )
    } catch (error) {
      console.error('Failed to fetch houses:', error)
      toast({
        title: 'โหลดข้อมูลบ้านไม่สำเร็จ',
        description: 'กรุณาลองรีเฟรชหน้าอีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  const fetchReadings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/meter-readings?limit=500&sortBy=readingDate&sortOrder=desc')
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลมิเตอร์ได้')
      const data = await response.json()
      setReadings(data.data || [])
    } catch (error) {
      console.error('Failed to fetch readings:', error)
      toast({
        title: 'โหลดข้อมูลมิเตอร์ไม่สำเร็จ',
        description: 'ไม่สามารถดึงประวัติการจดมิเตอร์ได้',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHouses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return houses.filter((house) => {
      const matchesSearch =
        !query ||
        house.houseNumber.toLowerCase().includes(query) ||
        house.ownerName.toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (!showAnomaliesOnly) return true

      const latestReading = readings.find((reading) => reading.houseId === house.id)
      return Boolean(latestReading?.isAnomaly)
    })
  }, [houses, readings, searchQuery, showAnomaliesOnly])

  const recentReadings = useMemo(() => {
    return readings
      .filter((reading) => {
        if (!showAnomaliesOnly) return true
        return reading.isAnomaly
      })
      .slice(0, 8)
  }, [readings, showAnomaliesOnly])

  const stats = useMemo(() => {
    const activeHouses = houses.filter((house) => house.isActive)
    const anomalyCount = readings.filter((reading) => reading.isAnomaly).length
    const latestDate = readings[0]?.readingDate
    return {
      activeHouses: activeHouses.length,
      totalReadings: readings.length,
      anomalyCount,
      latestDate,
    }
  }, [houses, readings])

  const handleOpenCreate = (houseId?: string) => {
    setSelectedHouseId(houseId)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (data: any, imageFile?: File | null) => {
    setIsSubmitting(true)
    try {
      let imageUrl = "";

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("folder", "system-water/meter_readings");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.data.secureUrl;
        } else {
          console.error("Failed to upload image");
          toast({
            title: "อัปโหลดรูปภาพไม่สำเร็จ",
            description: "จะบันทึกข้อมูลมิเตอร์โดยไม่มีรูปภาพ",
            variant: "destructive",
          });
        }
      }

      const payload = {
        houseId: data.houseId,
        readingValue: data.currentReading ?? data.readingValue,
        readingDate: data.readingDate,
        notes: data.notes,
        imageUrl: imageUrl,
      };

      const response = await fetch('/api/meter-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'ไม่สามารถบันทึกข้อมูลมิเตอร์ได้')
      }

      const responseData = await response.json()
      const savedReading = responseData.data

      const selectedHouse = houses.find((house) => house.id === data.houseId)
      setIsFormOpen(false)
      setSelectedHouseId(undefined)
      await Promise.all([fetchReadings(), fetchHouses()])

      // Show bill preview if available
      if (savedReading?.billPreview) {
        setBillPreview({
          meterReadingId: savedReading.id,
          houseId: savedReading.houseId,
          house: savedReading.house || { houseNumber: selectedHouse?.houseNumber || '', ownerName: selectedHouse?.ownerName || '' },
          ...savedReading.billPreview,
        })
      } else {
        toast({
          title: 'บันทึกการจดมิเตอร์แล้ว',
          description: selectedHouse
            ? `บ้าน ${selectedHouse.houseNumber} ถูกอัปเดตเลขมิเตอร์ล่าสุดแล้ว`
            : 'บันทึกข้อมูลเรียบร้อยแล้ว',
        })
      }
    } catch (error) {
      console.error('Failed to save reading:', error)
      toast({
        title: 'บันทึกการจดมิเตอร์ไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateBill = async () => {
    if (!billPreview) return
    setIsCreatingBill(true)
    try {
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15) // Due 15th of next month

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseId: billPreview.houseId,
          meterReadingId: billPreview.meterReadingId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          dueDate: dueDate.toISOString(),
          baseFee: 0,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'ไม่สามารถสร้างบิลได้')
      }

      toast({
        title: 'สร้างบิลสำเร็จ',
        description: `บ้าน ${billPreview.house.houseNumber} — ยอด ${formatCurrency(billPreview.totalAmount)}`,
      })
      setBillPreview(null)
      await Promise.all([fetchReadings(), fetchHouses()])
    } catch (error) {
      console.error('Failed to create bill:', error)
      toast({
        title: 'สร้างบิลไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingBill(false)
    }
  }

  const handleDeleteReading = async (id: string) => {
    if (!confirm('คุณต้องการลบประวัติการจดมิเตอร์นี้ใช่หรือไม่?')) return
    try {
      const response = await fetch(`/api/meter-readings/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'ไม่สามารถลบข้อมูลมิเตอร์ได้')
      }
      toast({ title: 'ลบข้อมูลสำเร็จ' })
      await Promise.all([fetchReadings(), fetchHouses()])
    } catch (error) {
      console.error('Failed to delete reading:', error)
      toast({
        title: 'ลบข้อมูลไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingReading) return

    setIsEditSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      const readingValue = Number(formData.get('readingValue'))
      const readingDate = formData.get('readingDate') as string
      const notes = formData.get('notes') as string

      const payload = {
        readingValue,
        readingDate: new Date(readingDate).toISOString(),
        notes,
      }

      const response = await fetch(`/api/meter-readings/${editingReading.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'ไม่สามารถแก้ไขข้อมูลมิเตอร์ได้')
      }

      toast({ title: 'แก้ไขข้อมูลสำเร็จ' })
      setEditingReading(null)
      await Promise.all([fetchReadings(), fetchHouses()])
    } catch (error) {
      console.error('Failed to update reading:', error)
      toast({
        title: 'แก้ไขข้อมูลไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsEditSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_30%),radial-gradient(circle_at_88%_20%,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(240,253,244,0.96)_48%,_rgba(248,250,252,0.94))] p-6 shadow-[0_24px_80px_-32px_rgba(14,165,233,0.3)] dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.94)_46%,_rgba(30,41,59,0.9))]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.4)_18%,transparent_34%)] dark:bg-[linear-gradient(120deg,transparent_0%,rgba(148,163,184,0.08)_18%,transparent_34%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Droplets className="h-3.5 w-3.5" />
                METER MANAGEMENT
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  บันทึกเลขมิเตอร์
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  ตรวจสอบและบันทึกข้อมูลการใช้น้ำของแต่ละบ้าน
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => handleOpenCreate(selectedHouseId)} className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มการจดมิเตอร์
              </button>
              <button
                onClick={() => setShowAnomaliesOnly((current) => !current)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {showAnomaliesOnly ? 'แสดงทั้งหมด' : 'ดูเฉพาะผิดปกติ'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">บ้านที่ใช้งานอยู่</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{formatNumber(stats.activeHouses)}</p>
                </div>
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"><Home className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ประวัติมิเตอร์ทั้งหมด</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{formatNumber(stats.totalReadings)}</p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Gauge className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">รายการผิดปกติ</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-600">{formatNumber(stats.anomalyCount)}</p>
                </div>
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><AlertTriangle className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">วันจดล่าสุด</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{formatThaiDate(stats.latestDate)}</p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><CalendarDays className="h-5 w-5" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[24px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">รายการบ้าน</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    ค้นหาและเลือกบ้านที่ต้องการบันทึกมิเตอร์
                  </p>
                </div>
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="ค้นหาบ้านเลขที่ เจ้าของบ้าน หรือที่อยู่..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredHouses.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  ไม่พบบ้านที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredHouses.map((house) => {
                    const latestReading = readings.find((reading) => reading.houseId === house.id)
                    return (
                      <button
                        key={house.id}
                        type="button"
                        onClick={() => handleOpenCreate(house.id)}
                        className="group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_20px_50px_-30px_rgba(14,165,233,0.55)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-500/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">บ้าน {house.houseNumber}</span>
                              {!house.isActive ? <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">ไม่ใช้งาน</span> : null}
                              {latestReading?.isAnomaly ? <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">ผิดปกติ</span> : null}
                            </div>
                            <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{house.ownerName}</p>
                          </div>
                          <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition group-hover:bg-sky-600 group-hover:text-white dark:bg-slate-900 dark:text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>ประวัติการจด {formatNumber(house.totalReadings)} ครั้ง</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                              <p className="text-xs text-slate-500">เลขมิเตอร์ล่าสุด</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{formatNumber(house.previousReading)}</p>
                              <p className="mt-1 text-xs text-slate-500">วันที่ {formatThaiDate(house.previousDate)}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                              <p className="text-xs text-slate-500">การใช้ครั้งล่าสุด</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{formatNumber(house.previousUsage)}</p>
                              <p className="mt-1 text-xs text-slate-500">หน่วยที่ใช้</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                            บิลค้าง {formatNumber(house.unpaidBills)} ใบ
                          </span>
                          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            ค้างชำระ {formatCurrency(house.outstandingBalance)}
                          </span>
                          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                            พร้อมจดรอบถัดไป
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ประวัติการจดล่าสุด</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                รายการบันทึกมิเตอร์ล่าสุดในระบบ
              </p>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : recentReadings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  ยังไม่มีประวัติการจดมิเตอร์
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recentReadings.map((reading) => (
                    <div key={reading.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">บ้าน {reading.house.houseNumber}</p>
                          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{reading.house.ownerName}</p>
                        </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${reading.isAnomaly ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'}`}>
                          {reading.isAnomaly ? 'ผิดปกติ' : 'ปกติ'}
                        </span>
                        {reading.bill?.isPaid ? (
                          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20" title="จ่ายเงินแล้ว ไม่สามารถแก้ไขได้">
                              จ่ายแล้ว
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                            <button
                              onClick={() => setEditingReading(reading)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                              title="แก้ไข"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReading(reading.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              title="ลบ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-3 dark:bg-slate-950">
                          <p className="text-xs text-slate-500">เลขที่จด</p>
                          <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{formatNumber(reading.readingValue)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3 dark:bg-slate-950">
                          <p className="text-xs text-slate-500">ใช้น้ำ</p>
                          <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{formatNumber(reading.usage)}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>{formatThaiDate(reading.readingDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>{reading.recordedBy?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span>{reading.notes || 'ไม่มีหมายเหตุ'}</span>
                        </div>
                        {reading.imageUrl && (
                          <div className="mt-3">
                            <img
                              src={reading.imageUrl}
                              alt="Meter"
                              className="w-full h-32 object-cover rounded-2xl border border-slate-200 dark:border-slate-800"
                              onClick={() => window.open(reading.imageUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsFormOpen(false); setSelectedHouseId(undefined); }} />
            <div className="relative z-50 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">เพิ่มการจดมิเตอร์</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">บันทึกข้อมูลการใช้น้ำรอบปัจจุบัน</p>
                </div>
                <button onClick={() => { setIsFormOpen(false); setSelectedHouseId(undefined); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 md:p-7">
                <MeterReadingForm
                  houses={houses}
                  initialHouseId={selectedHouseId}
                  onSubmit={handleFormSubmit}
                  onCancel={() => {
                    setIsFormOpen(false)
                    setSelectedHouseId(undefined)
                  }}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bill Preview Modal */}
        {billPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBillPreview(null)} />
            <div className="relative z-50 w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">บันทึกมิเตอร์สำเร็จ!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      บ้าน {billPreview.house.houseNumber} — {billPreview.house.ownerName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setBillPreview(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Meter readings */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                    <p className="text-xs text-slate-500">มิเตอร์เดิม</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatNumber(billPreview.previousReading)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                    <p className="text-xs text-slate-500">มิเตอร์ใหม่</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatNumber(billPreview.currentReading)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center dark:bg-blue-500/10">
                    <p className="text-xs text-blue-600">ใช้น้ำ</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatNumber(billPreview.usage)} <span className="text-xs font-normal">หน่วย</span></p>
                  </div>
                </div>

                {/* Breakdown */}
                {billPreview.breakdown.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 dark:bg-slate-900">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียดค่าน้ำ</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {billPreview.breakdown.map((tier, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{tier.tier} ({tier.usage} หน่วย × ฿{tier.rate})</span>
                          <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(tier.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">ค่าน้ำรอบนี้</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(billPreview.usageFee)}</span>
                    </div>
                    {billPreview.carryOverAmount > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-rose-600 dark:text-rose-400">ยอดค้างชำระ ({billPreview.unpaidBillsCount} บิล)</span>
                        <span className="font-medium text-rose-600 dark:text-rose-400">{formatCurrency(billPreview.carryOverAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <span className="text-base font-semibold text-slate-900 dark:text-white">ยอดรวมทั้งหมด</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(billPreview.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                <button
                  onClick={() => setBillPreview(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ข้ามไปก่อน
                </button>
                <button
                  onClick={handleCreateBill}
                  disabled={isCreatingBill}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingBill ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้างบิล...</>
                  ) : (
                    <><Receipt className="h-4 w-4" /> สร้างบิลทันที</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingReading(null)} />
            <div className="relative z-50 w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">แก้ไขการจดมิเตอร์</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">บ้าน {editingReading.house?.houseNumber} - {editingReading.house?.ownerName}</p>
                </div>
                <button onClick={() => setEditingReading(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">วันที่จด</label>
                      <input 
                        type="date" 
                        name="readingDate" 
                        defaultValue={editingReading.readingDate ? editingReading.readingDate.split('T')[0] : ''} 
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">เลขมิเตอร์</label>
                      <input 
                        type="number" 
                        name="readingValue" 
                        defaultValue={editingReading.readingValue} 
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">หมายเหตุ</label>
                    <textarea 
                      name="notes" 
                      defaultValue={editingReading.notes || ''} 
                      rows={3} 
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white min-h-[80px]" 
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingReading(null)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      ยกเลิก
                    </button>
                    <button type="submit" disabled={isEditSubmitting} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center">
                      {isEditSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : 'บันทึกการแก้ไข'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


