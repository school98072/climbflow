import { useEffect } from 'react'
import { supabase } from './Auth'
import { trpc } from '@/lib/trpc'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Send the session up to the server to set the cookie
        await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: session.access_token }),
        })
        utils.auth.me.invalidate()
      } else if (event === 'SIGNED_OUT') {
        utils.auth.me.setData(undefined, null)
      }
    })

    return () => subscription.unsubscribe()
  }, [utils])

  return <>{children}</>
}
