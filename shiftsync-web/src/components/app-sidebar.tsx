"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SocketStatus } from "@/components/shared/SocketStatus"
import { usePathname } from "next/navigation"
import { useNotificationsStore } from "@/lib/stores/notifications.store"
import { useAuthStore } from "@/lib/stores/auth.store"
import {
  GalleryVerticalEndIcon,
  CalendarIcon,
  UsersIcon,
  ArrowLeftRightIcon,
  BarChart3Icon,
  ClockIcon,
  BellIcon,
  FileTextIcon,
  MapPinIcon,
} from "lucide-react"

const navMainItems = [
  { title: "Dashboard", url: "/dashboard", icon: <GalleryVerticalEndIcon className="size-4" />, items: [{ title: "Overview", url: "/" }] },
  { title: "Schedule", url: "/schedule", icon: <CalendarIcon className="size-4" />, items: [{ title: "View", url: "/schedule" }] },
  { title: "Staff", url: "/staff", icon: <UsersIcon className="size-4" />, items: [{ title: "View", url: "/staff" }] },
  { title: "Swap & Drop", url: "/swaps", icon: <ArrowLeftRightIcon className="size-4" />, items: [{ title: "View", url: "/swaps" }] },
  { title: "Analytics", url: "/analytics", icon: <BarChart3Icon className="size-4" />, items: [{ title: "View", url: "/analytics" }] },
  { title: "On-Duty", url: "/on-duty", icon: <ClockIcon className="size-4" />, items: [{ title: "View", url: "/on-duty" }] },
  { title: "Notifications", url: "/notifications", icon: <BellIcon className="size-4" />, items: [{ title: "View", url: "/notifications" }] },
  { title: "Audit Log", url: "/audit", icon: <FileTextIcon className="size-4" />, items: [{ title: "View", url: "/audit" }] },
  { title: "Locations", url: "/locations", icon: <MapPinIcon className="size-4" />, items: [{ title: "View", url: "/locations" }] },
  { title: "Skills", url: "/skills", icon: <BarChart3Icon className="size-4" />, items: [{ title: "View", url: "/skills" }] },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const role = useAuthStore((s) => s.session?.role)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const visibleNavItems = navMainItems.filter((item) => {
    if (item.url === "/audit") return role === "admin" || role === "manager"
    if (item.url === "/staff") return role === "admin" || role === "manager"
    if (item.url === "/locations") return role === "admin"
    if (item.url === "/skills") return role === "admin"
    return true
  })

  const navMainWithActive = visibleNavItems.map((item) => ({
    ...item,
    isActive: pathname === item.url || pathname?.startsWith(item.url + "/"),
    badgeContent: item.title === "Notifications" && unreadCount > 0 ? unreadCount : undefined,
  }))
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[{ name: "ShiftSync", logo: <GalleryVerticalEndIcon />, plan: "Platform" }]} />
      </SidebarHeader>
      <SidebarContent className="text-[ oklch(0.141 0.005 285.823) ]">
        <NavMain items={navMainWithActive} />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5">
          <SocketStatus />
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
