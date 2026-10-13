import { createContext, useContext } from 'react'
import type { VoucherContextType } from '@/lib/types'

export const VoucherContext = createContext<VoucherContextType | undefined>(undefined)

export const useVouchers = () => {
  const context = useContext(VoucherContext)
  if (context === undefined) {
    throw new Error('useVouchers must be used within a VoucherProvider')
  }
  return context
}
