import { useState, useEffect } from "react";
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
  Sparkles,
  Settings,
  Folder,
  AlertCircle,
  LogOut,
} from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { PromptingTab } from "@/app/components/prompting-tab"
import { TravelCard } from "@/app/components/ui/travel-card"
import { projectApi, ProjectResponse, authApi } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/app/components/ui/button"

// Menu items
const menuItems = [
  {
    title: "Home",
    id: "home",
    icon: Home,
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

// Projects with Three.js example models
const mockProjects = [
  {
    id: 1,
    title: "Chair Model",
    author: "Three.js Examples",
    thumbnail: "🪑",
    glbUrl: "https://threejs.org/examples/models/gltf/Chair/glTF-Binary/Chair.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    createdAt: "2 days ago",
    views: 1234,
    likes: 89,
  },
  {
    id: 2,
    title: "Duck Model",
    author: "Three.js Examples",
    thumbnail: "🦆",
    glbUrl: "https://threejs.org/examples/models/gltf/Duck/glTF-Binary/Duck.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop",
    createdAt: "5 days ago",
    views: 2341,
    likes: 156,
  },
  {
    id: 3,
    title: "Lantern Model",
    author: "Three.js Examples",
    thumbnail: "💡",
    glbUrl: "https://threejs.org/examples/models/gltf/Lantern/glTF-Binary/Lantern.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop",
    createdAt: "1 week ago",
    views: 3456,
    likes: 234,
  },
  {
    id: 4,
    title: "Avocado Model",
    author: "Three.js Examples",
    thumbnail: "🥑",
    glbUrl: "https://threejs.org/examples/models/gltf/Avocado/glTF-Binary/Avocado.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    createdAt: "3 days ago",
    views: 1890,
    likes: 112,
  },
  {
    id: 5,
    title: "Damaged Helmet",
    author: "Three.js Examples",
    thumbnail: "⛑️",
    glbUrl: "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    createdAt: "1 day ago",
    views: 4567,
    likes: 345,
  },
  {
    id: 6,
    title: "Flight Helmet",
    author: "Three.js Examples",
    thumbnail: "🪖",
    glbUrl: "https://threejs.org/examples/models/gltf/FlightHelmet/glTF-Binary/FlightHelmet.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
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
  onNavigateToLanding?: () => void;
}

type TabId = "home" | "prompting" | "profile";

export function DashboardPage({ onNavigateToBuilder, onNavigateToLanding }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  
  // 초기 상태: mock 데이터로 시작
  const initialMockProjects: ProjectResponse[] = mockProjects.map(p => ({
    id: p.id,
    title: p.title,
    description: `A 3D model created ${p.createdAt}. This project has ${p.views} views and ${p.likes} likes.`,
    nickname: p.author,
    isPublic: true,
    previewImageUrl: p.thumbnailUrl, // 하드코딩된 썸네일 URL
    likesCount: p.likes,
    viewsCount: p.views,
    commentCount: 0,
    components: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  const [projects, setProjects] = useState<ProjectResponse[]>(initialMockProjects);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectThumbnails, setProjectThumbnails] = useState<Record<number, string>>(() => {
    // 초기 썸네일을 mockProjects의 thumbnailUrl로 설정
    const initialThumbnails: Record<number, string> = {};
    mockProjects.forEach(project => {
      if (project.thumbnailUrl) {
        initialThumbnails[project.id] = project.thumbnailUrl;
      }
    });
    return initialThumbnails;
  });
  const [selectedProject, setSelectedProject] = useState<{ glbUrl: string; name: string } | null>(null);

  // 백엔드에서 프로젝트 목록 가져오기 (백그라운드에서 시도)
  useEffect(() => {
    const loadProjects = async () => {
      if (activeTab !== 'home') return;
      
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await projectApi.getProjects({ sort: 'latest' });
        if (fetchedProjects && fetchedProjects.length > 0) {
          setProjects(fetchedProjects);
          
          // 썸네일 URL 설정
          const thumbnails: Record<number, string> = {};
          fetchedProjects.forEach(project => {
            if (project.previewImageUrl) {
              thumbnails[project.id] = project.previewImageUrl;
            }
          });
          setProjectThumbnails(prev => ({ ...prev, ...thumbnails }));
        }
      } catch (error) {
        console.error('프로젝트 목록 로드 실패 (mock 데이터 사용):', error);
        // 실패해도 mock 데이터가 이미 표시되고 있으므로 에러만 로그
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, [activeTab]);

  // GLB 썸네일 생성 함수 (prompting-tab의 함수와 유사한 로직)
  const generateThumbnailFromGLB = async (file: File): Promise<string | null> => {
    try {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

      // 오프스크린 렌더러 생성
      const width = 512;
      const height = 512;
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width * pixelRatio, height * pixelRatio, false);
      renderer.setPixelRatio(pixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;

      // 씬 생성
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfafafa);

      // 카메라 설정
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);

      // 조명 설정
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight1.position.set(5, 10, 5);
      directionalLight1.castShadow = true;
      scene.add(directionalLight1);
      
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-5, 5, -5);
      scene.add(directionalLight2);

      // 파일 URL 생성
      const fileUrl = URL.createObjectURL(file);

      // 모델 로드
      const loader = new GLTFLoader();
      
      return new Promise((resolve) => {
        loader.load(
          fileUrl,
          (gltf: any) => {
            try {
              const model = gltf.scene.clone();

              // 모델 바운딩 박스 계산
              const box = new THREE.Box3().setFromObject(model);
              
              if (box.isEmpty()) {
                throw new Error('모델이 비어있습니다.');
              }

              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              
              if (maxDim === 0) {
                throw new Error('모델 크기가 0입니다.');
              }

              const scale = 1.5 / maxDim;
              model.scale.multiplyScalar(scale);
              model.position.sub(center.multiplyScalar(scale));
              scene.add(model);

              // 카메라 위치 조정
              const newBox = new THREE.Box3().setFromObject(model);
              const newCenter = newBox.getCenter(new THREE.Vector3());
              const newSize = newBox.getSize(new THREE.Vector3());
              const newMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
              
              const distance = newMaxDim * 2.5;
              camera.position.set(
                newCenter.x + distance * 0.7,
                newCenter.y + distance * 0.7,
                newCenter.z + distance * 0.7
              );
              camera.lookAt(newCenter);
              camera.updateProjectionMatrix();

              // 렌더링
              renderer.render(scene, camera);

              // 캔버스를 이미지로 변환
              const dataUrl = renderer.domElement.toDataURL('image/png', 0.9);
              
              // 정리
              URL.revokeObjectURL(fileUrl);
              renderer.dispose();
              scene.clear();
              model.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((mat: any) => mat.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              });
              
              resolve(dataUrl);
            } catch (error) {
              console.error('Error processing model:', error);
              URL.revokeObjectURL(fileUrl);
              renderer.dispose();
              scene.clear();
              resolve(null);
            }
          },
          undefined,
          (error: any) => {
            console.error('Error loading GLB:', error);
            URL.revokeObjectURL(fileUrl);
            renderer.dispose();
            scene.clear();
            resolve(null);
          }
        );
      });
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  };

  // GLB URL에서 썸네일 생성
  const generateThumbnailFromGLBUrl = async (glbUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(glbUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch GLB from ${glbUrl}:`, response.statusText);
        return null;
      }
      const blob = await response.blob();
      const file = new File([blob], 'model.glb', { type: 'model/gltf-binary' });
      return await generateThumbnailFromGLB(file);
    } catch (error) {
      console.error(`Error generating thumbnail from URL ${glbUrl}:`, error);
      return null;
    }
  };

  // 프로젝트 썸네일 생성 (백엔드에서 가져온 프로젝트용)
  useEffect(() => {
    if (activeTab !== "home" || projects.length === 0) return;
    
    const generateThumbnails = async () => {
      const thumbnails: Record<number, string> = {};
      
      for (const project of projects) {
        // previewImageUrl이 없고 썸네일도 없는 경우에만 생성
        if (!project.previewImageUrl && !projectThumbnails[project.id]) {
          // 컴포넌트에서 모델 URL을 가져와야 하지만, 여기서는 스킵
          // 실제로는 partApi를 통해 모델 URL을 가져와야 함
        }
      }
      
      if (Object.keys(thumbnails).length > 0) {
        setProjectThumbnails(prev => ({ ...prev, ...thumbnails }));
      }
    };

    generateThumbnails();
  }, [activeTab, projects, projectThumbnails]);

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {projects.map((project) => {
                  // 썸네일 URL: previewImageUrl 우선, 없으면 projectThumbnails, 없으면 기본 이미지
                  const thumbnailUrl = project.previewImageUrl || projectThumbnails[project.id];
                  const imageUrl = thumbnailUrl 
                    ? thumbnailUrl 
                    : `https://via.placeholder.com/400x300/1a1a1a/ffffff?text=${encodeURIComponent(project.title)}`;
                  
                  return (
                    <TravelCard
                      key={project.id}
                      imageUrl={imageUrl}
                      imageAlt={project.title}
                      title={project.title}
                      location={`by ${project.nickname || 'Unknown'}`}
                      overview={project.description || `This project has ${project.viewsCount} views and ${project.likesCount} likes. Click to open and edit in the 3D editor.`}
                      onBookNow={() => onProjectClick(project)}
                      className="h-[350px]"
                    />
                  );
                })}
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
      case "prompting":
        return <PromptingTab 
          initialModelUrl={selectedProject?.glbUrl}
          initialModelName={selectedProject?.name}
        />;
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
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center px-2">
            <span className="text-sm font-semibold whitespace-nowrap">Navigation</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id} style={{ animation: "none" }}>
                    <SidebarMenuButton 
                      tooltip={item.title}
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id as TabId)}
                      style={{ animation: "none" }}
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
            <SidebarMenuButton className="w-full justify-between gap-3 h-12">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 rounded-md flex-shrink-0" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">John Doe</span>
                  <span className="text-xs text-muted-foreground">john@example.com</span>
                </div>
              </div>
              <ChevronsUpDown className="h-5 w-5 rounded-md flex-shrink-0" />
            </SidebarMenuButton>
            {onNavigateToLanding && (
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  authApi.logout();
                  onNavigateToLanding();
                  toast.success("로그아웃되었습니다.");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            )}
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">
            {activeTab === "home" && "Home"}
            {activeTab === "prompting" && "Prompting"}
            {activeTab === "profile" && "Profile Settings"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
