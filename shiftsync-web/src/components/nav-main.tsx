"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badgeContent?: number
    items?: { title: string; url: string }[]
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const active =
            item.url === "/"
              ? pathname === "/"
              : pathname === item.url || pathname?.startsWith(item.url + "/")

          const link = (
            <Link
              href={item.url}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer [&_svg]:shrink-0 [&_svg]:size-4 ${
                collapsed
                  ? "justify-center px-0 py-2 text-foreground hover:bg-muted"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.title}</span>}
              {!collapsed && item.badgeContent != null && item.badgeContent > 0 && (
                <span
                  className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                    active
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {item.badgeContent > 99 ? "99+" : item.badgeContent}
                </span>
              )}
            </Link>
          )

          return (
            <SidebarMenuItem key={item.title}>
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.title}
                    {item.badgeContent != null && item.badgeContent > 0 && (
                      <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                        {item.badgeContent > 99 ? "99+" : item.badgeContent}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
