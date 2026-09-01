import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Skeleton className="mb-6 h-3 w-24" />
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-3.5 w-96" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TableSkeleton rows={10} cols={4} />
        <div className="space-y-6">
          <CardSkeleton lines={7} />
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}
