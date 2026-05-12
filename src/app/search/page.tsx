'use client'

import { useState, useCallback } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PublicSearchForm } from '@/components/search/PublicSearchForm'
import { SearchResult, type SearchResultData } from '@/components/search/SearchResult'
import { Search, RefreshCw, AlertTriangle } from 'lucide-react'

export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<SearchResultData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchedHouse, setLastSearchedHouse] = useState<string>('')
  const [lastFetchTime, setLastFetchTime] = useState<string>('')

  const handleSearch = useCallback(async (houseNumber: string) => {
    setIsLoading(true)
    setError(null)
    setSearchResult(null)

    try {
      // Add timestamp to prevent browser caching
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
          dueDate: string
          paidAt: string | null
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
      setLastSearchedHouse(houseNumber)
      setLastFetchTime(new Date().toLocaleTimeString('th-TH'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh current results
  const handleRefresh = () => {
    if (lastSearchedHouse) {
      handleSearch(lastSearchedHouse)
    }
  }

  return (
    <PublicLayout>
      {/* Hero Section for Search */}
      <section className="relative flex flex-col items-center justify-center min-h-[30vh] w-full overflow-hidden bg-gradient-to-br from-blue-500 via-sky-500 to-sky-600 text-white py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto relative z-10 px-4 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-white/20 p-4 backdrop-blur-sm shadow-sm">
              <Search className="h-10 w-10" />
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl drop-shadow-md">
              ค้นหาข้อมูลการใช้น้ำ
            </h1>
            <p className="text-lg text-white/90 md:text-xl font-medium drop-shadow-sm">
              ตรวจสอบประวัติการใช้น้ำ ยอดค้างชำระ และสถานะการชำระเงิน
            </p>
          </div>
        </div>
      </section>

      {/* Main Search Area */}
      <section className="py-12 md:py-16 bg-slate-50 min-h-[50vh] dark:bg-slate-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto -mt-24 relative z-20">
            <PublicSearchForm onSearch={handleSearch} isLoading={isLoading} className="shadow-xl" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-auto max-w-3xl mt-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <p className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResult && (
            <div className="mx-auto max-w-4xl mt-8">
              {/* Refresh bar */}
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ดึงข้อมูลล่าสุดเมื่อ: <span className="font-medium text-slate-700 dark:text-slate-300">{lastFetchTime}</span>
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  รีเฟรชข้อมูล
                </button>
              </div>
              <SearchResult data={searchResult} />
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
