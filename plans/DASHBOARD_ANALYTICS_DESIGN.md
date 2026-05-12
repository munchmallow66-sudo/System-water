# 📊 Dashboard & Analytics API Design Document
## Village Water Management System

---

## Overview

Dashboard API สำหรับ Village Admin ดูภาพรวมระบบน้ำประปาหมู่บ้าน รองรับการ query ข้อมูลสรุปแบบ Real-time และ Time-series

---

## 1. SQL Aggregation Queries

### 1.1 รายได้รวมรายเดือน (Monthly Revenue)

```sql
-- ============================================
-- Query: Monthly Revenue Summary
-- ============================================
SELECT 
    billing_year,
    billing_month,
    COUNT(*) as total_bills,
    SUM(total_amount) as total_revenue,
    SUM(paid_amount) as collected_amount,
    SUM(total_amount - paid_amount) as outstanding_amount,
    SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_count,
    SUM(CASE WHEN status = 'UNPAID' THEN 1 ELSE 0 END) as unpaid_count,
    SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_count,
    ROUND(
        (SUM(paid_amount) / NULLIF(SUM(total_amount), 0)) * 100, 
        2
    ) as collection_rate_percent
FROM bills
WHERE village_id = :village_id
  AND is_deleted = false
  AND billing_year = :year
GROUP BY billing_year, billing_month
ORDER BY billing_year DESC, billing_month DESC;
```

### 1.2 ปริมาณน้ำใช้รวม (Total Water Usage)

```sql
-- ============================================
-- Query: Monthly Water Usage Statistics
-- ============================================
WITH monthly_usage AS (
    SELECT 
        billing_year,
        billing_month,
        SUM(units_used) as total_units,
        AVG(units_used) as avg_units_per_house,
        MAX(units_used) as max_usage,
        MIN(units_used) as min_usage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY units_used) as median_usage,
        STDDEV(units_used) as usage_std_dev,
        COUNT(DISTINCT house_id) as houses_with_reading
    FROM meter_readings
    WHERE village_id = :village_id
      AND is_deleted = false
      AND status = 'BILLED'
    GROUP BY billing_year, billing_month
)
SELECT 
    *,
    total_units / NULLIF(houses_with_reading, 0) as avg_per_house,
    LAG(total_units) OVER (ORDER BY billing_year, billing_month) as prev_month_units,
    ROUND(
        ((total_units - LAG(total_units) OVER (ORDER BY billing_year, billing_month)) 
         / NULLIF(LAG(total_units) OVER (ORDER BY billing_year, billing_month), 0)) * 100,
        2
    ) as month_over_month_change_percent
FROM monthly_usage
ORDER BY billing_year DESC, billing_month DESC;
```

### 1.3 บ้านค้างชำระ (Overdue Houses)

```sql
-- ============================================
-- Query: Overdue Houses Detail
-- ============================================
WITH overdue_summary AS (
    SELECT 
        h.id as house_id,
        h.house_number,
        h.zone,
        COUNT(b.id) as overdue_bill_count,
        SUM(b.total_amount - b.paid_amount) as total_outstanding,
        MIN(b.due_date) as oldest_due_date,
        MAX(b.due_date) as latest_due_date,
        EXTRACT(DAY FROM NOW() - MIN(b.due_date)) as days_overdue,
        SUM(b.late_fee) as accumulated_late_fees
    FROM houses h
    JOIN bills b ON h.id = b.house_id
    WHERE h.village_id = :village_id
      AND h.is_deleted = false
      AND b.is_deleted = false
      AND b.status IN ('UNPAID', 'OVERDUE')
      AND b.due_date < CURRENT_DATE
    GROUP BY h.id, h.house_number, h.zone
)
SELECT 
    *,
    CASE 
        WHEN days_overdue <= 30 THEN '1-30 days'
        WHEN days_overdue <= 60 THEN '31-60 days'
        WHEN days_overdue <= 90 THEN '61-90 days'
        ELSE '90+ days'
    END as overdue_category
FROM overdue_summary
ORDER BY total_outstanding DESC
LIMIT 50;
```

### 1.4 Top Usage Houses

```sql
-- ============================================
-- Query: Top Water Consumers
-- ============================================
WITH recent_usage AS (
    SELECT 
        h.id as house_id,
        h.house_number,
        h.zone,
        mr.billing_year,
        mr.billing_month,
        mr.units_used,
        mr.current_reading,
        mr.previous_reading,
        ROW_NUMBER() OVER (
            PARTITION BY h.id 
            ORDER BY mr.billing_year DESC, mr.billing_month DESC
        ) as rn
    FROM houses h
    JOIN meter_readings mr ON h.id = mr.house_id
    WHERE h.village_id = :village_id
      AND h.is_deleted = false
      AND mr.is_deleted = false
      AND mr.status = 'BILLED'
)
SELECT 
    house_id,
    house_number,
    zone,
    AVG(units_used) as avg_monthly_usage,
    MAX(units_used) as peak_usage,
    MIN(units_used) as lowest_usage,
    SUM(units_used) as total_3month_usage,
    COUNT(*) as months_with_data
FROM recent_usage
WHERE rn <= 3  -- Last 3 months
GROUP BY house_id, house_number, zone
HAVING COUNT(*) >= 2  -- At least 2 months of data
ORDER BY avg_monthly_usage DESC
LIMIT 20;
```

### 1.5 กราฟเปรียบเทียบเดือน (Month-over-Month Comparison)

```sql
-- ============================================
-- Query: Revenue & Usage Comparison
-- ============================================
WITH monthly_metrics AS (
    SELECT 
        b.billing_year,
        b.billing_month,
        SUM(b.total_amount) as revenue,
        SUM(b.paid_amount) as collected,
        COUNT(DISTINCT b.house_id) as billed_houses,
        COALESCE(
            (SELECT SUM(mr.units_used) 
             FROM meter_readings mr 
             WHERE mr.village_id = b.village_id
               AND mr.billing_year = b.billing_year
               AND mr.billing_month = b.billing_month
               AND mr.is_deleted = false),
            0
        ) as total_units
    FROM bills b
    WHERE b.village_id = :village_id
      AND b.is_deleted = false
    GROUP BY b.billing_year, b.billing_month, b.village_id
),
with_comparison AS (
    SELECT 
        billing_year,
        billing_month,
        revenue,
        collected,
        total_units,
        billed_houses,
        LAG(revenue) OVER (ORDER BY billing_year, billing_month) as prev_revenue,
        LAG(total_units) OVER (ORDER BY billing_year, billing_month) as prev_units,
        LAG(billed_houses) OVER (ORDER BY billing_year, billing_month) as prev_houses,
        ROUND(
            (revenue - LAG(revenue) OVER (ORDER BY billing_year, billing_month)) 
            / NULLIF(LAG(revenue) OVER (ORDER BY billing_year, billing_month), 0) * 100,
            2
        ) as revenue_change_percent,
        ROUND(
            (total_units - LAG(total_units) OVER (ORDER BY billing_year, billing_month))
            / NULLIF(LAG(total_units) OVER (ORDER BY billing_year, billing_month), 0) * 100,
            2
        ) as usage_change_percent
    FROM monthly_metrics
)
SELECT 
    billing_year || '-' || LPAD(billing_month::text, 2, '0') as period,
    revenue,
    collected,
    total_units,
    billed_houses,
    revenue_change_percent,
    usage_change_percent,
    ROUND(collected / NULLIF(revenue, 0) * 100, 2) as collection_rate
FROM with_comparison
ORDER BY billing_year DESC, billing_month DESC
LIMIT 12;  -- Last 12 months
```

### 1.6 Dashboard Summary (Single Query)

```sql
-- ============================================
-- Query: Complete Dashboard Summary
-- ============================================
WITH current_month AS (
    SELECT 
        EXTRACT(YEAR FROM CURRENT_DATE)::int as year,
        EXTRACT(MONTH FROM CURRENT_DATE)::int as month
),
revenue_stats AS (
    SELECT 
        SUM(CASE 
            WHEN billing_year = (SELECT year FROM current_month) 
                 AND billing_month = (SELECT month FROM current_month)
            THEN total_amount ELSE 0 
        END) as current_month_revenue,
        SUM(CASE 
            WHEN billing_year = (SELECT year FROM current_month) 
                 AND billing_month = (SELECT month FROM current_month)
            THEN paid_amount ELSE 0 
        END) as current_month_collected,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status IN ('UNPAID', 'OVERDUE') 
            THEN total_amount - paid_amount ELSE 0 END) as total_outstanding
    FROM bills
    WHERE village_id = :village_id AND is_deleted = false
),
usage_stats AS (
    SELECT 
        SUM(CASE 
            WHEN billing_year = (SELECT year FROM current_month) 
                 AND billing_month = (SELECT month FROM current_month)
            THEN units_used ELSE 0 
        END) as current_month_usage,
        AVG(units_used) as avg_monthly_usage
    FROM meter_readings
    WHERE village_id = :village_id AND is_deleted = false
),
house_stats AS (
    SELECT 
        COUNT(*) as total_houses,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_houses
    FROM houses
    WHERE village_id = :village_id AND is_deleted = false
),
overdue_stats AS (
    SELECT 
        COUNT(DISTINCT house_id) as houses_with_overdue,
        SUM(total_amount - paid_amount) as total_overdue_amount
    FROM bills
    WHERE village_id = :village_id 
      AND is_deleted = false
      AND status IN ('UNPAID', 'OVERDUE')
      AND due_date < CURRENT_DATE
)
SELECT 
    r.current_month_revenue,
    r.current_month_collected,
    r.total_revenue,
    r.total_outstanding,
    u.current_month_usage,
    u.avg_monthly_usage,
    h.total_houses,
    h.active_houses,
    o.houses_with_overdue,
    o.total_overdue_amount,
    ROUND(
        r.current_month_collected / NULLIF(r.current_month_revenue, 0) * 100, 
        2
    ) as current_collection_rate
FROM revenue_stats r
CROSS JOIN usage_stats u
CROSS JOIN house_stats h
CROSS JOIN overdue_stats o;
```

---

## 2. Index Strategy

### 2.1 Existing Indexes (จาก schema.prisma)

```prisma
// Bills
@@index([houseId, status])
@@index([billingYear, billingMonth])

// Meter Readings  
@@index([houseId, readingDate])
@@index([billingYear, billingMonth])
@@index([villageId])

// Houses
@@index([villageId, status])
```

### 2.2 Recommended Additional Indexes

```sql
-- ============================================
-- Index Strategy for Dashboard Queries
-- ============================================

-- 1. Composite Index สำหรับ Monthly Revenue Query
-- รองรับ: WHERE village_id + GROUP BY year, month
CREATE INDEX idx_bills_village_year_month_status 
ON bills(village_id, billing_year DESC, billing_month DESC, status)
INCLUDE (total_amount, paid_amount);

-- 2. Partial Index สำหรับ Overdue Bills
-- รองรับ: ค้นหาเฉพาะบิลที่ค้างจ่าย (ลดขนาด index)
CREATE INDEX idx_bills_overdue 
ON bills(village_id, due_date, house_id)
WHERE status IN ('UNPAID', 'OVERDUE') AND is_deleted = false;

-- 3. Covering Index สำหรับ Usage Aggregation
-- รองรับ: ไม่ต้อง lookup table หลัก
CREATE INDEX idx_readings_village_date_usage
ON meter_readings(village_id, billing_year DESC, billing_month DESC)
INCLUDE (units_used, house_id)
WHERE is_deleted = false AND status = 'BILLED';

-- 4. Index สำหรับ Top Usage Query
CREATE INDEX idx_readings_house_date_units
ON meter_readings(house_id, billing_year DESC, billing_month DESC)
INCLUDE (units_used)
WHERE is_deleted = false;

-- 5. Index สำหรับ Collection Rate Tracking
CREATE INDEX idx_bills_collection_tracking
ON bills(village_id, issued_at DESC, status)
INCLUDE (total_amount, paid_amount, due_date);
```

### 2.3 Index Usage Analysis

```sql
-- ตรวจสอบ Index Usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,      -- จำนวนครั้งที่ใช้ index
    idx_tup_read,  -- จำนวน tuples ที่อ่าน
    idx_tup_fetch  -- จำนวน tuples ที่ fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ตรวจสอบ Slow Queries
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%bills%' OR query LIKE '%meter_readings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 3. Performance Optimization

### 3.1 Query Optimization Techniques

```typescript
// ============================================
// Dashboard Service with Optimizations
// ============================================

@Injectable()
export class DashboardService {
    
    // 1. Parallel Query Execution
    async getDashboardSummary(villageId: string): Promise<DashboardSummary> {
        const [
            revenueStats,
            usageStats,
            overdueStats,
            houseStats
        ] = await Promise.all([
            this.getRevenueStats(villageId),
            this.getUsageStats(villageId),
            this.getOverdueStats(villageId),
            this.getHouseStats(villageId)
        ]);
        
        return {
            revenue: revenueStats,
            usage: usageStats,
            overdue: overdueStats,
            houses: houseStats
        };
    }
    
    // 2. Materialized View สำหรับ Historical Data
    async refreshMonthlyAggregates(villageId: string) {
        // อัปเดตข้อมูลสรุปรายเดือน (run ครั้งต่อวัน)
        await this.prisma.$executeRaw`
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_stats
            WHERE village_id = ${villageId};
        `;
    }
    
    // 3. Pagination with Cursor
    async getOverdueHouses(
        villageId: string,
        cursor?: string,
        limit: number = 50
    ) {
        return this.prisma.$queryRaw`
            SELECT *
            FROM overdue_houses_view
            WHERE village_id = ${villageId}
              AND (house_number, house_id) > (
                  SELECT house_number, house_id 
                  FROM houses WHERE id = ${cursor}
              )
            ORDER BY house_number
            LIMIT ${limit};
        `;
    }
    
    // 4. Time-Based Aggregation Buckets
    async getUsageTrends(
        villageId: string,
        granularity: 'day' | 'week' | 'month' | 'year'
    ) {
        const timeBucket = {
            day: '1 day',
            week: '1 week',
            month: '1 month',
            year: '1 year'
        }[granularity];
        
        return this.prisma.$queryRaw`
            SELECT 
                time_bucket(${timeBucket}::interval, reading_date) as period,
                SUM(units_used) as total_usage,
                AVG(units_used) as avg_usage,
                COUNT(DISTINCT house_id) as active_houses
            FROM meter_readings
            WHERE village_id = ${villageId}
              AND is_deleted = false
            GROUP BY period
            ORDER BY period DESC
            LIMIT 24;  -- Last 24 periods
        `;
    }
}
```

### 3.2 Materialized Views

```sql
-- ============================================
-- Materialized Views for Dashboard
-- ============================================

-- 1. Monthly Statistics View
CREATE MATERIALIZED VIEW mv_monthly_stats AS
SELECT 
    b.village_id,
    b.billing_year,
    b.billing_month,
    COUNT(DISTINCT b.house_id) as houses_billed,
    SUM(b.total_amount) as total_revenue,
    SUM(b.paid_amount) as total_collected,
    SUM(b.total_amount - b.paid_amount) as outstanding,
    SUM(mr.units_used) as total_usage,
    AVG(mr.units_used) as avg_usage_per_house,
    COUNT(CASE WHEN b.status = 'OVERDUE' THEN 1 END) as overdue_count
FROM bills b
LEFT JOIN meter_readings mr 
    ON b.reading_id = mr.id AND mr.is_deleted = false
WHERE b.is_deleted = false
GROUP BY b.village_id, b.billing_year, b.billing_month;

-- Index บน Materialized View
CREATE UNIQUE INDEX idx_mv_monthly_stats_pk 
ON mv_monthly_stats(village_id, billing_year, billing_month);
CREATE INDEX idx_mv_monthly_stats_village 
ON mv_monthly_stats(village_id);

-- 2. Real-time Statistics View (ไม่ materialized)
CREATE OR REPLACE VIEW v_current_month_stats AS
SELECT 
    village_id,
    SUM(total_amount) as current_revenue,
    SUM(paid_amount) as current_collected,
    COUNT(DISTINCT house_id) as houses_billed
FROM bills
WHERE billing_year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND billing_month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND is_deleted = false
GROUP BY village_id;

-- 3. Refresh Strategy (Run daily at 3 AM)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
SELECT cron.schedule('refresh-dashboard', '0 3 * * *', 
    'SELECT refresh_dashboard_stats()');
```

### 3.3 Connection Pooling (PgBouncer)

```yaml
# ============================================
# PgBouncer Configuration for Dashboard
# ============================================

[databases]
village_water_db = host=localhost port=5432 dbname=village_water

[pgbouncer]
# Transaction Pooling (แนะนำสำหรับ Dashboard queries)
pool_mode = transaction

# Pool Sizes
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
query_timeout = 30
query_wait_timeout = 30

# Dashboard-specific pool (separate from write operations)
[dashboard_pool]
pool_mode = session
default_pool_size = 10
max_client_conn = 100
```

---

## 4. Caching Strategy

### 4.1 Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Caching Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Client-Side Cache (React Query/SWR)              │
│  ├── TTL: 30 seconds (real-time feel)                     │
│  └── Stale-while-revalidate: 5 minutes                    │
│                                                             │
│  Layer 2: CDN/Edge Cache (Vercel/Cloudflare)              │
│  ├── TTL: 1 minute                                        │
│  └── Cache tags: village:{id}:dashboard                   │
│                                                             │
│  Layer 3: Application Cache (Redis)                       │
│  ├── Hot data: 5 minutes                                  │
│  ├── Warm data: 1 hour                                    │
│  └── Cold data: 24 hours                                  │
│                                                             │
│  Layer 4: Database Cache (Neon Postgres)                  │
│  └── Shared buffers: Auto-tuned                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Redis Caching Implementation

```typescript
// ============================================
// Redis Cache Service
// ============================================

@Injectable()
export class DashboardCacheService {
    private readonly CACHE_PREFIX = 'dashboard';
    private readonly DEFAULT_TTL = 300; // 5 minutes
    
    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly dashboardService: DashboardService
    ) {}
    
    // Cache-aside Pattern
    async getMonthlyRevenue(
        villageId: string, 
        year: number
    ): Promise<MonthlyRevenue[]> {
        const cacheKey = `${this.CACHE_PREFIX}:revenue:${villageId}:${year}`;
        
        // 1. Try cache first
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        
        // 2. Query database
        const data = await this.dashboardService.queryMonthlyRevenue(villageId, year);
        
        // 3. Store in cache
        await this.redis.setex(
            cacheKey, 
            this.DEFAULT_TTL, 
            JSON.stringify(data)
        );
        
        return data;
    }
    
    // Write-Through Cache (Invalidate on update)
    async invalidateVillageCache(villageId: string) {
        const pattern = `${this.CACHE_PREFIX}:*:${villageId}:*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    
    // Cache Warming (Background job)
    async warmCacheForVillage(villageId: string) {
        const currentYear = new Date().getFullYear();
        
        // Pre-fetch common dashboard data
        await Promise.all([
            this.getMonthlyRevenue(villageId, currentYear),
            this.getCurrentMonthUsage(villageId),
            this.getOverdueSummary(villageId),
            this.getTopConsumers(villageId)
        ]);
    }
    
    // Semantic Caching (Cache similar queries)
    async getUsageWithSemanticCache(
        villageId: string,
        startDate: Date,
        endDate: Date
    ) {
        // Round dates to nearest hour for cache hits
        const roundedStart = this.roundToHour(startDate);
        const roundedEnd = this.roundToHour(endDate);
        
        const cacheKey = `${this.CACHE_PREFIX}:usage:${villageId}:${roundedStart}:${roundedEnd}`;
        
        // Try cache...
        // Query if not found...
    }
}
```

### 4.3 Cache Invalidation Strategy

```typescript
// ============================================
// Cache Invalidation on Data Changes
// ============================================

@Injectable()
export class BillingEventHandler {
    constructor(private readonly cacheService: DashboardCacheService) {}
    
    @OnEvent('bill.created')
    async handleBillCreated(payload: BillCreatedEvent) {
        // Invalidate real-time stats
        await this.cacheService.invalidateKeys([
            `dashboard:summary:${payload.villageId}`,
            `dashboard:revenue:${payload.villageId}:${payload.year}`,
            `dashboard:overdue:${payload.villageId}`
        ]);
    }
    
    @OnEvent('payment.received')
    async handlePaymentReceived(payload: PaymentReceivedEvent) {
        // Invalidate revenue and collection rate
        await this.cacheService.invalidateKeys([
            `dashboard:summary:${payload.villageId}`,
            `dashboard:revenue:${payload.villageId}:*`
        ]);
    }
    
    @OnEvent('reading.submitted')
    async handleReadingSubmitted(payload: ReadingSubmittedEvent) {
        // Invalidate usage stats
        await this.cacheService.invalidateKeys([
            `dashboard:usage:${payload.villageId}:*`,
            `dashboard:top-consumers:${payload.villageId}`
        ]);
    }
}
```

### 4.4 Client-Side Caching (React Query)

```typescript
// ============================================
// Frontend Caching with React Query
// ============================================

// Dashboard hooks with optimized caching
export function useDashboardSummary(villageId: string) {
    return useQuery({
        queryKey: ['dashboard', 'summary', villageId],
        queryFn: () => dashboardApi.getSummary(villageId),
        staleTime: 30 * 1000,        // 30 seconds
        gcTime: 5 * 60 * 1000,       // 5 minutes
        refetchInterval: 60 * 1000,  // Poll every minute
        refetchOnWindowFocus: true,
    });
}

export function useMonthlyRevenue(villageId: string, year: number) {
    return useQuery({
        queryKey: ['dashboard', 'revenue', villageId, year],
        queryFn: () => dashboardApi.getMonthlyRevenue(villageId, year),
        staleTime: 5 * 60 * 1000,    // 5 minutes (less volatile)
        gcTime: 30 * 60 * 1000,      // 30 minutes
    });
}

// Optimistic updates
export function useProcessPayment() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: paymentApi.process,
        onSuccess: (_, variables) => {
            // Invalidate affected queries
            queryClient.invalidateQueries({
                queryKey: ['dashboard', variables.villageId]
            });
        },
        onMutate: async (variables) => {
            // Optimistically update UI
            await queryClient.cancelQueries({ 
                queryKey: ['dashboard', 'summary', variables.villageId] 
            });
            
            const previousData = queryClient.getQueryData(
                ['dashboard', 'summary', variables.villageId]
            );
            
            // Update cache optimistically
            queryClient.setQueryData(
                ['dashboard', 'summary', variables.villageId],
                (old: any) => ({
                    ...old,
                    currentMonthCollected: old.currentMonthCollected + variables.amount,
                })
            );
            
            return { previousData };
        },
        onError: (_, variables, context) => {
            // Rollback on error
            queryClient.setQueryData(
                ['dashboard', 'summary', variables.villageId],
                context?.previousData
            );
        }
    });
}
```

---

## 5. Neon Postgres Read Replica Strategy

### 5.1 Neon Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Neon Postgres                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐         ┌──────────────────┐            │
│   │ Primary DB   │────────▶│   Read Replica   │            │
│   │ (Read/Write) │   WAL   │   (Read-Only)    │            │
│   └──────────────┘         └──────────────────┘            │
│          │                           │                     │
│          ▼                           ▼                     │
│   ┌──────────────┐         ┌──────────────────┐            │
│   │   Writes     │         │  Dashboard API   │            │
│   │   Billing    │         │   Analytics      │            │
│   │   Mutations  │         │   Reports        │            │
│   └──────────────┘         └──────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Connection String Configuration

```typescript
// ============================================
// Database Configuration with Read Replicas
// ============================================

// .env
DATABASE_URL="postgresql://neondb_owner:...@ep-primary.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
READ_REPLICA_URL="postgresql://neondb_owner:...@ep-replica.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

// Prisma Client setup
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Read replica client
const prismaReadReplica = new PrismaClient({
    datasources: {
        db: {
            url: process.env.READ_REPLICA_URL,
        },
    },
});
```

### 5.3 Service-Level Read/Write Separation

```typescript
// ============================================
// Dashboard Service with Read Replica
// ============================================

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,           // Primary (writes)
        private readonly prismaRead: PrismaReadService,   // Replica (reads)
    ) {}
    
    // All dashboard queries use read replica
    async getMonthlyRevenue(villageId: string, year: number) {
        // Read from replica
        return this.prismaRead.$queryRaw`
            SELECT 
                billing_month,
                SUM(total_amount) as revenue,
                SUM(paid_amount) as collected
            FROM bills
            WHERE village_id = ${villageId}
              AND billing_year = ${year}
              AND is_deleted = false
            GROUP BY billing_month
            ORDER BY billing_month;
        `;
    }
    
    async getWaterUsageStats(villageId: string) {
        return this.prismaRead.meterReading.groupBy({
            by: ['billingYear', 'billingMonth'],
            where: {
                villageId,
                isDeleted: false,
            },
            _sum: { unitsUsed: true },
            _avg: { unitsUsed: true },
            orderBy: [
                { billingYear: 'desc' },
                { billingMonth: 'desc' },
            ],
            take: 12,
        });
    }
    
    // Admin operations use primary
    async refreshMaterializedView(villageId: string) {
        // Write operation - use primary
        return this.prisma.$executeRaw`
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_stats;
        `;
    }
}
```

### 5.4 Automatic Routing Decorator

```typescript
// ============================================
// Decorator for Read/Write Routing
// ============================================

export const UseReadReplica = () => SetMetadata('useReadReplica', true);

@Injectable()
export class DatabaseRoutingInterceptor implements NestInterceptor {
    constructor(
        private readonly prisma: PrismaService,
        private readonly prismaRead: PrismaReadService,
        private readonly reflector: Reflector,
    ) {}
    
    intercept(context: ExecutionContext, next: CallHandler) {
        const useReadReplica = this.reflector.getAllAndOverride<boolean>(
            'useReadReplica',
            [context.getHandler(), context.getClass()],
        );
        
        // Set context for repository injection
        if (useReadReplica) {
            // Use read replica for this request
        }
        
        return next.handle();
    }
}

// Controller usage
@Controller('dashboard')
@UseReadReplica()  // All routes use read replica
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}
    
    @Get('summary')
    getSummary(@Param('villageId') villageId: string) {
        return this.dashboardService.getSummary(villageId);
    }
}
```

### 5.5 Replication Lag Handling

```typescript
// ============================================
// Handle Replication Lag
// ============================================

@Injectable()
export class ReplicationAwareService {
    private readonly MAX_LAG_MS = 5000; // 5 seconds tolerance
    
    constructor(
        private readonly prisma: PrismaService,
        private readonly prismaRead: PrismaReadService,
    ) {}
    
    async queryWithLagCheck<T>(
        queryFn: (prisma: PrismaClient) => Promise<T>,
        freshnessRequired: boolean = false
    ): Promise<T> {
        if (freshnessRequired) {
            // Check replication lag
            const lag = await this.checkReplicationLag();
            
            if (lag > this.MAX_LAG_MS) {
                console.warn(`Replication lag ${lag}ms exceeds threshold`);
                // Fallback to primary
                return queryFn(this.prisma);
            }
        }
        
        // Use read replica
        return queryFn(this.prismaRead);
    }
    
    private async checkReplicationLag(): Promise<number> {
        // Neon-specific query
        const result = await this.prismaRead.$queryRaw<{ lag_ms: number }[]>`
            SELECT 
                EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 as lag_ms
            FROM pg_stat_activity 
            WHERE datname = current_database();
        `;
        
        return result[0]?.lag_ms || 0;
    }
    
    // For critical reads after writes
    async readAfterWrite<T>(
        writeFn: () => Promise<void>,
        readFn: (prisma: PrismaClient) => Promise<T>
    ): Promise<T> {
        await writeFn();
        
        // Small delay to allow replication
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retry logic with primary fallback
        let attempts = 0;
        while (attempts < 3) {
            const result = await readFn(this.prismaRead);
            
            // Verify data consistency
            if (this.isDataValid(result)) {
                return result;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Fallback to primary
        return readFn(this.prisma);
    }
}
```

### 5.6 Neon-Specific Optimizations

```sql
-- ============================================
-- Neon Postgres Optimizations
-- ============================================

-- 1. Connection Pooling Settings
SET neon.max_connections = 1000;
SET neon.connection_limit = 100;

-- 2. Auto-scaling Configuration
-- (Managed via Neon Console)
-- Min: 0.25 vCPU, Max: 4 vCPU
-- Auto-suspend: 5 minutes idle

-- 3. Branching for Analytics
-- Create dedicated read replica branch
-- neon branch create --name analytics --parent main

-- 4. Logical Replication Slot (for real-time sync)
SELECT pg_create_logical_replication_slot('dashboard_slot', 'pgoutput');
```

---

## 6. API Endpoints Summary

```typescript
// ============================================
// Dashboard API Routes
// ============================================

@Controller('api/v1/dashboard')
export class DashboardController {
    
    // GET /api/v1/dashboard/:villageId/summary
    @Get(':villageId/summary')
    @UseReadReplica()
    getSummary(@Param('villageId') villageId: string) {
        return this.service.getSummary(villageId);
    }
    
    // GET /api/v1/dashboard/:villageId/revenue?year=2026
    @Get(':villageId/revenue')
    @UseReadReplica()
    getMonthlyRevenue(
        @Param('villageId') villageId: string,
        @Query('year') year: number,
    ) {
        return this.service.getMonthlyRevenue(villageId, year);
    }
    
    // GET /api/v1/dashboard/:villageId/usage?months=12
    @Get(':villageId/usage')
    @UseReadReplica()
    getUsageStats(
        @Param('villageId') villageId: string,
        @Query('months') months: number = 12,
    ) {
        return this.service.getUsageStats(villageId, months);
    }
    
    // GET /api/v1/dashboard/:villageId/overdue?page=1&limit=50
    @Get(':villageId/overdue')
    @UseReadReplica()
    getOverdueHouses(
        @Param('villageId') villageId: string,
        @Query() pagination: PaginationDto,
    ) {
        return this.service.getOverdueHouses(villageId, pagination);
    }
    
    // GET /api/v1/dashboard/:villageId/top-consumers?limit=20
    @Get(':villageId/top-consumers')
    @UseReadReplica()
    getTopConsumers(
        @Param('villageId') villageId: string,
        @Query('limit') limit: number = 20,
    ) {
        return this.service.getTopConsumers(villageId, limit);
    }
    
    // GET /api/v1/dashboard/:villageId/comparison
    @Get(':villageId/comparison')
    @UseReadReplica()
    getMonthOverMonthComparison(
        @Param('villageId') villageId: string,
        @Query('months') months: number = 12,
    ) {
        return this.service.getComparison(villageId, months);
    }
}
```

---

## 7. Performance Checklist

| Metric | Target | Implementation |
|--------|--------|----------------|
| Dashboard Load | < 500ms | Redis Cache + Read Replica |
| Monthly Revenue Query | < 100ms | Materialized View + Index |
| Top Consumers | < 200ms | Composite Index + Limit |
| Overdue Houses | < 300ms | Partial Index + Pagination |
| Cache Hit Rate | > 80% | Multi-layer caching |
| Replication Lag | < 1s | Neon auto-scaling |
| Concurrent Users | 100+ | PgBouncer pooling |

---

## 8. Monitoring & Alerting

```typescript
// Dashboard performance metrics to track
const METRICS = {
    // Query performance
    'dashboard.query.duration': 'Histogram',
    'dashboard.query.cache_hit': 'Counter',
    'dashboard.query.cache_miss': 'Counter',
    
    // Replication lag
    'database.replication_lag_ms': 'Gauge',
    
    // Connection pool
    'database.connections.active': 'Gauge',
    'database.connections.waiting': 'Gauge',
    
    // Cache performance
    'redis.hit_rate': 'Gauge',
    'redis.memory_usage': 'Gauge',
};
```
