import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // D-02.2 — ink bg + lime text + pill radius + tighter padding + fw-medium
        "filter-chip":
          "border-transparent bg-[color:var(--foreground)] text-[color:var(--primary)] rounded-full px-2.5 py-1 text-[11px] font-medium gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /**
     * When true, renders an inline dismiss button after children.
     * Requires `onDismiss` to be provided — callback fires on click.
     */
    dismissible?: boolean;
    onDismiss?: () => void;
    /**
     * Accessible label for the dismiss button. Optional at the type level
     * so TypeScript does not force every call site — but consumers MUST
     * pass an i18n-localized string (see `ActiveFilterChips.tsx` in Wave 4
     * which injects `t('chip.remove', { label })`). Falls back to empty
     * string when omitted (Open Q #5 resolution).
     */
    dismissAriaLabel?: string;
  };

function Badge({
  className,
  variant,
  asChild = false,
  dismissible = false,
  onDismiss,
  dismissAriaLabel,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissAriaLabel ?? ""}
          className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-[color:var(--primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/50"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </Comp>
  );
}

export { Badge, badgeVariants };
