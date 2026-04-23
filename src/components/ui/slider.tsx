"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

/**
 * shadcn Slider primitive — Phase 3.1 D-02.3 brand-styled.
 *
 * Supports single-thumb or dual-thumb (range) mode via Radix's native
 * array-valued `value` / `defaultValue` props. Renders one <Thumb /> per
 * entry in the value array so `value={[10, 50]}` produces two thumbs.
 *
 * Thumb styling per D-02.3:
 *  - 20px white circle
 *  - 2px ink border (var(--foreground))
 *  - lime 25% focus halo (var(--primary)/25 at 6px ring)
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = React.useMemo<number>(() => {
    const v = (value ?? defaultValue) as number[] | undefined
    if (Array.isArray(v)) return v.length || 1
    return 1
  }, [value, defaultValue])

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            "block h-5 w-5 shrink-0 rounded-full bg-white border-2 border-[color:var(--foreground)] shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-[color:var(--primary)]/25",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
