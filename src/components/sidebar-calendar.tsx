import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Calendar } from '#/components/ui/calendar'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import { parseDateValue, toDateValue } from '#/lib/types'
import type { ScheduledItem } from '#/server/calendar'

/** Month calendar of everything with a date. Dots mark days with content; click a day to list it. */
export function SidebarCalendar({ scheduled }: { scheduled: ScheduledItem[] }) {
  const [selected, setSelected] = useState<Date | undefined>()

  const scheduledDays = useMemo(
    () =>
      [...new Set(scheduled.map((s) => s.date))].map(parseDateValue).filter((d): d is Date => !!d),
    [scheduled],
  )

  const today = toDateValue(new Date())
  const items = selected
    ? scheduled.filter((s) => s.date === toDateValue(selected))
    : scheduled.filter((s) => s.date >= today).slice(0, 4)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Calendar</SidebarGroupLabel>
      <SidebarGroupContent>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          className="mx-auto bg-transparent p-0"
          modifiers={{ scheduled: scheduledDays }}
          modifiersClassNames={{
            scheduled:
              'after:-translate-x-1/2 after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:rounded-full after:bg-primary',
          }}
        />
        <div className="mt-2 px-2 text-muted-foreground text-xs">
          {selected
            ? selected.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
            : 'Upcoming'}
        </div>
        <SidebarMenu className="mt-1">
          {items.map((item) => (
            <SidebarMenuItem key={`${item.pageId}-${item.date}`}>
              <SidebarMenuButton asChild size="sm">
                <Link to="/pages/$pageId" params={{ pageId: item.pageId }}>
                  <span>{item.icon ?? item.databaseIcon}</span>
                  <span className="truncate">{item.title || 'Untitled'}</span>
                  {!selected && (
                    <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                      {parseDateValue(item.date)?.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {items.length === 0 && (
            <p className="px-2 py-1 text-muted-foreground text-xs">Nothing scheduled.</p>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
