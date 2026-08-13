import { Skeleton } from '@/components/ui/skeleton';

export default function VoucherSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-[156px] rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="mb-2 h-4 w-3/4" />
      <div className="mb-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
