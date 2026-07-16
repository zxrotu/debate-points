import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

  // 如果去首頁或登入頁，直接放行
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 管理員路由保護
  if (pathname.startsWith('/admin')) {
    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }
  }

  // 社員路由保護
  if (pathname.startsWith('/member')) {
    if (payload.role !== 'member') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/member/:path*'],
};
