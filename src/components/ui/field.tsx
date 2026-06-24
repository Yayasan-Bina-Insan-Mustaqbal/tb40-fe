import * as React from "react"
import { cn } from "@/lib/utils"

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
})
Field.displayName = "Field"

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground select-none",
        className
      )}
      {...props}
    />
  )
})
FieldLabel.displayName = "FieldLabel"

export { Field, FieldLabel }
