'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { forgotPassword } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setError(null)
    const email = (document.getElementById('resetEmail') as HTMLInputElement)?.value
    if (!email) return
    const fd = new FormData()
    fd.append('email', email)
    startTransition(async () => {
      const res = await forgotPassword(fd)
      if (res.success) setSent(true)
      else setError(res.error ?? 'Something went wrong.')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[360px] space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-foreground">PadhaiSathi</span>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-subject-science/10 border border-subject-science/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-subject-science" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Check your inbox
              </h2>
              <p className="text-muted-foreground text-sm">
                We&apos;ve sent a password reset link. It may take a minute to arrive.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full h-11 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Forgot password?
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="resetEmail"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    disabled={isPending}
                    className="pl-10 h-11 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full h-11 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending…
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}