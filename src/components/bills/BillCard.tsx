'use client'

import * as React from 'react'
import {
  Calendar,
  CreditCard,
  Droplets,
  Eye,
  FileText,
  Home,
  MoreVertical,
  Printer,
  User,
} from 'lucide-react'

export type BillStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export interface BillCardProps {
  id: string
  billNumber: string
  houseNumber: string
  ownerName: string
  period: string
  issueDate: string
  dueDate: string
  previousReading: number
  currentReading: number
  usage: number
  ratePerUnit: number
  carryOverAmount?: number
  amount: number
  status: BillStatus
  paidDate?: string
  showActions?: boolean
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onPay?: (id: string) => void
  onPrint?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

const statusConfig = {
  draft: { label: 'ฉบับร่าง', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  issued: { label: 'ออกบิลแล้ว', className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  paid: { label: 'ชำระแล้ว', className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  overdue: { label: 'เกินกำหนด', className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  cancelled: { label: 'ยกเลิก', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

export function BillCard({
  id,
  billNumber,
  houseNumber,
  ownerName,
  period,
  issueDate,
  dueDate,
  previousReading,
  currentReading,
  usage,
  ratePerUnit,
  carryOverAmount = 0,
  amount,
  status,
  paidDate,
  showActions = true,
  onView,
  onEdit,
  onPay,
  onPrint,
  onDelete,
  className,
}: BillCardProps) {
  const config = statusConfig[status]
  const isPayable = status === 'issued' || status === 'overdue'
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={`group overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900/80 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">{billNumber}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
          {showActions && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 opacity-0 transition-all group-hover:opacity-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button type="button" onClick={() => { onView?.(id); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Eye className="h-4 w-4" />ดูรายละเอียด
                  </button>
                  <button type="button" onClick={() => { onEdit?.(id); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <FileText className="h-4 w-4" />แก้ไขข้อมูล
                  </button>
                  <button type="button" onClick={() => { onPrint?.(id); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Printer className="h-4 w-4" />พิมพ์ใบแจ้งหนี้
                  </button>
                  {isPayable && (
                    <>
                      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <button type="button" onClick={() => { onPay?.(id); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                        <CreditCard className="h-4 w-4" />รับชำระ
                      </button>
                    </>
                  )}
                  <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <button type="button" onClick={() => { onDelete?.(id); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                    ลบข้อมูล
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-5 pb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Home className="h-4 w-4 text-sky-500" />
          <span>บ้าน {houseNumber}</span>
          <span className="text-slate-300">|</span>
          <User className="h-4 w-4 text-sky-500" />
          <span className="truncate">{ownerName}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
          <div className="text-center"><p className="text-xs text-slate-500">เลขครั้งก่อน</p><p className="font-semibold">{previousReading.toLocaleString()}</p></div>
          <div className="text-center border-x border-slate-200 dark:border-slate-800"><p className="text-xs text-slate-500">เลขครั้งล่าสุด</p><p className="font-semibold">{currentReading.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-xs text-slate-500">ใช้น้ำ</p><p className="font-semibold text-sky-700 dark:text-sky-300">{usage.toLocaleString()} หน่วย</p></div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 p-4 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2"><Droplets className="h-5 w-5 text-sky-600" /><div><p className="text-xs text-slate-500">ค่าน้ำงวดนี้ {ratePerUnit.toFixed(2)} บาท/หน่วย</p><p className="text-lg font-semibold">{amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p></div></div>
          {carryOverAmount > 0 ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">รวมหนี้ค้างเดิม {carryOverAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p> : null}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>ออกบิล {issueDate}</span></div>
          <div className={`flex items-center gap-1 ${status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : ''}`}><Calendar className="h-4 w-4" /><span>ครบกำหนด {dueDate}</span></div>
        </div>

        {paidDate && status === 'paid' ? <div className="text-sm font-medium text-sky-600 dark:text-sky-400">ชำระเมื่อ {paidDate}</div> : null}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200/80 p-5 pt-4 dark:border-slate-800/70">
        {isPayable ? (
          <button
            type="button"
            onClick={() => onPay?.(id)}
            className="w-full rounded-xl bg-slate-950 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <CreditCard className="mr-2 inline h-4 w-4" />รับชำระ {amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
          </button>
        ) : (
          <div className="w-full text-center text-sm font-medium text-sky-600 dark:text-sky-400">รายการนี้ปิดยอดเรียบร้อยแล้ว</div>
        )}
      </div>
    </div>
  )
}

export default BillCard


