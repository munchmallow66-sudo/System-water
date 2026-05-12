import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  createUserSchema,
  createHouseSchema,
  updateHouseSchema,
  createMeterReadingSchema,
  createPaymentSchema,
  publicSearchSchema,
  paginationSchema,
} from '@/lib/validations'

// ============================================
// Login Schema
// ============================================
describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('should reject short password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================
// Create User Schema
// ============================================
describe('createUserSchema', () => {
  it('should validate correct user data', () => {
    const result = createUserSchema.safeParse({
      email: 'staff@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'STAFF',
    })
    expect(result.success).toBe(true)
  })

  it('should validate ADMIN role', () => {
    const result = createUserSchema.safeParse({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin',
      role: 'ADMIN',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
      role: 'SUPERADMIN',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing name', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'STAFF',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// House Schema
// ============================================
describe('createHouseSchema', () => {
  it('should validate correct house data', () => {
    const result = createHouseSchema.safeParse({
      houseNumber: '123/45',
      ownerName: 'สมชาย ใจดี',
    })
    expect(result.success).toBe(true)
  })

  it('should validate house with minimal data', () => {
    const result = createHouseSchema.safeParse({
      houseNumber: '1',
      ownerName: 'ทดสอบ',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty house number', () => {
    const result = createHouseSchema.safeParse({
      houseNumber: '',
      ownerName: 'ทดสอบ',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty owner name', () => {
    const result = createHouseSchema.safeParse({
      houseNumber: '123',
      ownerName: '',
    })
    expect(result.success).toBe(false)
  })

  it('should allow optional fields as empty strings', () => {
    const result = createHouseSchema.safeParse({
      houseNumber: '123',
      ownerName: 'ทดสอบ',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateHouseSchema', () => {
  it('should allow partial updates', () => {
    const result = updateHouseSchema.safeParse({
      ownerName: 'ชื่อใหม่',
    })
    expect(result.success).toBe(true)
  })

  it('should allow isActive update', () => {
    const result = updateHouseSchema.safeParse({
      isActive: false,
    })
    expect(result.success).toBe(true)
  })

  it('should allow empty object', () => {
    const result = updateHouseSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

// ============================================
// Meter Reading Schema
// ============================================
describe('createMeterReadingSchema', () => {
  it('should validate correct meter reading', () => {
    const result = createMeterReadingSchema.safeParse({
      houseId: 'clxxxxxxxxx',
      readingValue: 150.5,
    })
    expect(result.success).toBe(true)
  })

  it('should validate reading with zero value', () => {
    const result = createMeterReadingSchema.safeParse({
      houseId: 'clxxxxxxxxx',
      readingValue: 0,
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative reading value', () => {
    const result = createMeterReadingSchema.safeParse({
      houseId: 'clxxxxxxxxx',
      readingValue: -10,
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing house ID', () => {
    const result = createMeterReadingSchema.safeParse({
      readingValue: 100,
    })
    expect(result.success).toBe(false)
  })

  it('should accept optional notes', () => {
    const result = createMeterReadingSchema.safeParse({
      houseId: 'clxxxxxxxxx',
      readingValue: 100,
      notes: 'มิเตอร์ชำรุด',
    })
    expect(result.success).toBe(true)
  })
})

// ============================================
// Payment Schema
// ============================================
describe('createPaymentSchema', () => {
  it('should validate correct payment', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: 250,
      paymentMethod: 'CASH',
    })
    expect(result.success).toBe(true)
  })

  it('should validate PromptPay payment', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: 500,
      paymentMethod: 'PROMPTPAY',
      notes: 'โอนผ่านพร้อมเพย์',
    })
    expect(result.success).toBe(true)
  })

  it('should reject zero amount', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: 0,
      paymentMethod: 'CASH',
    })
    expect(result.success).toBe(false)
  })

  it('should reject negative amount', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: -100,
      paymentMethod: 'CASH',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid payment method', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: 100,
      paymentMethod: 'CREDIT_CARD',
    })
    expect(result.success).toBe(false)
  })

  it('should default to CASH if not specified', () => {
    const result = createPaymentSchema.safeParse({
      billId: 'bill123',
      amount: 100,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paymentMethod).toBe('CASH')
    }
  })
})

// ============================================
// Public Search Schema
// ============================================
describe('publicSearchSchema', () => {
  it('should validate correct house number', () => {
    const result = publicSearchSchema.safeParse({
      houseNumber: '123/45',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty house number', () => {
    const result = publicSearchSchema.safeParse({
      houseNumber: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing house number', () => {
    const result = publicSearchSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================
// Pagination Schema
// ============================================
describe('paginationSchema', () => {
  it('should validate with defaults', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
      expect(result.data.sortOrder).toBe('asc')
    }
  })

  it('should accept custom page and limit', () => {
    const result = paginationSchema.safeParse({
      page: '2',
      limit: '50',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(50)
    }
  })

  it('should reject page less than 1', () => {
    const result = paginationSchema.safeParse({
      page: '0',
    })
    expect(result.success).toBe(false)
  })

  it('should reject limit over 2000', () => {
    const result = paginationSchema.safeParse({
      limit: '5000',
    })
    expect(result.success).toBe(false)
  })

  it('should accept search parameter', () => {
    const result = paginationSchema.safeParse({
      search: 'สมชาย',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe('สมชาย')
    }
  })

  it('should accept sort order desc', () => {
    const result = paginationSchema.safeParse({
      sortOrder: 'desc',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid sort order', () => {
    const result = paginationSchema.safeParse({
      sortOrder: 'random',
    })
    expect(result.success).toBe(false)
  })
})
