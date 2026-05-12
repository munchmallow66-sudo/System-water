'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HouseCard } from '@/components/houses/HouseCard'
import { HouseForm } from '@/components/houses/HouseForm'
import { Plus, Search, Loader2, Home, Users, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface House {
  id: string
  houseNumber: string
  ownerName: string
  imageUrl?: string;
  initialReading: number
  isActive: boolean
  unpaidBills: number
  outstandingBalance: number
  totalReadings: number
  latestReading?: {
    id: string
    readingValue: number
    usage: number
    readingDate: string
  } | null
  createdAt: string
}

export default function HousesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [houses, setHouses] = useState<House[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHouse, setEditingHouse] = useState<House | null>(null)
  const [deleteHouse, setDeleteHouse] = useState<House | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchHouses()
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.user?.role || '')
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error)
    }
  }

  const fetchHouses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/houses')
      if (response.ok) {
        const data = await response.json()
        setHouses(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch houses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateHouse = () => {
    if (userRole !== 'ADMIN') return
    setEditingHouse(null)
    setIsFormOpen(true)
  }

  const handleEditHouse = (house: House) => {
    if (userRole !== 'ADMIN') return
    setEditingHouse(house)
    setIsFormOpen(true)
  }

  const handleDeleteHouse = async () => {
    if (!deleteHouse || userRole !== 'ADMIN') return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/houses/${deleteHouse.id}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'ไม่สามารถลบข้อมูลบ้านได้')
      }

      setHouses(houses.filter(h => h.id !== deleteHouse.id))
      setDeleteHouse(null)
      toast({
        title: 'ลบข้อมูลบ้านแล้ว',
        description: `บ้านเลขที่ ${deleteHouse.houseNumber} ถูกลบออกจากระบบแล้ว`,
      })
    } catch (error) {
      console.error('Failed to delete house:', error)
      toast({
        title: 'ลบข้อมูลบ้านไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormSubmit = async (data: any, imageFile?: File | null) => {
    setIsSubmitting(true)
    try {
      let imageUrl = editingHouse?.imageUrl

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('folder', 'system-water/houses')

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          imageUrl = uploadData.data.secureUrl
        } else {
          console.error('Failed to upload image')
          alert('ไม่สามารถอัปโหลดรูปภาพได้')
        }
      }

      const payload = { ...data, imageUrl }

      const url = editingHouse ? `/api/houses/${editingHouse.id}` : '/api/houses'
      const method = editingHouse ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setIsFormOpen(false)
        fetchHouses()
      } else {
        const errData = await response.json()
        alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${errData.error || 'ไม่ทราบสาเหตุ'}`)
        console.error('Failed to save house response:', errData)
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
      console.error('Failed to save house:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredHouses = houses.filter(house =>
    house.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    house.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              จัดการบ้าน/สมาชิก
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              จัดการข้อมูลบ้านและสมาชิกในระบบ
            </p>
          </div>
          {userRole === 'ADMIN' && (
            <button
              onClick={handleCreateHouse}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-sky-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มบ้านใหม่
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Home, label: 'บ้านทั้งหมด', value: houses.length, color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
            { icon: Users, label: 'ใช้งานอยู่', value: houses.filter(h => h.isActive).length, color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
            { icon: Home, label: 'มีบิลค้างชำระ', value: houses.filter(h => h.unpaidBills > 0).length, color: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            placeholder="ค้นหาบ้านเลขที่, ชื่อเจ้าของบ้าน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Houses Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredHouses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Home className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">ไม่พบข้อมูลบ้าน</p>
            {userRole === 'ADMIN' && (
              <button onClick={handleCreateHouse} className="mt-4 inline-flex items-center rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 text-sm font-medium text-white">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มบ้านใหม่
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHouses.map((house) => (
              <HouseCard
                key={house.id}
                id={house.id}
                houseNumber={house.houseNumber}
                ownerName={house.ownerName}
                imageUrl={house.imageUrl}
                latestReading={house.latestReading ? {
                  date: house.latestReading.readingDate,
                  units: house.latestReading.readingValue,
                } : undefined}
                paymentStatus={house.unpaidBills > 0 ? 'overdue' : 'paid'}
                outstandingBalance={Number(house.outstandingBalance || 0)}
                onEdit={() => handleEditHouse(house)}
                onDelete={() => setDeleteHouse(house)}
                onClick={() => router.push(`/dashboard/houses/${house.id}`)}
                showActions={userRole === 'ADMIN'}
              />
            ))}
          </div>
        )}

        {/* House Form Dialog */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
            <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingHouse ? 'แก้ไขข้อมูลบ้าน' : 'เพิ่มบ้านใหม่'}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {editingHouse ? 'แก้ไขข้อมูลบ้านในระบบ' : 'เพิ่มข้อมูลบ้านใหม่ในระบบ'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <HouseForm
                defaultValues={editingHouse ? {
                  houseNumber: editingHouse.houseNumber,
                  ownerName: editingHouse.ownerName,
                  imageUrl: editingHouse.imageUrl,
                  initialReading: editingHouse.initialReading,
                  isActive: editingHouse.isActive,
                } : undefined}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                isEditing={!!editingHouse}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteHouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteHouse(null)} />
            <div className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">ยืนยันการลบ</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                คุณแน่ใจหรือไม่ที่จะลบข้อมูลบ้าน &quot;{deleteHouse?.houseNumber}&quot;?
                การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteHouse(null)}
                  disabled={isDeleting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteHouse}
                  disabled={isDeleting}
                  className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังลบ...
                    </>
                  ) : (
                    'ลบ'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


