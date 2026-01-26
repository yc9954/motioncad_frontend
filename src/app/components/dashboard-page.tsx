import { useState } from "react";
import { 
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
} from "@/components/blocks/sidebar"

import { 
  User,
  ChevronsUpDown,
  Home,
  Edit,
  Sparkles,
  Settings,
  Folder,
  AlertCircle,
} from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { PromptingTab } from "@/app/components/prompting-tab"

// Menu items
const menuItems = [
  {
    title: "Home",
    id: "home",
    icon: Home,
  },
  {
    title: "Edit",
    id: "edit",
    icon: Edit,
  },
  {
    title: "Prompting",
    id: "prompting",
    icon: Sparkles,
  },
  {
    title: "Profile",
    id: "profile",
    icon: Settings,
  },
]

// Mock data for projects
const mockProjects = [
  {
    id: 1,
    title: "Fantasy Castle",
    author: "John Doe",
    thumbnail: "🏰",
    createdAt: "2 days ago",
    views: 1234,
    likes: 89,
  },
  {
    id: 2,
    title: "Space Station",
    author: "Jane Smith",
    thumbnail: "🚀",
    createdAt: "5 days ago",
    views: 2341,
    likes: 156,
  },
  {
    id: 3,
    title: "Medieval Village",
    author: "Bob Johnson",
    thumbnail: "🏘️",
    createdAt: "1 week ago",
    views: 3456,
    likes: 234,
  },
  {
    id: 4,
    title: "Underwater City",
    author: "Alice Williams",
    thumbnail: "🌊",
    createdAt: "3 days ago",
    views: 1890,
    likes: 112,
  },
  {
    id: 5,
    title: "Cyberpunk Street",
    author: "Charlie Brown",
    thumbnail: "🌃",
    createdAt: "1 day ago",
    views: 4567,
    likes: 345,
  },
  {
    id: 6,
    title: "Forest Temple",
    author: "Diana Prince",
    thumbnail: "🌲",
    createdAt: "4 days ago",
    views: 2789,
    likes: 198,
  },
]

// Mock data for issues
const mockIssues = [
  {
    id: 1,
    title: "3D Model Import Error",
    description: "Some users are experiencing issues when importing OBJ files",
    status: "open",
    priority: "high",
    comments: 12,
  },
  {
    id: 2,
    title: "Performance Optimization Needed",
    description: "Large scenes with 100+ objects are causing lag",
    status: "in-progress",
    priority: "medium",
    comments: 8,
  },
  {
    id: 3,
    title: "New Feature Request: VR Support",
    description: "Add support for VR headset viewing",
    status: "open",
    priority: "low",
    comments: 24,
  },
]

interface DashboardPageProps {
  onNavigateToBuilder?: () => void;
}

type TabId = "home" | "edit" | "prompting" | "profile";

export function DashboardPage({ onNavigateToBuilder }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="p-6 space-y-8">
            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Recent Projects</h2>
                <button className="text-sm text-muted-foreground hover:text-foreground">
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProjects.map((project) => (
                  <Card key={project.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-4xl">{project.thumbnail}</div>
                      <Badge variant="secondary">{project.views} views</Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">by {project.author}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.createdAt}</span>
                      <span>❤️ {project.likes}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Issues Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Key Issues</h2>
                <button className="text-sm text-muted-foreground hover:text-foreground">
                  View all →
                </button>
              </div>
              <div className="space-y-3">
                {mockIssues.map((issue) => (
                  <Card key={issue.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <h3 className="font-semibold">{issue.title}</h3>
                          <Badge 
                            variant={issue.status === "open" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {issue.status}
                          </Badge>
                          <Badge 
                            variant={issue.priority === "high" ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {issue.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                        <span className="text-xs text-muted-foreground">{issue.comments} comments</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case "edit":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Edit Mode</h1>
            <p className="text-muted-foreground">3D 디오라마 편집 기능이 여기에 표시됩니다.</p>
            {onNavigateToBuilder && (
              <button 
                onClick={onNavigateToBuilder}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Open Builder
              </button>
            )}
          </div>
        );
      case "prompting":
        return <PromptingTab />;
      case "profile":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Profile Settings</h1>
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  className="w-full p-3 border rounded-md bg-background"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full p-3 border rounded-md bg-background"
                  placeholder="your@email.com"
                />
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>API 키 설정:</strong> Tripo AI API 키는 .env 파일의 VITE_TRIPO_API_KEY 환경 변수로 설정됩니다.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-semibold whitespace-nowrap data-[collapsible=icon]:hidden">Navigation</span>
            <SidebarTrigger className="h-6 w-6" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      tooltip={item.title}
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id as TabId)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarMenuButton className="w-full justify-between gap-3 h-12 data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 rounded-md flex-shrink-0" />
                <div className="flex flex-col items-start data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium">John Doe</span>
                  <span className="text-xs text-muted-foreground">john@example.com</span>
                </div>
              </div>
              <ChevronsUpDown className="h-5 w-5 rounded-md flex-shrink-0 data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">
            {activeTab === "home" && "Home"}
            {activeTab === "edit" && "Edit"}
            {activeTab === "prompting" && "Prompting"}
            {activeTab === "profile" && "Profile Settings"}
          </h1>
        </div>
        {renderContent()}
      </SidebarInset>
    </SidebarProvider>
  )
}
