'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { WaterUsageChart } from '@/components/dashboard/WaterUsageChart'
import {
  Droplets,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  FileText,
  Plus
} from 'lucide-react'

interface DashboardStats {
  totalHouses: number
  activeHouses: number
  totalBills: number
  unpaidBills: number
  totalRevenue: number
  monthlyRevenue: number
  pendingPayments: number
  anomalies: number
}

interface WaterUsageData {
  month: string
  usage: number
  amount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [waterUsage, setWaterUsage] = useState<WaterUsageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [statsRes, usageRes, billsRes, sessionRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/water-usage'),
          fetch('/api/bills?limit=5'),
          fetch('/api/auth/session')
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          const rawStats = statsData.data || {}
          setSummary(rawStats)

          setStats({
            totalHouses: rawStats.houses?.total || 0,
            activeHouses: rawStats.houses?.active || 0,
            totalBills: rawStats.readings?.currentMonth || 0,
            unpaidBills: rawStats.bills?.unpaid || 0,
            totalRevenue: rawStats.revenue?.currentMonth || 0,
            monthlyRevenue: rawStats.revenue?.currentMonth || 0,
            pendingPayments: rawStats.outstanding?.amount || 0,
            anomalies: rawStats.anomalies?.total || 0,
          })
        }

        if (usageRes.ok) {
          const usageData = await usageRes.json()
          const dataFromApi = usageData.data?.monthlyData || []
          const formattedData = dataFromApi.map((item: any) => ({
            month: item.month,
            usage: item.totalUsage || 0,
            amount: (item.totalUsage || 0) * 10,
          }))
          setWaterUsage(formattedData)
        }

        if (billsRes.ok) {
          const billsData = await billsRes.json()
          setRecentBills(billsData.data || [])
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          setUser(sessionData.user)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              แดชบอร์ด
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              ยินดีต้อนรับ, {user?.name || 'ผู้ใช้งาน'}! นี่คือภาพรวมของระบบ
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/meters')}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              บันทึกมิเตอร์
            </button>
            <button
              onClick={() => router.push('/dashboard/bills')}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              ออกบิล
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="บ้านทั้งหมด"
            value={stats?.totalHouses || 0}
            description={`${stats?.activeHouses || 0} หลังที่ใช้งานอยู่`}
            icon={Users}
            trend={{ value: 0, isPositive: true }}
            className="border-l-4 border-l-blue-500"
          />
          <StatsCard
            title="บิลที่ยังไม่ชำระ"
            value={stats?.unpaidBills || 0}
            description={`จาก ${stats?.totalBills || 0} บิลเดือนนี้`}
            icon={FileText}
            trend={{ value: summary?.readings?.change || 0, isPositive: summary?.readings?.change < 0 }}
            className="border-l-4 border-l-yellow-500"
          />
          <StatsCard
            title="รายได้เดือนนี้"
            value={`฿${(stats?.monthlyRevenue || 0).toLocaleString()}`}
            description="รายได้รวมของเดือนนี้"
            icon={DollarSign}
            trend={{ value: summary?.revenue?.change || 0, isPositive: (summary?.revenue?.change || 0) >= 0 }}
            className="border-l-4 border-l-green-500"
          />
          <StatsCard
            title="ค่าน้ำผิดปกติ"
            value={stats?.anomalies || 0}
            description="มิเตอร์ที่ต้องตรวจสอบ"
            icon={AlertTriangle}
            trend={{ value: 0, isPositive: true }}
            className="border-l-4 border-l-red-500"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Water Usage Chart */}
          <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="px-6 pt-5 pb-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Droplets className="h-5 w-5 text-blue-600" />
                กราฟการใช้น้ำ
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">ปริมาณการใช้น้ำและรายได้ 6 เดือนล่าสุด</p>
            </div>
            <div className="px-6 pb-6">
              <WaterUsageChart data={waterUsage} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="px-6 pt-5 pb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">การดำเนินการด่วน</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">งานที่ต้องดำเนินการ</p>
            </div>
            <div className="px-6 pb-6 space-y-4">
              {[
                { label: 'บิลค้างชำระ', description: `${stats?.unpaidBills || 0} บิลรอเก็บเงิน`, icon: AlertTriangle, bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', iconBg: 'bg-yellow-100 dark:bg-yellow-900/50', iconColor: 'text-yellow-600', action: 'ดูทั้งหมด', actionClass: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300', href: '/dashboard/bills?status=unpaid' },
                { label: 'บันทึกมิเตอร์', description: 'บันทึกค่ามิเตอร์รายเดือน', icon: Droplets, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', iconBg: 'bg-blue-100 dark:bg-blue-900/50', iconColor: 'text-blue-600', action: 'บันทึก', actionClass: 'bg-blue-600 text-white hover:bg-blue-700', href: '/dashboard/meters' },
                { label: 'รับชำระเงิน', description: 'บันทึกการชำระเงิน', icon: DollarSign, bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', iconBg: 'bg-green-100 dark:bg-green-900/50', iconColor: 'text-green-600', action: 'บันทึก', actionClass: 'bg-green-600 text-white hover:bg-green-700', href: '/dashboard/payments' },
                { label: 'ค่าน้ำผิดปกติ', description: `${stats?.anomalies || 0} รายการต้องตรวจสอบ`, icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', iconBg: 'bg-red-100 dark:bg-red-900/50', iconColor: 'text-red-600', action: 'ตรวจสอบ', actionClass: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300', href: '/dashboard/meters?anomaly=true' },
              ].map((item) => (
                <div key={item.label} className={`flex items-center justify-between p-3 rounded-xl ${item.bg} border ${item.border}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.iconBg}`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(item.href)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${item.actionClass}`}
                  >
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Bills */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="px-6 pt-5 pb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">บิลล่าสุด</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">10 บิลล่าสุดในระบบ</p>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {recentBills.length > 0 ? (
                  recentBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 px-2 rounded-md transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/bills`)}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">#{bill.billNumber}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">บ้านเลขที่ {bill.houseNumber} - {bill.ownerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">฿{bill.totalAmount.toLocaleString()}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${bill.isPaid ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                          {bill.isPaid ? 'ชำระแล้ว' : 'ค้างชำระ'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">ไม่มีข้อมูลบิลล่าสุด</div>
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard/bills')}
                className="w-full mt-4 rounded-xl border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ดูบิลทั้งหมด
              </button>
            </div>
          </div>

          {/* Revenue Summary */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="px-6 pt-5 pb-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-green-600" />
                สรุปรายได้
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">ภาพรวมรายได้ของระบบ</p>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">รายได้รวมทั้งหมด</p>
                    <p className="text-2xl font-bold text-green-600">฿{(stats?.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+{summary?.revenue?.change || 0}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700 dark:text-slate-300">เดือนนี้</span>
                    <span className="font-medium text-slate-900 dark:text-white">฿{(stats?.monthlyRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700 dark:text-slate-300">รอเก็บเกี่ยว</span>
                    <span className="font-medium text-yellow-600">฿{(stats?.pendingPayments || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700 dark:text-slate-300">อัตราการชำระ</span>
                    <span className="font-medium text-green-600">85%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-2">
                    <button className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      รายงานรายเดือน
                    </button>
                    <button className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      ส่งออก CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


