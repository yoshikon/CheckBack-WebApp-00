import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, Settings, LogOut, ChevronUp, Plus, Chrome as Home, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";
import companyLogo from "@assets/logo_1769149128186.png";

const mainMenuItems = [
  {
    title: "ホーム",
    url: "/home",
    icon: Home,
  },
  {
    title: "クイックチェック",
    url: "/quick-check",
    icon: Zap,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderOpen,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <a href="/dashboard" className="flex flex-col items-center gap-2" data-testid="link-logo">
          <img 
            src={companyLogo} 
            alt="Company Logo" 
            className="h-8 object-contain brightness-0 invert"
          />
          <span className="font-semibold text-lg">CheckBack</span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2">
            <a href="/projects/new">
              <Button className="w-full justify-start gap-2" data-testid="button-new-project">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </a>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && item.url !== "/dashboard" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-sidebar-accent rounded-md transition-colors data-[state=open]:bg-sidebar-accent"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                      {user ? getInitials(user.displayName || user.username) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm leading-tight flex-1 min-w-0">
                    <span className="font-medium truncate w-full">
                      {user?.displayName || user?.username || "User"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/60 truncate w-full">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-[240px]"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuItem asChild data-testid="menu-settings">
                  <a href="/account-settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    アカウント設定
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
