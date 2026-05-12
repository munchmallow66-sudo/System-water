import { describe, it, expect } from 'vitest'
import { isAdmin, isStaffOrAdmin, canCreatePayments, canCreateReadings } from '@/lib/auth'

// ============================================
// Role-based Authorization Helpers
// ============================================
describe('isAdmin', () => {
  it('should return true for ADMIN role', () => {
    expect(isAdmin({ role: 'ADMIN' })).toBe(true)
  })

  it('should return false for STAFF role', () => {
    expect(isAdmin({ role: 'STAFF' })).toBe(false)
  })

  it('should return false for unknown role', () => {
    expect(isAdmin({ role: 'USER' })).toBe(false)
  })
})

describe('isStaffOrAdmin', () => {
  it('should return true for ADMIN', () => {
    expect(isStaffOrAdmin({ role: 'ADMIN' })).toBe(true)
  })

  it('should return true for STAFF', () => {
    expect(isStaffOrAdmin({ role: 'STAFF' })).toBe(true)
  })

  it('should return false for unknown role', () => {
    expect(isStaffOrAdmin({ role: 'USER' })).toBe(false)
  })
})

describe('canCreatePayments', () => {
  it('should return true for ADMIN', () => {
    expect(canCreatePayments({ role: 'ADMIN' })).toBe(true)
  })

  it('should return true for STAFF', () => {
    expect(canCreatePayments({ role: 'STAFF' })).toBe(true)
  })

  it('should return false for unknown role', () => {
    expect(canCreatePayments({ role: 'VIEWER' })).toBe(false)
  })
})

describe('canCreateReadings', () => {
  it('should return true for ADMIN', () => {
    expect(canCreateReadings({ role: 'ADMIN' })).toBe(true)
  })

  it('should return true for STAFF', () => {
    expect(canCreateReadings({ role: 'STAFF' })).toBe(true)
  })

  it('should return false for unknown role', () => {
    expect(canCreateReadings({ role: 'VIEWER' })).toBe(false)
  })
})
