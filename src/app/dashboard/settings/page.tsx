'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Settings, Plus, Loader2, Edit, Trash2, Droplets, X } from 'lucide-react'

interface WaterRate {
    id: string
    name: string
    minUnits: number
    maxUnits: number
    ratePerUnit: number
    isActive: boolean
}

export default function SettingsPage() {
    const [rates, setRates] = useState<WaterRate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRate, setEditingRate] = useState<WaterRate | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        minUnits: 0,
        maxUnits: 999999,
        ratePerUnit: 0,
        isActive: true,
    })

    useEffect(() => {
        fetchRates()
    }, [])

    const notifyRatesUpdated = () => {
        window.dispatchEvent(new Event('water-rates-updated'))
    }

    const fetchRates = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/settings/water-rates')
            if (response.ok) {
                const data = await response.json()
                setRates(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch rates:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateNew = () => {
        setEditingRate(null)
        setFormData({
            name: '',
            minUnits: 0,
            maxUnits: 999999,
            ratePerUnit: 0,
            isActive: true,
        })
        setIsFormOpen(true)
    }

    const handleEdit = (rate: WaterRate) => {
        setEditingRate(rate)
        setFormData({
            name: rate.name,
            minUnits: Number(rate.minUnits),
            maxUnits: Number(rate.maxUnits),
            ratePerUnit: Number(rate.ratePerUnit),
            isActive: rate.isActive,
        })
        setIsFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบอัตราค่าน้ำ?')) return
        try {
            await fetch(`/api/settings/water-rates/${id}`, { method: 'DELETE' })
            notifyRatesUpdated()
            fetchRates()
        } catch (error) {
            console.error('Failed to delete:', error)
        }
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingRate ? `/api/settings/water-rates/${editingRate.id}` : '/api/settings/water-rates'
            const method = editingRate ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    minUnits: Number(formData.minUnits),
                    maxUnits: Number(formData.maxUnits),
                    ratePerUnit: Number(formData.ratePerUnit),
                }),
            })

            if (response.ok) {
                setIsFormOpen(false)
                notifyRatesUpdated()
                fetchRates()
            }
        } catch (error) {
            console.error('Failed to save rate:', error)
        }
    }

    const handleToggleActive = async (rate: WaterRate) => {
        try {
            await fetch(`/api/settings/water-rates/${rate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !rate.isActive }),
            })
            notifyRatesUpdated()
            fetchRates()
        } catch (error) {
            console.error('Failed to toggle active:', error)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Settings className="h-8 w-8 text-blue-600" />
                            การตั้งค่าระบบ
                        </h1>
                        <p className="text-muted-foreground mt-1 text-slate-500 dark:text-slate-400">
                            จัดการอัตราค่าบริการและพารามิเตอร์อื่นๆ ของระบบ
                        </p>
                    </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-950">
                    <div className="flex flex-col justify-between border-b border-slate-100 bg-slate-50/50 p-6 md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900/50">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                                <Droplets className="h-5 w-5 text-blue-600" />
                                อัตราค่าน้ำประปา
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                กำหนดขั้นบันไดและราคาต่อหน่วยสำหรับการคำนวณบิล
                            </p>
                        </div>
                        <button onClick={handleCreateNew} className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 font-medium text-white shadow-sm hover:from-blue-600 hover:to-sky-700 md:mt-0 transition-all">
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มอัตราค่าบริการ
                        </button>
                    </div>
                    <div className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50/80 text-slate-900 dark:bg-slate-900/60 dark:text-white">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">ชื่อแพ็กเกจ/ช่วง</th>
                                            <th className="px-6 py-3 text-right font-medium">หน่วยเริ่มต้น</th>
                                            <th className="px-6 py-3 text-right font-medium">หน่วยสิ้นสุด</th>
                                            <th className="px-6 py-3 text-right font-medium">ราคาต่อหน่วย (บาท)</th>
                                            <th className="px-6 py-3 text-center font-medium">สถานะใช้งาน</th>
                                            <th className="px-6 py-3 text-center font-medium">ตรวจสอบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {rates.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                                    ยังไม่มีการตั้งค่าอัตราค่าน้ำประปา
                                                </td>
                                            </tr>
                                        ) : (
                                            rates.map((rate) => (
                                                <tr key={rate.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                                                    <td className="px-6 py-4 font-medium text-blue-700 dark:text-blue-400">
                                                        {rate.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">{Number(rate.minUnits).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {Number(rate.maxUnits) >= 999999 ? 'ขึ้นไป' : Number(rate.maxUnits).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                                                        ฿{Number(rate.ratePerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                      <label className="relative inline-flex cursor-pointer items-center">
                                                        <input type="checkbox" className="peer sr-only" checked={rate.isActive} onChange={() => handleToggleActive(rate)} />
                                                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-700 dark:peer-focus:ring-blue-800"></div>
                                                      </label>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors" onClick={() => handleEdit(rate)}>
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-colors" onClick={() => handleDelete(rate.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dialog Form */}
                {isFormOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
                    <div className="relative z-50 w-full max-w-md rounded-[28px] bg-white shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{editingRate ? 'แก้ไขอัตราค่าน้ำ' : 'เพิ่มอัตราค่าน้ำใหม่'}</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">บันทึกหรือการแก้ไขข้อมูลนี้จะมีผลกับการออกบิลระบบครั้งต่อไป</p>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อเรียก (เช่น ช่วงที่ 1 หรือ เหมาจ่าย)</label>
                                <input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="minUnits" className="text-sm font-medium text-slate-700 dark:text-slate-300">หน่วยเริ่มต้น</label>
                                    <input
                                        id="minUnits"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.minUnits}
                                        onChange={(e) => setFormData({ ...formData, minUnits: Number(e.target.value) })}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="maxUnits" className="text-sm font-medium text-slate-700 dark:text-slate-300">หน่วยสิ้นสุด</label>
                                    <input
                                        id="maxUnits"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.maxUnits}
                                        onChange={(e) => setFormData({ ...formData, maxUnits: Number(e.target.value) })}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">ใส่ 999999 หากไม่จำกัด</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="ratePerUnit" className="text-sm font-medium text-slate-700 dark:text-slate-300">ราคาต่อหน่วย (บาท)</label>
                                <input
                                    id="ratePerUnit"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.ratePerUnit}
                                    onChange={(e) => setFormData({ ...formData, ratePerUnit: Number(e.target.value) })}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex cursor-pointer items-center">
                                  <input type="checkbox" className="peer sr-only" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-700 dark:peer-focus:ring-blue-800"></div>
                                </label>
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">เปิดใช้งานทันที</label>
                            </div>
                            <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                                    ยกเลิก
                                </button>
                                <button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700">
                                    {editingRate ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    </div>
                  </div>
                )}
            </div>
        </DashboardLayout>
    )
}


