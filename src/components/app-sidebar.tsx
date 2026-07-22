import type * as React from "react"

import { logout } from '@/lib/auth'
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChartBarIcon, CircleHelpIcon, CommandIcon } from "lucide-react"

const data = {
  user: {
    name: "TB40 Admin",
    email: "admin@tb40.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Analytics",
      url: "/dashboard",
      icon: (
        <ChartBarIcon />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Logout",
      url: "/login",
      icon: (
        <CircleHelpIcon />
      ),
      onClick: () => {
        logout()
        window.location.href = '/login'
      },
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">TB40 Analytics</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
