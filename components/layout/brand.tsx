import Link from "next/link";
import { SkullIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Brand({
  className,
  href = "/",
  showText = true,
}: {
  className?: string;
  href?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Black Stories"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="bg-primary/15 text-primary ring-primary/25 group-hover:bg-primary/25 flex size-8 items-center justify-center rounded-lg ring-1 transition-colors">
        <SkullIcon className="size-4.5" />
      </span>
      {showText ? (
        <span className="text-gradient-brand text-lg font-semibold tracking-tight">
          Black Stories
        </span>
      ) : null}
    </Link>
  );
}

export { Brand };
