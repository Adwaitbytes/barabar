import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** A plain GET form: the query lands in the URL, the server filters. */
export function SearchBox({
  action,
  name = "q",
  defaultValue,
  placeholder,
  hidden = {},
}: {
  action: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" role="search" className="relative w-full max-w-xs">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 pl-8 text-[13px]"
      />
    </form>
  );
}
