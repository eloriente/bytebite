import * as React from "react";
import { cn } from "@/lib/utils";

/** Lista agrupada al estilo iOS: filas separadas por hairlines dentro de una sola
 * superficie, en vez de tarjetas individuales con borde — "se lee como un solo objeto". */
const GroupedList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("divide-y divide-border overflow-hidden rounded-xl bg-card", className)}
      {...props}
    />
  ),
);
GroupedList.displayName = "GroupedList";

const GroupedListRow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-h-[3rem] items-center gap-3 px-4 py-2.5", className)}
      {...props}
    />
  ),
);
GroupedListRow.displayName = "GroupedListRow";

export { GroupedList, GroupedListRow };
