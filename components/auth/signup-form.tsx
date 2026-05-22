'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import {
  Eye, EyeOff, User, Mail, Lock, ArrowRight, AlertCircle, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export interface SignupBasicData {
  fullName: string
  email:    string
  password: string
}

interface SignupFormProps {
  onContinue: (data: SignupBasicData) => void
}

export function SignupForm({ onContinue }: SignupFormProps) {
  const [values, setValues] = useState<SignupBasicData>({
    fullName: '', email: '', password: '',
  })
  const [showPassword, setShowPassword]  = useState(false)
  const [isGoogleLoading, setGoogleLoad] = useState(false)
  const [error, setError]                = useState<string | null>(null)

  function set(field: keyof SignupBasicData) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setValues(v => ({ ...v, [field]: e.target.value }))
      if (error) setError(null)
    }
  }

  function validate(): string | null {
    if (!values.fullName.trim() || values.fullName.trim().length < 2)
      return 'Please enter your full name (min. 2 characters).'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      return 'Enter a valid email address.'
    if (values.password.length < 8)
      return 'Password must be at least 8 characters.'
    return null
  }

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    onContinue(values)
  }

  async function handleGoogle() {
    setGoogleLoad(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Failed to sign up with Google.')
    } finally {
      setGoogleLoad(false)
    }
  }

  const strength = Math.min(
    4,
    Math.floor(values.password.length / 3) +
      (values.password.length >= 8 ? 1 : 0)
  )
  const strengthColor =
    strength <= 1 ? 'bg-destructive'
    : strength <= 2 ? 'bg-subject-english'
    : strength <= 3 ? 'bg-subject-science'
    : 'bg-primary'

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Create your account
        </h2>
        <p className="text-muted-foreground text-sm">
          Free forever. Start studying smarter today.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 gap-3 font-medium"
        onClick={handleGoogle}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

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

      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="fullName"
              type="text"
              placeholder="Sajan Baitha"
              autoComplete="name"
              value={values.fullName}
              onChange={set('fullName')}
              className="pl-10 h-11 bg-secondary/50 border-border focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signupEmail">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="signupEmail"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={values.email}
              onChange={set('email')}
              className="pl-10 h-11 bg-secondary/50 border-border focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signupPassword">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="signupPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={values.password}
              onChange={set('password')}
              className="pl-10 pr-10 h-11 bg-secondary/50 border-border focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {values.password.length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i <= strength ? strengthColor : 'bg-muted'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <Button type="button" onClick={handleSubmit} className="w-full h-11 font-semibold group">
          Continue
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground/60 leading-relaxed">
        By creating an account you agree to our{' '}
        <Link href="/terms" className="underline hover:text-muted-foreground/80">
          Terms
        </Link>{' '}
        &amp;{' '}
        <Link href="/privacy" className="underline hover:text-muted-foreground/80">
          Privacy Policy
        </Link>
        . Notes shared publicly may be visible to other students.
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