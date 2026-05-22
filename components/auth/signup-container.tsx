'use client'

import { useState } from 'react'
import { SignupForm, type SignupBasicData } from './signup-form'
import { OnboardingFlow } from './onboarding-flow'

export function SignupContainer() {
  const [signupData, setSignupData] = useState<SignupBasicData | null>(null)

  return (
    <>
      <SignupForm onContinue={setSignupData} />
      {signupData && (
        <OnboardingFlow
          data={signupData}
          onBack={() => setSignupData(null)}
        />
      )}
    </>
  )
}