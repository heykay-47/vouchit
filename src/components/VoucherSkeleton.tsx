
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function VoucherSkeleton() {
  return (
    <Card className="h-full overflow-hidden flex flex-col border border-border/50 shadow-soft">
      <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between gap-2">
        <div className="w-full">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-6 w-4/5" />
        </div>
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      
      <CardContent className="p-4 flex-grow">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
        
        <div className="mt-4">
          <Skeleton className="h-4 w-40 mt-2" />
          <Skeleton className="h-4 w-28 mt-2" />
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 mt-auto">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}
