import { HeaderSkeleton, TableSkeleton, CardSkeleton } from "@/components/shell/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <HeaderSkeleton actions={1} />
      <TableSkeleton rows={4} cols={8} />
      <div className="mt-8">
        <CardSkeleton lines={12} />
      </div>
    </div>
  );
}
