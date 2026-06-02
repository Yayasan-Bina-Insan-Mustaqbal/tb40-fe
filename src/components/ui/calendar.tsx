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
      className={cn("p-3 bg-card border border-border rounded-xl", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: cn("text-sm font-semibold text-foreground font-heading", props.captionLayout === "dropdown" && "hidden"),
        dropdowns: "flex justify-center gap-1",
        dropdown: "px-2 py-1 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary",
        dropdown_root: "relative inline-flex items-center",
        nav: "space-x-1 flex items-center absolute right-0 left-0 justify-between px-2 top-2 z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-70 hover:opacity-100 border-border cursor-pointer transition-all rounded-md"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-70 hover:opacity-100 border-border cursor-pointer transition-all rounded-md"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mt-2",
        weekday: "text-muted-foreground rounded-md w-9 font-medium text-[0.75rem] text-center uppercase tracking-wider",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal hover:bg-muted hover:text-foreground text-center flex items-center justify-center transition-all cursor-pointer rounded-lg text-sm"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold shadow-sm rounded-lg",
        today: "bg-secondary text-secondary-foreground font-bold border border-primary/20 rounded-lg",
        outside: "day-outside text-muted-foreground/30 opacity-40 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30",
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
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
