import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // APIルートの場合はそのまま通す（認証処理をスキップ）
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // その他のページは通常通り処理
  return NextResponse.next()
}

export const config = {
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