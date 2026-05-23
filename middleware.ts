import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
]

// Routes that are only accessible to admins
const ADMIN_ROUTES = ["/admin"]

// Routes that are only accessible to teachers or admins
const TEACHER_ROUTES = ["/teacher"]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route))
}

function isTeacherRoute(pathname: string): boolean {
  return TEACHER_ROUTES.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Unauthenticated ─────────────────────────────────────────
  if (!user) {
    if (isPublicRoute(pathname)) return response

    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Fetch profile for role + ban check ──────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned, ban_reason")
    .eq("id", user.id)
    .single()

  // ── Ban check ────────────────────────────────────────────────
  if (profile?.is_banned) {
    await supabase.auth.signOut()
    const bannedUrl = new URL("/login", request.url)
    bannedUrl.searchParams.set("error", "account_banned")
    return NextResponse.redirect(bannedUrl)
  }

  // ── Redirect authenticated users away from auth pages ───────
  if (
    isPublicRoute(pathname) &&
    pathname !== "/" &&
    pathname !== "/reset-password"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ── Role-based guards ────────────────────────────────────────
  const role = profile?.role ?? "student"

  if (isAdminRoute(pathname) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isTeacherRoute(pathname) && role !== "teacher" && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
