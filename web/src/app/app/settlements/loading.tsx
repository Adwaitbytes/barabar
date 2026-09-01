import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <HeaderSkeleton actions={1} />
      <StatsSkeleton />
      <TableSkeleton rows={12} cols={10} />
    </div>
  );
}
