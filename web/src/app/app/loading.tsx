import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, HeaderSkeleton, TableSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <HeaderSkeleton />
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 border-l border-line pl-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-8 h-2.5 w-full rounded-full" />
      <CardSkeleton className="mb-6 h-[340px]" lines={0} />
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <CardSkeleton lines={7} />
        <CardSkeleton lines={7} />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
