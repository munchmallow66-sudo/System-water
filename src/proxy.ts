import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
    '/',
    '/login',
    '/api/auth',
    '/api/public',
]

// Admin-only routes
const adminRoutes = [
    '/api/users',
    '/api/water-rates',
    '/users',
]

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Check for session token
    const sessionToken = request.cookies.get('next-auth.session-token') ||
        request.cookies.get('__Secure-next-auth.session-token')

    // If no session token, redirect to login for protected routes
    if (!sessionToken) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // For now, allow authenticated users to access all protected routes
    // Admin route checking can be done at the API level
    return NextResponse.next()
}

export const proxyConfig = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
