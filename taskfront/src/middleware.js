import { NextResponse } from 'next/server'

const PROTECTED = ['/Tasktables']
const PUBLIC    = ['/Home']

export function middleware(request) {
    const { pathname } = request.nextUrl
    const isLoggedIn = request.cookies.has('taskmanager_session')

    const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
    const isPublic  = PUBLIC.some(p => pathname.startsWith(p))

    // Sin sesión intentando acceder a ruta protegida → login
    if (needsAuth && !isLoggedIn) {
        return NextResponse.redirect(new URL('/Home', request.url))
    }

    // Con sesión intentando acceder a login → app
    if (isPublic && isLoggedIn) {
        return NextResponse.redirect(new URL('/Tasktables', request.url))
    }

    return NextResponse.next()
}

export const config = {
    // Excluye archivos estáticos y rutas internas de Next.js
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
