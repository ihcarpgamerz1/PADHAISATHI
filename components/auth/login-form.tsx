'use client'

import { useState, useTransition } from 'react'
import type { ReactNode, FormEvent } from 'react'
import Link from 'next/link'
import {
  Eye, EyeOff, Loader2, Mail, Lock, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { signIn } from '@/lib/actions/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setError(null)
    const email = (document.getElementById('email') as HTMLInputElement)?.value
    const password = (document.getElementById('password') as HTMLInputElement)?.value
    if (!email || !password) return
    const fd = new FormData()
    fd.append('email', email)
    fd.append('password', password)
    startTransition(async () => {
      const res = await signIn(fd)
      if (!res.success && res.error) setError(res.error)
    })
  }

  async function handleGoogle() {
    setIsGoogleLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Failed to sign in with Google.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const busy = isPending || isGoogleLoading

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Welcome back
        </h2>
        <p className="text-muted-foreground text-sm">
          Sign in to continue your studies
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 gap-3 font-medium"
        onClick={handleGoogle}
        disabled={busy}
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

      <Divider />

      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <InputWithIcon icon={<Mail className="w-4 h-4" />}>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={busy}
              className="pl-10 h-11 bg-secondary/50 border-border focus:border-primary"
            />
          </InputWithIcon>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <InputWithIcon
            icon={<Lock className="w-4 h-4" />}
            right={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          >
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={busy}
              className="pl-10 pr-10 h-11 bg-secondary/50 border-border focus:border-primary"
            />
          </InputWithIcon>
        </div>

        <Button type="button" onClick={handleSubmit} disabled={busy} className="w-full h-11 font-semibold">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Sign up free
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-muted-foreground tracking-widest">
          or
        </span>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function InputWithIcon({
  icon,
  right,
  children,
}: {
  icon: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        {icon}
      </div>
      {children}
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  )
}