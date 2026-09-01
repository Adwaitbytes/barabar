import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, HeaderSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <HeaderSkeleton actions={0} />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      </div>
    </div>
  );
}
