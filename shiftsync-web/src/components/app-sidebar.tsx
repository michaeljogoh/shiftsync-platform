"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    { name: "ShiftSync", logo: <GalleryVerticalEndIcon />, plan: "Platform" },
  ],
  navMain: [
    { title: "Schedule", url: "/schedule", icon: <CalendarIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/schedule" }] },
    { title: "Staff", url: "/staff", icon: <UsersIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/staff" }] },
    { title: "Swap & Drop", url: "/swaps", icon: <ArrowLeftRightIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/swaps" }] },
    { title: "Analytics", url: "/analytics", icon: <BarChart3Icon className="size-4" />, isActive: false, items: [{ title: "View", url: "/analytics" }] },
    { title: "On-Duty", url: "/on-duty", icon: <ClockIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/on-duty" }] },
    { title: "Notifications", url: "/notifications", icon: <BellIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/notifications" }] },
    { title: "Audit Log", url: "/audit", icon: <FileTextIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/audit" }] },
    { title: "Locations", url: "/locations", icon: <MapPinIcon className="size-4" />, isActive: false, items: [{ title: "View", url: "/locations" }] },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const navMainWithActive = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url || pathname?.startsWith(item.url + "/"),
  }))
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
