import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { AuthLeftPanel }    from '@/components/auth/auth-left-panel'
import { SignupContainer }  from '@/components/auth/signup-container'

export const metadata: Metadata = { title: 'Create Account' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      <aside className="lg:w-[45%] xl:w-[42%] shrink-0">
        <AuthLeftPanel />
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 relative min-h-screen">
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-foreground">PadhaiSathi</span>
        </div>

        <div className="w-full max-w-[360px]">
          <SignupContainer />
        </div>
      </main>
    </div>
  )
}