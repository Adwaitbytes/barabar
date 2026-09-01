import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <HeaderSkeleton actions={0} />
      <StatsSkeleton />
      <TableSkeleton rows={14} cols={8} />
    </div>
  );
}
