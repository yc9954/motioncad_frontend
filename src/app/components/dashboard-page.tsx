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
  Home,
  Sparkles,
  Settings,
  Folder,
  LogOut,
} from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { PromptingTab } from "@/app/components/prompting-tab"
import { TravelCard } from "@/app/components/ui/travel-card"
import { ProfileCard } from "@/app/components/ui/profile-card"
import { Gallery4, Gallery4Props } from "@/components/blocks/gallery4"
import { projectApi, ProjectResponse, authApi, userApi, UserResponse, UserUpdateRequest } from "@/lib/api"
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
// GLB URL: GitHub raw URL은 브랜치 이름이 정확해야 함 (dev 대신 master 또는 특정 버전 태그 사용)
// 또는 jsDelivr CDN 사용: https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/...
// 참고: GLB 파일 로드가 실패하면 thumbnailUrl (Unsplash 이미지)가 fallback으로 사용됨
const mockProjects = [
  {
    id: 1,
    title: "Chair Model",
    author: "Three.js Examples",
    thumbnail: "🪑",
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Chair/glTF-Binary/Chair.glb",
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
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Duck/glTF-Binary/Duck.glb",
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
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Lantern/glTF-Binary/Lantern.glb",
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
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Avocado/glTF-Binary/Avocado.glb",
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
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
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
    glbUrl: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/FlightHelmet/glTF-Binary/FlightHelmet.glb",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    createdAt: "4 days ago",
    views: 2789,
    likes: 198,
  },
]

interface DashboardPageProps {
  onNavigateToBuilder?: () => void;
  onNavigateToLanding?: () => void;
}

type TabId = "home" | "prompting" | "profile";

export function DashboardPage({ onNavigateToBuilder, onNavigateToLanding }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  // 초기 상태: mock 데이터로 시작 (previewImageUrl은 null로 설정하여 GLB에서 생성)
  const initialMockProjects: ProjectResponse[] = mockProjects.map(p => ({
    id: p.id,
    title: p.title,
    description: `A 3D model created ${p.createdAt}. This project has ${p.views} views and ${p.likes} likes.`,
    nickname: p.author,
    isPublic: true,
    previewImageUrl: null, // GLB에서 썸네일 생성하도록 null로 설정
    likesCount: p.likes,
    viewsCount: p.views,
    commentCount: 0,
    components: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const [projects, setProjects] = useState<ProjectResponse[]>(initialMockProjects);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [projectThumbnails, setProjectThumbnails] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<{ glbUrl: string; name: string } | null>(null);

  const onProjectClick = (project: ProjectResponse) => {
    const mockProject = mockProjects.find(p => p.id === project.id);
    setSelectedProject({
      glbUrl: project.previewImageUrl || projectThumbnails[project.id] || mockProject?.glbUrl || '',
      name: project.title
    });
    setActiveTab("prompting");
    toast.info(`${project.title} 프로젝트가 선택되었습니다.`);
  };

  // 유저 정보 가져오기
  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoadingUser(true);
      try {
        const userData = await userApi.getMe();
        setUser(userData);
      } catch (error) {
        console.error('유저 프로필 로드 실패:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleUpdateProfile = async (data: UserUpdateRequest) => {
    if (!user?.id) return;

    try {
      await userApi.updateProfile(user.id, data);
      toast.success("프로필이 성공적으로 업데이트되었습니다.");

      // Refresh user profile
      const updatedUserData = await userApi.getMe();
      setUser(updatedUserData);
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      toast.error("프로필 업데이트에 실패했습니다.");
      throw error;
    }
  };

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

  // GLB URL에서 썸네일 생성 (GLTFLoader가 직접 URL 로드)
  const generateThumbnailFromGLBUrl = async (glbUrl: string): Promise<string | null> => {
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

      // 모델 로드 (GLTFLoader가 직접 URL 사용)
      const loader = new GLTFLoader();

      return new Promise((resolve) => {
        loader.load(
          glbUrl,
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
              renderer.dispose();
              scene.clear();
              resolve(null);
            }
          },
          undefined,
          (error: any) => {
            console.error(`Error loading GLB from ${glbUrl}:`, error);
            renderer.dispose();
            scene.clear();
            resolve(null);
          }
        );
      });
    } catch (error) {
      console.error(`Error generating thumbnail from URL ${glbUrl}:`, error);
      return null;
    }
  };

  // 프로젝트 썸네일 생성 (GLB 파일에서)
  useEffect(() => {
    if (activeTab !== "home" || projects.length === 0) return;

    const generateThumbnails = async () => {
      const thumbnails: Record<number, string> = {};

      // 썸네일이 필요한 프로젝트들 찾기 (previewImageUrl이 없고, projectThumbnails에도 없는 경우)
      // GLB에서 썸네일을 생성하도록 항상 시도
      const projectsToProcess = projects.filter(project => {
        const hasPreviewImage = !!project.previewImageUrl;
        const hasThumbnail = !!projectThumbnails[project.id];

        return !hasPreviewImage && !hasThumbnail;
      });

      if (projectsToProcess.length === 0) return;

      // 병렬 처리 (최대 2개씩 - GLB 로드가 무거우므로)
      const batchSize = 2;
      for (let i = 0; i < projectsToProcess.length; i += batchSize) {
        const batch = projectsToProcess.slice(i, i + batchSize);

        const batchPromises = batch.map(async (project) => {
          const mockProject = mockProjects.find(p => p.id === project.id);
          if (mockProject?.glbUrl) {
            try {
              console.log(`Generating thumbnail for project ${project.id} from ${mockProject.glbUrl}`);
              const thumbnailDataUrl = await generateThumbnailFromGLBUrl(mockProject.glbUrl);
              if (thumbnailDataUrl) {
                thumbnails[project.id] = thumbnailDataUrl;
                console.log(`Successfully generated thumbnail for project ${project.id}`);
              } else {
                console.warn(`Failed to generate thumbnail for project ${project.id}`);
              }
            } catch (error) {
              console.error(`Error generating thumbnail for project ${project.id}:`, error);
            }
          }
        });

        await Promise.all(batchPromises);

        // 배치마다 상태 업데이트 (점진적 렌더링)
        if (Object.keys(thumbnails).length > 0) {
          setProjectThumbnails(prev => ({ ...prev, ...thumbnails }));
        }
      }
    };

    generateThumbnails();
  }, [activeTab, projects]);

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        const galleryData: Gallery4Props = {
          title: "Projects",
          description:
            "Discover how leading companies and developers are leveraging modern web technologies to build exceptional digital experiences. These case studies showcase real-world applications and success stories.",
          items: [
            {
              id: "shadcn-ui",
              title: "shadcn/ui: Building a Modern Component Library",
              description:
                "Explore how shadcn/ui revolutionized React component libraries by providing a unique approach to component distribution and customization, making it easier for developers to build beautiful, accessible applications.",
              href: "https://ui.shadcn.com",
              image:
                "https://images.unsplash.com/photo-1551250928-243dc937c49d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NDI3NzN8MHwxfGFsbHwxMjN8fHx8fHwyfHwxNzIzODA2OTM5fA&ixlib=rb-4.0.3&q=80&w=1080",
            },
            {
              id: "tailwind",
              title: "Tailwind CSS: The Utility-First Revolution",
              description:
                "Discover how Tailwind CSS transformed the way developers style their applications, offering a utility-first approach that speeds up development while maintaining complete design flexibility.",
              href: "https://tailwindcss.com",
              image:
                "https://images.unsplash.com/photo-1551250928-e4a05afaed1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NDI3NzN8MHwxfGFsbHwxMjR8fHx8fHwyfHwxNzIzODA2OTM5fA&ixlib=rb-4.0.3&q=80&w=1080",
            },
            {
              id: "astro",
              title: "Astro: The All-in-One Web Framework",
              description:
                "Learn how Astro's innovative 'Islands Architecture' and zero-JS-by-default approach is helping developers build faster websites while maintaining rich interactivity where needed.",
              href: "https://astro.build",
              image:
                "https://images.unsplash.com/photo-1536735561749-fc87494598cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NDI3NzN8MHwxfGFsbHwxNzd8fHx8fHwyfHwxNzIzNjM0NDc0fA&ixlib=rb-4.0.3&q=80&w=1080",
            },
            {
              id: "react",
              title: "React: Pioneering Component-Based UI",
              description:
                "See how React continues to shape modern web development with its component-based architecture, enabling developers to build complex user interfaces with reusable, maintainable code.",
              href: "https://react.dev",
              image:
                "https://images.unsplash.com/photo-1548324215-9133768e4094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NDI3NzN8MHwxfGFsbHwxMzF8fHx8fHwyfHwxNzIzNDM1MzA1fA&ixlib=rb-4.0.3&q=80&w=1080",
            },
            {
              id: "nextjs",
              title: "Next.js: The React Framework for Production",
              description:
                "Explore how Next.js has become the go-to framework for building full-stack React applications, offering features like server components, file-based routing, and automatic optimization.",
              href: "https://nextjs.org",
              image:
                "https://images.unsplash.com/photo-1550070881-a5d71eda5800?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NDI3NzN8MHwxfGFsbHwxMjV8fHx8fHwyfHwxNzIzNDM1Mjk4fA&ixlib=rb-4.0.3&q=80&w=1080",
            },
          ],
        };

        return (
          <div className="space-y-4">
            {/* Gallery Section */}
            <Gallery4 {...galleryData} />

            {/* Projects Section */}
            <div className="p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Recent Projects</h2>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {projects.map((project) => {
                    // 썸네일 URL: previewImageUrl 우선, 없으면 projectThumbnails (GLB에서 생성된 썸네일)
                    // GLB 썸네일이 아직 생성 중이면 mockProjects의 thumbnailUrl을 임시로 사용
                    const thumbnailUrl = project.previewImageUrl || projectThumbnails[project.id];
                    const mockProject = mockProjects.find(p => p.id === project.id);

                    // GLB 썸네일이 없고 생성 중일 때만 fallback 사용
                    const imageUrl = thumbnailUrl || mockProject?.thumbnailUrl || '';

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
            </div>
          </div>
        );
      case "prompting":
        return <PromptingTab
          initialModelUrl={selectedProject?.glbUrl}
          initialModelName={selectedProject?.name}
        />;
      case "profile":
        return <ProfileCard
          name={user?.nickname}
          email={user?.email}
          joinDate={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) : undefined}
          role={user?.job}
          location={user?.region}
          description={user?.userDescription}
          isLoading={isLoadingUser}
          onUpdateProfile={handleUpdateProfile}
          stats={{
            projects: user?.totalProjects,
            likes: user?.totalLikes,
            views: user?.totalViews
          }}
        />;
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
            <SidebarMenuButton className="w-full justify-start gap-3 h-12">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">{user?.nickname || 'Loading...'}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{user?.email || 'please wait'}</span>
                </div>
              </div>
            </SidebarMenuButton>
            {onNavigateToLanding && (
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={onNavigateToLanding}
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
