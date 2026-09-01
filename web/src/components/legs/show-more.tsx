"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Client-side paging over server-rendered rows: the server renders every row
 * once, the client reveals them a page at a time. Cheap, and the URL stays clean.
 */
export function ShowMoreRows({
  rows,
  pageSize = 100,
  colSpan,
  noun = "rows",
}: {
  rows: React.ReactNode[];
  pageSize?: number;
  colSpan: number;
  noun?: string;
}) {
  const [shown, setShown] = React.useState(pageSize);
  const visible = rows.slice(0, shown);
  const remaining = rows.length - visible.length;
  return (
    <tbody className="[&_tr:last-child]:border-0">
      {visible}
      {remaining > 0 && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + pageSize)}>
              Show {Math.min(pageSize, remaining)} more
              <span className="mono text-faint">
                · {remaining} {noun} left
              </span>
            </Button>
          </td>
        </tr>
      )}
    </tbody>
  );
}
