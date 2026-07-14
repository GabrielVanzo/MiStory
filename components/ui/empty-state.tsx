import * as React from "react";

import { cn } from "@/lib/utils";

function EmptyState({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "border-border/70 bg-card/40 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center",
        className,
      )}
      {...props}
    />
  );
}

function EmptyStateMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-media"
      className={cn(
        "bg-muted text-muted-foreground ring-border flex size-14 items-center justify-center rounded-2xl ring-1 [&>svg]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-state-title"
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  );
}

function EmptyStateDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("text-muted-foreground max-w-sm text-sm text-balance", className)}
      {...props}
    />
  );
}

function EmptyStateContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-content"
      className={cn("mt-1 flex flex-col gap-2 sm:flex-row", className)}
      {...props}
    />
  );
}

export { EmptyState, EmptyStateMedia, EmptyStateTitle, EmptyStateDescription, EmptyStateContent };
