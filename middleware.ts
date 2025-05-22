import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware untuk menangani CORS dan routing
export function middleware(request: NextRequest) {
  // Mendapatkan response
  const response = NextResponse.next()

  // Menambahkan header CORS
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  return response
}

// Konfigurasi middleware untuk berjalan pada path tertentu
export const config = {
  matcher: "/api/:path*",
}
