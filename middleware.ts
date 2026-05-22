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

  // Build a response we can attach cookie mutations to
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Create a Supabase client that can read/write cookies via the middleware
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

  // Refresh the session — this keeps the access token alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Unauthenticated user ────────────────────────────────────────────────────
  if (!user) {
    if (isPublicRoute(pathname)) return response

    // Redirect to login, preserving the destination for post-login redirect
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Authenticated user — fetch profile for role + ban check ────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("role, is_banned, ban_reason")
    .eq("id", user.id)
    .single()

  // ── Ban check — always runs, even on public routes ─────────────────────────
  if (profile?.is_banned) {
    // Sign out the banned user so they can't keep using stored sessions
    await supabase.auth.signOut()

    // Redirect to a banned page (or login with an error param)
    const bannedUrl = new URL("/login", request.url)
    bannedUrl.searchParams.set("error", "account_banned")
    return NextResponse.redirect(bannedUrl)
  }

  // ── Redirect authenticated users away from auth pages ─────────────────────
  if (isPublicRoute(pathname) && pathname !== "/" && pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ── Role-based route guards ────────────────────────────────────────────────
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
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-foreground text-2xl font-heading">
        PadhaiSathi — Login coming soon
      </div>
    </div>
  )
}