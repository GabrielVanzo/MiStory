import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-4",
      default: "size-5",
      lg: "size-7",
      xl: "size-10",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type SpinnerProps = React.ComponentProps<"svg"> &
  VariantProps<typeof spinnerVariants> & {
    /** Accessible label announced to screen readers. */
    label?: string;
  };

function Spinner({ className, size, label = "Carregando", ...props }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-slot="spinner"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export { Spinner, spinnerVariants };
