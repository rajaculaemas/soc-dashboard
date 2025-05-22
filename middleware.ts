import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Dapatkan response
  const response = NextResponse.next()

  // Tambahkan header CORS
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  return response
}

// Konfigurasi middleware untuk dijalankan pada path tertentu
export const config = {
  matcher: "/api/:path*",
}
