import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-tribunal-border text-tribunal-muted",
        p1: "border-tribunal-prosecution text-tribunal-prosecution",
        p2: "border-tribunal-defense text-tribunal-defense",
        p3: "border-tribunal-muted text-tribunal-muted",
        authority: "border-tribunal-authority text-tribunal-authority",
        /** Precedent outcomes — kept inside the three-accent rule. */
        worsened: "border-tribunal-prosecution/70 bg-[#1A1210] text-tribunal-prosecution",
        held: "border-tribunal-defense/70 text-tribunal-defense",
        neutral: "border-tribunal-rule text-[#6E6E77]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
