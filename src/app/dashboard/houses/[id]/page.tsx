'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
    Droplets,
    ArrowLeft,
    Loader2,
    User,
    Home,
    AlertCircle,
    FileText
} from 'lucide-react'

export default function HouseDetailsPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const houseId = params?.id

    const [house, setHouse] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (houseId) fetchHouseData()
    }, [houseId])

    const fetchHouseData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/houses/${houseId}`)
            if (response.ok) {
                const data = await response.json()
                setHouse(data.data)
            } else {
                router.push('/dashboard/houses')
            }
        } catch (error) {
            console.error('Failed to fetch house:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        )
    }

    if (!house) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">ไม่พบข้อมูลบ้าน</h2>
                    <button onClick={() => router.push('/dashboard/houses')} className="mt-2 text-sm text-blue-600 hover:underline">
                        กลับหน้าจัดการบ้าน
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header Navigation */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/houses')} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                            ข้อมูลบ้านเลขที่ {house?.houseNumber}
                        </h1>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info Card */}
                    <div className="md:col-span-1 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-blue-900 dark:bg-slate-950">
                        <div className="h-32 bg-gradient-to-br from-blue-500/20 to-sky-600/20 flex items-center justify-center">
                            {house?.imageUrl ? (
                                <img src={house.imageUrl} alt={house.houseNumber} className="w-full h-full object-cover" />
                            ) : (
                                <Home className="h-16 w-16 text-blue-600/50" />
                            )}
                        </div>
                        <div className="-mt-12 relative z-10 text-center">
                            <div className="mx-auto bg-white p-1 rounded-full w-24 h-24 border-4 border-white overflow-hidden shadow-sm dark:bg-slate-950 dark:border-slate-950">
                                {house?.imageUrl ? (
                                    <img src={house.imageUrl} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-blue-600">{house.houseNumber}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pt-6 space-y-4 text-center pb-6 px-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{house?.ownerName}</h2>
                                <div className="flex items-center justify-center mt-1">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${house?.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                                        {house?.isActive ? "กำลังใช้งาน" : "ไม่ใช้งาน"}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    บันทึกข้อมูลเมื่อ: {new Date(house.createdAt).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Records Cards */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ยอดค้างชำระทั้งหมด</p>
                                        <p className="text-3xl font-bold text-red-600">
                                            ฿{house.outstandingBalance?.toLocaleString() || '0'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                                        <FileText className="h-6 w-6 text-red-600" />
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Link href={`/dashboard/payments?houseId=${house.id}`} className="w-full text-center rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        รับชำระเงิน
                                    </Link>
                                    <Link href={`/dashboard/bills?houseId=${house.id}`} className="w-full text-center rounded-xl bg-blue-600 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700">
                                        ดูบิลแจ้งหนี้
                                    </Link>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">มิเตอร์ล่าสุด</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {house.latestReading?.readingValue || '0'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                                        <Droplets className="h-6 w-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-1">
                                    <Link href={`/dashboard/meters?houseId=${house.id}`} className="w-full text-center rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        ประวัติมิเตอร์
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                            <div className="px-6 pt-5 pb-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">ประวัติการจดมิเตอร์ 6 เดือนล่าสุด</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">ข้อมูลปริมาณการใช้น้ำแต่ละเดือน</p>
                            </div>
                            <div className="px-6 pb-6">
                                <div className="space-y-4">
                                    {house.recentReadings?.length ? house.recentReadings.map((reading: any, index: number) => (
                                                <div key={reading.id || index} className="flex items-center gap-4 py-2 border-b last:border-0 border-slate-100 dark:border-slate-800">
                                                    {reading.imageUrl && (
                                                        <div className="shrink-0">
                                                            <img 
                                                                src={reading.imageUrl} 
                                                                alt="Meter" 
                                                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-800 cursor-pointer"
                                                                onClick={() => window.open(reading.imageUrl, '_blank')}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 flex justify-between items-center">
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900 dark:text-white">
                                                                {new Date(reading.readingDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">ใช้น้ำไป: {reading.usage} หน่วย</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reading.isAnomaly ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                {reading.isAnomaly ? 'ผิดปกติ' : 'ปกติ'}
                                                            </span>
                                                            <p className="text-xs font-semibold mt-1 text-slate-700 dark:text-slate-300">เลขมิเตอร์: {reading.readingValue}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                    )) : (
                                        <p className="text-sm text-slate-500 text-center py-4 dark:text-slate-400">ยังไม่มีประวัติการจดมิเตอร์</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
