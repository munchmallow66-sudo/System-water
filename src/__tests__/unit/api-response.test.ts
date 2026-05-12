import { describe, it, expect } from 'vitest'
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiPaginated,
  apiServerError,
  getClientIp,
  parseJsonBody,
} from '@/lib/api-response'

describe('apiSuccess', () => {
  it('should return success response with data', async () => {
    const response = apiSuccess({ id: '1', name: 'Test' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ id: '1', name: 'Test' })
  })

  it('should support custom status code', async () => {
    const response = apiSuccess({ id: '1' }, 201)
    expect(response.status).toBe(201)
  })

  it('should handle null data', async () => {
    const response = apiSuccess(null)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })

  it('should handle array data', async () => {
    const response = apiSuccess([1, 2, 3])
    const body = await response.json()

    expect(body.data).toEqual([1, 2, 3])
  })
})

describe('apiError', () => {
  it('should return error response', async () => {
    const response = apiError('Something went wrong')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Something went wrong')
  })

  it('should support custom status code', async () => {
    const response = apiError('Server error', 500)
    expect(response.status).toBe(500)
  })

  it('should include details when provided', async () => {
    const details = { field: 'email', message: 'invalid' }
    const response = apiError('Validation failed', 400, details)
    const body = await response.json()

    expect(body.details).toEqual(details)
  })
})

describe('apiUnauthorized', () => {
  it('should return 401 with default message', async () => {
    const response = apiUnauthorized()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should support custom message', async () => {
    const response = apiUnauthorized('Token expired')
    const body = await response.json()

    expect(body.error).toBe('Token expired')
  })
})

describe('apiForbidden', () => {
  it('should return 403 with default message', async () => {
    const response = apiForbidden()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })
})

describe('apiNotFound', () => {
  it('should return 404 with default message', async () => {
    const response = apiNotFound()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Not found')
  })

  it('should support custom message', async () => {
    const response = apiNotFound('House not found')
    const body = await response.json()

    expect(body.error).toBe('House not found')
  })
})

describe('apiServerError', () => {
  it('should return 500 with default message', async () => {
    const response = apiServerError()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})

describe('apiPaginated', () => {
  it('should return paginated response', async () => {
    const data = [{ id: '1' }, { id: '2' }]
    const response = apiPaginated(data, 1, 10, 25)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(data)
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    })
  })

  it('should calculate totalPages correctly', async () => {
    const response = apiPaginated([], 1, 20, 41)
    const body = await response.json()

    expect(body.pagination.totalPages).toBe(3) // ceil(41/20)
  })

  it('should handle empty data', async () => {
    const response = apiPaginated([], 1, 10, 0)
    const body = await response.json()

    expect(body.data).toEqual([])
    expect(body.pagination.total).toBe(0)
    expect(body.pagination.totalPages).toBe(0)
  })
})

describe('getClientIp', () => {
  it('should return IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('192.168.1.1')
  })

  it('should return null when no forwarded header', () => {
    const request = new Request('http://localhost')
    expect(getClientIp(request)).toBeNull()
  })

  it('should handle single IP in forwarded header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('10.0.0.1')
  })
})

describe('parseJsonBody', () => {
  it('should parse valid JSON body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
      headers: { 'content-type': 'application/json' },
    })
    const result = await parseJsonBody(request)
    expect(result).toEqual({ name: 'test' })
  })

  it('should return null for invalid JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
    })
    const result = await parseJsonBody(request)
    expect(result).toBeNull()
  })
})
