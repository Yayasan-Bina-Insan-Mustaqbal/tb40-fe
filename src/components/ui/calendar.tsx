import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-xl border border-border bg-card p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: cn(
          "font-heading text-sm font-semibold text-foreground",
          props.captionLayout === "dropdown" && "hidden"
        ),
        dropdowns: "flex justify-center gap-1",
        dropdown:
          "px-2 py-1 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary",
        dropdown_root: "relative inline-flex items-center",
        nav: "space-x-1 flex items-center absolute right-0 left-0 justify-between px-2 top-2 z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 cursor-pointer rounded-md border-border bg-background p-0 opacity-70 transition-all hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 cursor-pointer rounded-md border-border bg-background p-0 opacity-70 transition-all hover:opacity-100"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mt-2",
        weekday:
          "text-muted-foreground rounded-md w-9 font-medium text-[0.75rem] text-center uppercase tracking-wider",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg p-0 text-center text-sm font-normal transition-all hover:bg-muted hover:text-foreground"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold shadow-sm rounded-lg",
        today:
          "bg-secondary text-secondary-foreground font-bold border border-primary/20 rounded-lg",
        outside:
          "day-outside text-muted-foreground/30 opacity-40 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground/20 opacity-20 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") {
            return <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          }
          return <ChevronRight className="h-4 w-4 text-muted-foreground" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
