'use client'

import { PublicLayout } from '@/components/layout/PublicLayout'
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react'

export default function ContactPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[40vh] w-full overflow-hidden bg-gradient-to-br from-blue-500 via-sky-500 to-sky-600 text-white py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto relative z-10 px-4 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl drop-shadow-md">
              ติดต่อเรา
            </h1>
            <p className="text-lg text-white/90 md:text-xl font-medium drop-shadow-sm">
              มีข้อสงสัยหรือต้องการความช่วยเหลือ? สามารถติดต่อเราได้ตามช่องทางด้านล่างนี้
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                  ข้อมูลการติดต่อ
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  คุณสามารถติดต่อคณะกรรมการหมู่บ้านเพื่อสอบถามข้อมูลเกี่ยวกับการใช้น้ำประปา หรือแจ้งปัญหาการใช้งานได้ตามรายละเอียดนี้
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ที่ทำการ</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                      164 หมู่ 1 บ.เชียงเครือ ต.เชียงเครือ<br />
                      อ.เมือง จ.กาฬสินธุ์ 46000
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">เบอร์โทรศัพท์</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      098-042-0324
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">อีเมล</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      watchara47114145@gmail.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">เวลาทำการ</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      วันจันทร์ - วันศุกร์: 08:30 - 16:30 น.<br />
                      วันเสาร์ - วันอาทิตย์: ปิดทำการ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form Placeholder */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                ส่งข้อความถึงเรา
              </h2>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="กรอกชื่อของคุณ"
                    className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxx"
                    className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ข้อความหรือเรื่องที่ต้องการติดต่อ
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="กรอกข้อความของคุณที่นี่..."
                    className="w-full resize-none rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <Send className="h-4 w-4" />
                  ส่งข้อความ
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
