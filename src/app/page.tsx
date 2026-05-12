'use client'

import { useState } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PublicSearchForm } from '@/components/search/PublicSearchForm'
import { SearchResult, type SearchResultData } from '@/components/search/SearchResult'
import { Droplets, Shield, BarChart3, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

export default function HomePage() {
  const [searchResult, setSearchResult] = useState<SearchResultData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (houseNumber: string) => {
    setIsLoading(true)
    setError(null)
    setSearchResult(null)

    try {
      const timestamp = Date.now()
      const response = await fetch(
        `/api/public/search?houseNumber=${encodeURIComponent(houseNumber)}&_t=${timestamp}`,
        { cache: 'no-store' }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูล')
      }

      // Use real billing data from API
      const billingHistory = data.data.billingHistory || []

      const result: SearchResultData = {
        houseNumber: data.data.houseNumber,
        ownerName: data.data.ownerName,
        meterHistory: billingHistory.map((bill: {
          period: string
          previousReading: number
          currentReading: number
          usage: number
          amount: number
          status: string
        }) => ({
          period: bill.period,
          previousReading: bill.previousReading,
          currentReading: bill.currentReading,
          usage: bill.usage,
          amount: bill.amount,
          status: bill.status as 'paid' | 'pending' | 'overdue',
        })),
        outstandingBalance: data.data.outstandingBalance?.amount || 0,
        lastReadingDate: data.data.lastUpdated || new Date().toLocaleDateString('th-TH'),
      }

      setSearchResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: Droplets, title: 'ตรวจสอบการใช้น้ำ', description: 'ดูประวัติการใช้น้ำย้อนหลัง 6 เดือน พร้อมกราฟแสดงแนวโน้ม', color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    { icon: CheckCircle, title: 'ตรวจสอบสถานะการชำระ', description: 'ดูยอดค้างชำระและสถานะการชำระเงินล่าสุด', color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
    { icon: BarChart3, title: 'กราฟแสดงผล', description: 'แสดงข้อมูลการใช้น้ำในรูปแบบกราฟ เข้าใจง่าย ชัดเจน', color: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600' },
    { icon: Shield, title: 'ความปลอดภัย', description: 'ข้อมูลส่วนบุคคลถูกปกป้อง แสดงเฉพาะข้อมูลที่จำเป็น', color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
    { icon: Clock, title: 'อัปเดตตลอดเวลา', description: 'ข้อมูลถูกอัปเดตทุกครั้งที่มีการบันทึกมิเตอร์ใหม่', color: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600' },
    { icon: Users, title: 'บริการทุกคน', description: 'สมาชิกทุกคนสามารถตรวจสอบข้อมูลได้ ไม่ต้องลงทะเบียน', color: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600' },
  ]

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] w-full overflow-hidden bg-gradient-to-br from-blue-500 via-sky-500 to-sky-600 text-white py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto relative z-10 px-4 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-white/20 p-4 backdrop-blur-sm shadow-sm">
              <Droplets className="h-12 w-12" />
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl drop-shadow-md">
              ระบบจัดการน้ำประปาหมู่บ้าน
            </h1>
            <p className="mb-8 text-lg text-white/90 md:text-xl font-medium drop-shadow-sm">
              ตรวจสอบข้อมูลการใช้น้ำ ประวัติการชำระเงิน และยอดค้างชำระได้ง่ายๆ
            </p>

            {/* Search Form */}
            <div className="w-full max-w-2xl mx-auto">
              <PublicSearchForm onSearch={handleSearch} isLoading={isLoading} className="text-left shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <section className="container mx-auto px-4 py-6 md:px-6">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </p>
          </div>
        </section>
      )}

      {/* Search Results */}
      {searchResult && (
        <section className="container mx-auto px-4 py-8 md:px-6">
          <div className="mx-auto max-w-4xl">
            <SearchResult data={searchResult} />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-slate-50/50 py-16 md:py-24 dark:bg-slate-900/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
              บริการของเรา
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              ระบบจัดการน้ำประปาหมู่บ้านที่ครบครัน ตอบโจทย์ทุกความต้องการ
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 flex flex-col items-center text-center">
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-110`}>
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to use Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
              วิธีการใช้งาน
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              เพียง 3 ขั้นตอนง่ายๆ ก็ตรวจสอบข้อมูลได้ทันที
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: 1, title: 'กรอกเลขที่บ้าน', description: 'กรอกเลขที่บ้านของท่านในช่องค้นหา' },
              { step: 2, title: 'กดค้นหา', description: 'กดปุ่มค้นหาเพื่อดึงข้อมูลจากระบบ' },
              { step: 3, title: 'ดูผลลัพธ์', description: 'ดูข้อมูลการใช้น้ำและสถานะการชำระเงิน' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-600 text-2xl font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}


