import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { Voucher } from '@/lib/types'
import { VoucherContext } from './VoucherContext'
import { useAuth } from '@/contexts/AuthContext'
import { useVoucherOperations } from '@/hooks/useVoucherOperations'
import { useVouchersQuery } from '@/hooks/useVouchersQuery'
import { sortVouchers as sortVouchersUtil, searchVouchers as searchVouchersUtil } from '@/utils/voucher-utils'

const emptyVouchers: Voucher[] = []

export const VoucherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { viewerKey, isLoading: isAuthLoading } = useAuth()
  const activeViewerKey = viewerKey ?? 'unresolved'
  const {
    data: vouchers = emptyVouchers,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useVouchersQuery(activeViewerKey, viewerKey !== null && !isAuthLoading)
  const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>(vouchers)
  const [mutationError, setMutationError] = useState<string | null>(null)

  useEffect(() => {
    setFilteredVouchers(vouchers)
  }, [vouchers])

  const { donateVoucher, redeemVoucher, reportVoucher } = useVoucherOperations(setMutationError, activeViewerKey)

  const sortVouchers = useCallback((sortBy: 'newest' | 'expirySoon' | 'highestValue') => {
    setFilteredVouchers(sortVouchersUtil(vouchers, sortBy))
  }, [vouchers])

  const searchVouchers = useCallback((query: string) => {
    const results = searchVouchersUtil(vouchers, query)
    setFilteredVouchers(results)
    return results
  }, [vouchers])

  const retryVouchers = useCallback(async () => {
    await refetch()
  }, [refetch])

  const loadError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : (queryError as { message?: string }).message ?? 'Failed to load vouchers'
    : null

  const contextValue = useMemo(() => ({
    vouchers,
    isLoading: viewerKey === null || isAuthLoading || isQueryLoading,
    loadError,
    mutationError,
    retryVouchers,
    donateVoucher,
    redeemVoucher,
    reportVoucher,
    sortVouchers,
    filteredVouchers,
    setFilteredVouchers,
    searchVouchers
  }), [
    vouchers,
    viewerKey,
    isAuthLoading,
    isQueryLoading,
    loadError,
    mutationError,
    retryVouchers,
    donateVoucher,
    redeemVoucher,
    reportVoucher,
    sortVouchers,
    filteredVouchers,
    searchVouchers,
    setFilteredVouchers
  ])

  return (
    <VoucherContext.Provider value={contextValue}>
      {children}
    </VoucherContext.Provider>
  )
}
