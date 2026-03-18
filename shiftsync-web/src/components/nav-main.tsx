"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const active =
            item.url === "/"
              ? pathname === "/"
              : pathname === item.url || pathname?.startsWith(item.url + "/")

          return (
            <SidebarMenuItem key={item.title}>
              <Link
                href={item.url}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer [&_svg]:shrink-0 [&_svg]:size-4 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.title}</span>
                {item.badgeContent != null && item.badgeContent > 0 && (
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
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
