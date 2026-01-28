import React, { useState, useCallback, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Slider } from "@/app/components/ui/slider";
import {
  Loader2, Sparkles, XCircle, Download, Plus, Image as ImageIcon,
  Grid3x3, Upload, X, Trash2, Copy, Eye, EyeOff, Lock, Unlock,
  Move, RotateCcw, Maximize2, Layers, FolderPlus, Save, FileDown,
  ChevronDown, ChevronRight, ChevronLeft, GripVertical, Camera, Search, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { generate3DModel, checkTaskStatus } from "@/lib/tripo-api";
import { ModelViewer } from "@/app/components/model-viewer";
import { Unified3DScene } from "@/app/components/unified-3d-scene";
import { TravelCard } from "@/app/components/ui/travel-card";
import { Dialog, DialogContent, DialogOverlay } from "@/app/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { projectApi, assetApi, partApi, userApi, ComponentRequest, ProjectRequest, PartType, PartCategory, PartResponse, ProjectResponse, UserResponse } from "@/lib/api";
import { generateThumbnailFromGLB } from "@/lib/thumbnail-generator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { Progress } from "@/app/components/ui/progress";
import { GlassCard } from "@/app/components/ui/glass-card";
// import LiquidGlass from "liquid-glass-react";

// 씬 모델 타입 정의
interface SceneModel {
  id: string;
  partId?: number; // 백엔드에서의 실제 파츠 ID
  partType?: 'OBJECT' | 'BACKGROUND'; // 파츠 타입
  modelUrl?: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  visible: boolean;
  locked: boolean;
  groupId?: string;
  isUploaded?: boolean; // 서버에 업로드된 에셋인지 여부
}

// 백그라운드 업로드 상태 타입
interface PendingUpload {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  file: File;
  previewUrl?: string;
  type: PartType;
  category: PartCategory;
}

// 모델 그룹 타입 정의
interface ModelGroup {
  id: string;
  name: string;
  modelIds: string[];
  expanded: boolean;
}

// 디오라마 타입 정의
interface Diorama {
  id: string;
  name: string;
  models: SceneModel[];
  groups: ModelGroup[];
  createdAt: Date;
  updatedAt: Date;
}

interface PromptingTabProps {
  initialModelUrl?: string;
  initialModelName?: string;
}

export function PromptingTab({ initialModelUrl, initialModelName }: PromptingTabProps = {}) {
  // 환경 변수에서 API 키 가져오기
  // @ts-ignore - Vite 환경 변수 타입
  const apiKey = import.meta.env.VITE_TRIPO_API_KEY;
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModels, setGeneratedModels] = useState<Array<{
    taskId?: string;
    modelUrl?: string;
    downloadUrl?: string;
    previewImageUrl?: string;
    prompt?: string;
    isLoading?: boolean;
    progress?: number;
    status?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [taskProgress, setTaskProgress] = useState<number | null>(null);
  const [taskStatusDetail, setTaskStatusDetail] = useState<string>("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sceneModels, setSceneModels] = useState<SceneModel[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [draggingModelId, setDraggingModelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    partId?: number;
    file: File;
    previewUrl?: string;
    type: "image" | "model";
    isRegistered?: boolean;
  }>>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [transformMode, setTransformMode] = useState<"position" | "rotation" | "scale">("position");
  const [dioramaName, setDioramaName] = useState("새 디오라마");
  const [savedDioramas, setSavedDioramas] = useState<Diorama[]>([]);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [transferMode, setTransferMode] = useState<'send' | 'receive'>('send');
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryParts, setLibraryParts] = useState<PartResponse[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoadProjectDialogOpen, setIsLoadProjectDialogOpen] = useState(false);
  const [myProjects, setMyProjects] = useState<ProjectResponse[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'name'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 한 행에 3개씩 3행 (총 9개)
  
  // 파츠 추천 섹션용 상태
  const [partsSectionPage, setPartsSectionPage] = useState(1);
  const partsPerPage = 6; // 파츠 추천 섹션은 6개씩

  // 라이브러리 파츠 가져오기
  const fetchLibraryParts = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      // 모든 OBJECT 타입 파츠 가져오기
      const parts = await partApi.getParts({ type: 'OBJECT' });

      // URL 정규화: ngrok 또는 S3 전체 URL인 경우 상대 경로(프록시)로 변경
      const normalizedParts = parts.map(part => {
        let modelFileUrl = part.modelFileUrl;
        let thumbnailUrl = part.thumbnailUrl;

        console.log(`[Parts] 부품 로드: ${part.name}, 썸네일: ${thumbnailUrl ? '있음' : '없음'}, 모델: ${modelFileUrl ? '있음' : '없음'}`);

        // modelFileUrl 정규화
        if (modelFileUrl) {
        // 1. ngrok URL 처리
        if (modelFileUrl.includes('ngrok-free.app')) {
          try {
            const url = new URL(modelFileUrl);
            modelFileUrl = url.pathname + url.search;
          } catch (e) { /* ignore */ }
        }
        // 2. S3 URL 처리 (프록시 /s3-proxy 사용)
        // presigned URL의 query string은 제거 (백엔드가 AWS SDK로 직접 S3 접근)
        else if (modelFileUrl.includes('madcampw3withyc1.s3.ap-northeast-2.amazonaws.com')) {
          try {
            const url = new URL(modelFileUrl);
            // query string 제거 - 백엔드 프록시는 AWS SDK를 사용하므로 presigned URL 파라미터 불필요
            modelFileUrl = `/s3-proxy${url.pathname}`;
          } catch (e) { /* ignore */ }
          }
        }

        // thumbnailUrl 정규화
        if (thumbnailUrl) {
          // 1. ngrok URL 처리
          if (thumbnailUrl.includes('ngrok-free.app')) {
            try {
              const url = new URL(thumbnailUrl);
              thumbnailUrl = url.pathname + url.search;
            } catch (e) { /* ignore */ }
          }
          // 2. S3 URL 처리 (프록시 /s3-proxy 사용)
          else if (thumbnailUrl.includes('madcampw3withyc1.s3.ap-northeast-2.amazonaws.com')) {
            try {
              const url = new URL(thumbnailUrl);
              thumbnailUrl = `/s3-proxy${url.pathname}${url.search}`;
            } catch (e) { /* ignore */ }
          }
        }

        return { ...part, modelFileUrl, thumbnailUrl };
      });

      setLibraryParts(normalizedParts);
    } catch (err) {
      console.error("Failed to fetch library parts:", err);
      toast.error("라이브러리 파츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  // 다이얼로그가 열릴 때 데이터 로드
  useEffect(() => {
    if (isSearchDialogOpen) {
      fetchLibraryParts();
    }
  }, [isSearchDialogOpen, fetchLibraryParts]);

  // 컴포넌트 마운트 시 부품 데이터 로드 (파츠 추천 섹션용)
  useEffect(() => {
    if (libraryParts.length === 0) {
      fetchLibraryParts();
    }
  }, []); // 초기 마운트 시 한 번만 실행

  // 파츠 추천 섹션 방향키 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 파츠 추천 섹션이 포커스되어 있을 때만 작동
      const totalPages = Math.ceil(libraryParts.length / partsPerPage);
      if (totalPages <= 1) return;

      if (e.key === 'ArrowLeft' && partsSectionPage > 1) {
        e.preventDefault();
        setPartsSectionPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && partsSectionPage < totalPages) {
        e.preventDefault();
        setPartsSectionPage(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [libraryParts.length, partsSectionPage]);

  // 썸네일이 없는 부품에 대해 GLB에서 썸네일 생성
  useEffect(() => {
    const generateMissingThumbnails = async () => {
      const partsWithoutThumbnails = libraryParts.filter(
        part => !part.thumbnailUrl && part.modelFileUrl
      );

      if (partsWithoutThumbnails.length === 0) {
        console.log('[Thumbnail] 모든 부품에 썸네일이 있습니다.');
        return;
      }

      console.log(`[Thumbnail] 썸네일이 없는 부품 ${partsWithoutThumbnails.length}개 발견`);

      // 한 번에 너무 많이 생성하지 않도록 제한 (처음 6개만)
      const partsToProcess = partsWithoutThumbnails.slice(0, 6);

      const updatedParts = await Promise.all(
        partsToProcess.map(async (part) => {
          try {
            // modelFileUrl이 상대 경로인 경우 API_BASE_URL 추가
            let glbUrl = part.modelFileUrl;
            if (glbUrl && !glbUrl.startsWith('http')) {
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://0590d2abeade.ngrok-free.app';
              glbUrl = `${apiBaseUrl}${glbUrl.startsWith('/') ? '' : '/'}${glbUrl}`;
            }

            console.log(`[Thumbnail] ${part.name}의 썸네일 생성 시도: ${glbUrl}`);

            if (glbUrl) {
              const thumbnail = await generateThumbnailFromGLBUrl(glbUrl);
              if (thumbnail) {
                console.log(`[Thumbnail] ${part.name}의 썸네일 생성 성공: ${thumbnail}`);
                return { ...part, thumbnailUrl: thumbnail };
              } else {
                console.warn(`[Thumbnail] ${part.name}의 썸네일 생성 실패 (null 반환)`);
              }
            } else {
              console.warn(`[Thumbnail] ${part.name}의 GLB URL이 없습니다.`);
            }
          } catch (error) {
            console.error(`[Thumbnail] ${part.name}의 썸네일 생성 중 오류:`, error);
          }
          return part;
        })
      );

      // 업데이트된 부품으로 목록 갱신
      const hasUpdates = updatedParts.some((updated, index) => 
        updated.thumbnailUrl !== partsToProcess[index].thumbnailUrl
      );

      if (hasUpdates) {
        console.log('[Thumbnail] 썸네일 업데이트 적용 중...');
        setLibraryParts(prev => prev.map(part => {
          const updated = updatedParts.find(p => p.id === part.id);
          return updated || part;
        }));
      }
    };

    if (libraryParts.length > 0) {
      // 약간의 지연을 두어 초기 렌더링 후 실행
      const timer = setTimeout(() => {
        generateMissingThumbnails();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [libraryParts.length]); // libraryParts가 변경될 때마다 체크

  // 필터링, 정렬, 페이지네이션 로직
  const filteredAndSortedParts = React.useMemo(() => {
    let result = libraryParts.filter(part =>
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // 최신순 (id가 클수록 최신이라고 가정하거나 createdAt 필드가 있다면 사용)
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [libraryParts, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedParts.length / itemsPerPage);
  const paginatedParts = filteredAndSortedParts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 검색어나 정렬 기준 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // 파츠 업로드 다이얼로그 관련 상태
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploadingPart, setIsUploadingPart] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileData, setUploadFileData] = useState<{
    file: File;
    previewUrl?: string;
    name: string;
    type: PartType;
    category: PartCategory;
  } | null>(null);

  // 백그라운드 업로드 목록
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  // 첫 번째 선택된 모델 (단일 선택용)
  const selectedModelId = selectedModelIds.length === 1 ? selectedModelIds[0] : null;
  const selectedModel = selectedModelId ? sceneModels.find(m => m.id === selectedModelId) : null;

  // 추천 에셋 목록 - Three.js 예제에서 사용하는 실제 GLB 파일 URL 사용
  // 썸네일은 GLB 파일에서 생성되거나 기본 이미지 사용
  const [recommendedAssets, setRecommendedAssets] = useState<Array<{
    id: number;
    name: string;
    thumbnail?: string;
    category: string;
    glbUrl: string;
    thumbnailUrl?: string;
  }>>([
    {
      id: 1,
      name: "의자",
      thumbnail: "🪑",
      category: "가구",
      glbUrl: "https://threejs.org/examples/models/gltf/Chair/glTF-Binary/Chair.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
    },
    {
      id: 2,
      name: "테이블",
      thumbnail: "🪑",
      category: "가구",
      glbUrl: "https://threejs.org/examples/models/gltf/Duck/glTF-Binary/Duck.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400&h=300&fit=crop"
    },
    {
      id: 3,
      name: "램프",
      thumbnail: "💡",
      category: "조명",
      glbUrl: "https://threejs.org/examples/models/gltf/Lantern/glTF-Binary/Lantern.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop"
    },
    {
      id: 4,
      name: "화분",
      thumbnail: "🪴",
      category: "장식",
      glbUrl: "https://threejs.org/examples/models/gltf/Avocado/glTF-Binary/Avocado.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop"
    },
    {
      id: 5,
      name: "책장",
      thumbnail: "📚",
      category: "가구",
      glbUrl: "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
    },
    {
      id: 6,
      name: "소파",
      thumbnail: "🛋️",
      category: "가구",
      glbUrl: "https://threejs.org/examples/models/gltf/FlightHelmet/glTF-Binary/FlightHelmet.glb",
      thumbnailUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop"
    },
  ]);

  // GLB URL에서 직접 썸네일 생성하는 함수
  const generateThumbnailFromGLBUrl = async (glbUrl: string): Promise<string | null> => {
    try {
      console.log(`[Thumbnail] GLB 파일 다운로드 시작: ${glbUrl}`);
      
      // GLB 파일을 fetch하여 File 객체로 변환
      const response = await fetch(glbUrl, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      if (!response.ok) {
        console.warn(`[Thumbnail] GLB 다운로드 실패 (${response.status}): ${response.statusText}`);
        return null;
      }
      
      const blob = await response.blob();
      console.log(`[Thumbnail] GLB 파일 다운로드 완료 (${blob.size} bytes)`);
      
      if (blob.size === 0) {
        console.warn(`[Thumbnail] GLB 파일이 비어있습니다.`);
        return null;
      }
      
      const file = new File([blob], 'model.glb', { type: 'model/gltf-binary' });

      // 썸네일 생성
      console.log(`[Thumbnail] 썸네일 생성 시작...`);
      const thumbnailFile = await generateThumbnailFromGLB(file);
      
      if (!thumbnailFile) {
        console.warn(`[Thumbnail] 썸네일 생성 실패 (null 반환)`);
        return null;
      }

      // File 객체를 URL로 변환하여 반환
      const thumbnailUrl = URL.createObjectURL(thumbnailFile);
      console.log(`[Thumbnail] 썸네일 생성 완료: ${thumbnailUrl}`);
      return thumbnailUrl;
    } catch (error) {
      console.error(`[Thumbnail] 썸네일 생성 중 오류 발생:`, error);
      if (error instanceof Error) {
        console.error(`[Thumbnail] 오류 메시지: ${error.message}`);
        console.error(`[Thumbnail] 스택: ${error.stack}`);
      }
      return null;
    }
  };

  // 초기 모델 로드 (대시보드에서 프로젝트 클릭 시)
  useEffect(() => {
    if (initialModelUrl && initialModelName) {
      // 이미 같은 모델이 있는지 확인 (URL과 이름으로 비교)
      const existingModel = sceneModels.find(
        m => m.modelUrl === initialModelUrl && m.name === initialModelName
      );

      if (!existingModel) {
        // 씬이 비어있으면 중앙에, 아니면 오프셋 적용
        const offset = sceneModels.length * 0.5;
        const centerX = sceneModels.length === 0 ? 0 : offset;
        const centerY = 0;
        const centerZ = sceneModels.length === 0 ? 0 : offset;

        const newModel: SceneModel = {
          id: `initial-${Date.now()}`,
          modelUrl: initialModelUrl,
          name: initialModelName,
          position: { x: centerX, y: centerY, z: centerZ },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
          visible: true,
          locked: false,
        };

        setSceneModels((prev) => [...prev, newModel]);
        setSelectedModelIds([newModel.id]);
        toast.success(`${initialModelName}이(가) 씬에 추가되었습니다.`);
      } else {
        // 이미 있는 모델이면 선택만
        setSelectedModelIds([existingModel.id]);
      }
    }
  }, [initialModelUrl, initialModelName]); // sceneModels 의존성 제거하여 무한 루프 방지

  // 추천 에셋 썸네일 생성 (GLB에서 생성 시도, 실패하면 하드코딩된 썸네일 사용)
  useEffect(() => {
    const generateThumbnails = async () => {
      const updatedAssets = await Promise.all(
        recommendedAssets.map(async (asset) => {
          // 이미 썸네일 URL이 있으면 스킵 (하드코딩된 썸네일 사용)
          if (asset.thumbnailUrl && asset.thumbnailUrl.startsWith('http')) {
            return asset;
          }

          try {
            // GLB URL에서 썸네일 생성 시도
            const thumbnail = await generateThumbnailFromGLBUrl(asset.glbUrl);
            if (thumbnail) {
              return { ...asset, thumbnailUrl: thumbnail };
            }
          } catch (error) {
            console.error(`Error generating thumbnail for ${asset.name}:`, error);
          }
          // 썸네일 생성 실패 시 하드코딩된 썸네일 유지
          return asset;
        })
      );
      setRecommendedAssets(updatedAssets);
    };

    generateThumbnails();
  }, []); // 초기 마운트 시 한 번만 실행

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("프롬프트를 입력해주세요.");
      return;
    }

    if (!apiKey) {
      toast.error("Tripo AI API 키가 설정되지 않았습니다. .env 파일에 VITE_TRIPO_API_KEY를 설정해주세요.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("생성 요청 중...");

    try {
      // Tripo AI API로 3D 모델 생성 요청
      const result = await generate3DModel(prompt, apiKey);

      setStatus("생성 중...");
      toast.success("생성 요청이 성공적으로 전송되었습니다!");

      // 작업 ID가 있으면 상태 확인
      if (result.task_id) {
        const newModel = {
          taskId: result.task_id,
          modelUrl: undefined, // 초기에는 URL이 없음
          prompt: prompt,
          isLoading: true,
          progress: 0,
          status: "queued",
        };
        setGeneratedModels((prev) => [...prev, newModel]);
        checkTaskStatusPolling(result.task_id, apiKey);
      } else if (result.model_url || result.data?.output?.model) {
        // 즉시 모델 URL이 반환된 경우 (거의 없지만 예외 처리)
        const modelUrl = result.model_url || result.data?.output?.model;
        setGeneratedModels((prev) => [...prev, {
          modelUrl: modelUrl,
          downloadUrl: modelUrl,
          prompt: prompt,
          isLoading: false,
          progress: 100,
          status: "success",
        }]);
        setStatus("생성 완료");
        toast.success("3D 모델이 성공적으로 생성되었습니다!");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
      setStatus("");
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // 작업 상태를 주기적으로 확인하는 함수 (폴링)
  const checkTaskStatusPolling = async (taskId: string, apiKey: string) => {
    // 최대 30분까지 폴링 (5초 간격 = 360회)
    const maxAttempts = 360;
    let attempts = 0;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const result = await checkTaskStatus(taskId, apiKey);

        // 진행률 가져오기 (응답 구조에 따라)
        const progress = result.data?.progress ?? null;

        // 상태 및 진행률 업데이트
        const statusText = {
          queued: "대기 중",
          running: "생성 중",
          success: "생성 완료",
          failed: "실패",
          banned: "차단됨",
          expired: "만료됨",
          cancelled: "취소됨",
          unknown: "알 수 없음",
        }[result.status || ""] || result.status || "알 수 없음";

        // 현재 모델의 진행률 계산
        const currentProgress = progress !== null && progress !== undefined
          ? progress
          : result.status === "queued"
            ? 0
            : result.status === "running"
              ? 50
              : null;

        // 모델 상태 업데이트
        setGeneratedModels((prev) =>
          prev.map((m) =>
            m.taskId === taskId
              ? {
                ...m,
                isLoading: result.status === "queued" || result.status === "running",
                progress: currentProgress ?? m.progress ?? 0,
                status: result.status || m.status,
                previewImageUrl: result.data?.output?.rendered_image || m.previewImageUrl,
              }
              : m
          )
        );

        // 전역 상태 업데이트 (UI 표시용)
        setTaskStatusDetail(statusText);
        if (currentProgress !== null) {
          setTaskProgress(currentProgress);
        }
        if (currentProgress !== null && currentProgress !== undefined) {
          setStatus(`${statusText}... ${currentProgress}%`);
        } else {
          setStatus(`${statusText}...`);
        }

        // Tripo AI API 상태: success, failed, banned, expired, cancelled, unknown
        if (result.status === "success") {
          // success 상태일 때 모델 URL 확인 (우선순위: model > pbr_model > base_model)
          const modelUrl =
            result.model_url ||
            result.data?.output?.model ||
            result.data?.output?.pbr_model ||
            result.data?.output?.base_model;

          // 미리보기 이미지 URL (rendered_image)
          const previewImageUrl = result.data?.output?.rendered_image;

          setStatus("생성 완료");
          setTaskProgress(100);
          setTaskStatusDetail("생성 완료");

          setGeneratedModels((prev) =>
            prev.map((m) =>
              m.taskId === taskId
                ? {
                  ...m,
                  modelUrl: modelUrl || m.modelUrl,
                  downloadUrl: modelUrl || m.downloadUrl,
                  previewImageUrl: previewImageUrl || m.previewImageUrl,
                  isLoading: false,
                  progress: 100,
                  status: "success",
                }
                : m
            )
          );
          setIsGenerating(false);

          if (modelUrl) {
            toast.success("3D 모델이 성공적으로 생성되었습니다!");
          } else {
            toast.warning("모델 생성은 완료되었지만 다운로드 URL을 찾을 수 없습니다.");
          }

          if (pollInterval) {
            clearTimeout(pollInterval);
          }
          return;
        }

        if (result.status === "failed" || result.status === "banned" || result.status === "expired" || result.status === "cancelled" || result.error) {
          setGeneratedModels((prev) =>
            prev.map((m) =>
              m.taskId === taskId
                ? {
                  ...m,
                  isLoading: false,
                  status: result.status || "failed",
                }
                : m
            )
          );
          setIsGenerating(false);
          if (pollInterval) {
            clearTimeout(pollInterval);
          }
          throw new Error(result.error || `모델 생성에 실패했습니다. 상태: ${statusText}`);
        }

        // queued 또는 running 상태면 계속 폴링
        if (result.status === "queued" || result.status === "running") {
          attempts++;
          if (attempts < maxAttempts) {
            pollInterval = setTimeout(poll, 5000); // 5초 후 다시 확인
          } else {
            setGeneratedModels((prev) =>
              prev.map((m) =>
                m.taskId === taskId
                  ? {
                    ...m,
                    isLoading: false,
                    status: "timeout",
                  }
                  : m
              )
            );
            setIsGenerating(false);
            if (pollInterval) {
              clearTimeout(pollInterval);
            }
            throw new Error("생성 시간이 초과되었습니다. (30분) Task ID를 확인하여 나중에 다시 확인해주세요.");
          }
        } else {
          setGeneratedModels((prev) =>
            prev.map((m) =>
              m.taskId === taskId
                ? {
                  ...m,
                  isLoading: false,
                  status: result.status || "unknown",
                }
                : m
            )
          );
          setIsGenerating(false);
          if (pollInterval) {
            clearTimeout(pollInterval);
          }
          throw new Error(`예상치 못한 상태입니다: ${statusText}`);
        }
      } catch (err) {
        setIsGenerating(false);
        if (pollInterval) {
          clearTimeout(pollInterval);
        }
        const errorMessage = err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다.";
        setError(errorMessage);
        setStatus("");
        setTaskProgress(null);
        setTaskStatusDetail("");
        toast.error(errorMessage);
      }
    };

    poll();
  };

  const handleDownload = async (model: { taskId?: string; modelUrl?: string; downloadUrl?: string }) => {
    if (!model.modelUrl && !model.taskId) {
      toast.error("다운로드할 모델이 없습니다.");
      return;
    }

    try {
      let downloadUrl = model.downloadUrl || model.modelUrl;

      // 다운로드 URL이 없으면 Task 상태를 다시 확인하여 가져오기
      if (!downloadUrl && model.taskId && apiKey) {
        const taskStatus = await checkTaskStatus(model.taskId, apiKey);

        // 모델 URL 우선순위: model > pbr_model > base_model
        downloadUrl =
          taskStatus.model_url ||
          taskStatus.data?.output?.model ||
          taskStatus.data?.output?.pbr_model ||
          taskStatus.data?.output?.base_model;

        if (downloadUrl) {
          setGeneratedModels((prev) =>
            prev.map((m) =>
              m.taskId === model.taskId
                ? { ...m, modelUrl: downloadUrl, downloadUrl }
                : m
            )
          );
        }
      }

      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        toast.success("다운로드가 시작되었습니다.");
      } else {
        toast.error("다운로드 URL을 찾을 수 없습니다.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.";
      toast.error(errorMessage);
      console.error("Download error:", err);
    }
  };

  const handleAddToScene = async (model: { modelUrl?: string; prompt?: string; taskId?: string }) => {
    if (model.modelUrl) {
      const newModel: SceneModel = {
        id: model.taskId || `model-${Date.now()}`,
        modelUrl: model.modelUrl,
        name: model.prompt || "3D 모델",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        visible: true,
        locked: false,
      };
      setSceneModels((prev) => [...prev, newModel]);
      setSelectedModelIds([newModel.id]);

      // AI 생성 모델인 경우 백엔드에 등록
      if (model.taskId && model.modelUrl) {
        try {
          const partIdValue = await assetApi.confirmAiAsset(
            model.prompt || "3D 모델",
            model.modelUrl
          );
          console.log('AI 에셋이 백엔드에 등록되었습니다:', partIdValue);

          // 씬의 모델 정보에 백엔드 partId 업데이트
          setSceneModels(prev => prev.map(m =>
            m.id === newModel.id ? { ...m, partId: partIdValue } : m
          ));
        } catch (error) {
          console.error('AI 에셋 등록 실패:', error);
          // 에러가 발생해도 씬에는 추가됨
        }
      }

      toast.success("씬에 추가되었습니다.");
    } else {
      toast.error("모델을 씬에 추가할 수 없습니다.");
    }
  };

  // 모델 복제
  const handleDuplicateModel = useCallback((modelId: string) => {
    const model = sceneModels.find(m => m.id === modelId);
    if (!model) return;

    const newModel: SceneModel = {
      ...model,
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${model.name} (복사본)`,
      position: {
        x: model.position.x + 0.5,
        y: model.position.y,
        z: model.position.z + 0.5
      },
      groupId: undefined,
    };
    setSceneModels((prev) => [...prev, newModel]);
    setSelectedModelIds([newModel.id]);
    toast.success("모델이 복제되었습니다.");
  }, [sceneModels]);

  // 모델 표시/숨김 토글
  const handleToggleVisibility = useCallback((modelId: string) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId ? { ...model, visible: !model.visible } : model
      )
    );
  }, []);

  // 모델 잠금/해제 토글
  const handleToggleLock = useCallback((modelId: string) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId ? { ...model, locked: !model.locked } : model
      )
    );
  }, []);

  // 모델 변환 업데이트
  const handleTransformUpdate = useCallback((
    modelId: string,
    property: "position" | "rotation" | "scale",
    axis: "x" | "y" | "z" | "uniform",
    value: number
  ) => {
    setSceneModels((prev) =>
      prev.map((model) => {
        if (model.id !== modelId || model.locked) return model;

        if (property === "scale") {
          return { ...model, scale: value };
        } else {
          return {
            ...model,
            [property]: { ...model[property], [axis]: value }
          };
        }
      })
    );
  }, []);

  // 그룹 생성
  const handleCreateGroup = useCallback(() => {
    if (selectedModelIds.length < 2) {
      toast.error("그룹을 만들려면 2개 이상의 모델을 선택하세요.");
      return;
    }

    const groupId = `group-${Date.now()}`;
    const newGroup: ModelGroup = {
      id: groupId,
      name: `그룹 ${modelGroups.length + 1}`,
      modelIds: [...selectedModelIds],
      expanded: true,
    };

    setModelGroups((prev) => [...prev, newGroup]);
    setSceneModels((prev) =>
      prev.map((model) =>
        selectedModelIds.includes(model.id) ? { ...model, groupId } : model
      )
    );
    toast.success("그룹이 생성되었습니다.");
  }, [selectedModelIds, modelGroups.length]);

  // 그룹 해제
  const handleUngroupModels = useCallback((groupId: string) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.groupId === groupId ? { ...model, groupId: undefined } : model
      )
    );
    setModelGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast.success("그룹이 해제되었습니다.");
  }, []);

  // 그룹 펼치기/접기
  const handleToggleGroupExpand = useCallback((groupId: string) => {
    setModelGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, expanded: !group.expanded } : group
      )
    );
  }, []);

  // 디오라마 저장 (백엔드 API 연결)
  const handleSaveDiorama = useCallback(async () => {
    try {
      // 현재 사용자 정보 가져오기
      const user = await userApi.getMe();
      const userId = user.id;
      
      console.log('[Save Project] Current user:', user);
      console.log('[Save Project] Using userId:', userId);
      
      if (!userId || userId === 0) {
        throw new Error('사용자 ID를 가져올 수 없습니다. 로그인 상태를 확인해주세요.');
      }
      
      // currentProjectId가 있으면 해당 프로젝트가 존재하는지 확인
      let currentProjectId: number | undefined = undefined;
      const storedProjectId = localStorage.getItem('currentProjectId');
      if (storedProjectId) {
        const projectId = parseInt(storedProjectId, 10);
        try {
          // 프로젝트가 존재하는지 확인
          await projectApi.getProject(projectId);
          currentProjectId = projectId;
          console.log('[Save Project] Using existing projectId:', currentProjectId);
        } catch (error) {
          // 프로젝트가 존재하지 않으면 localStorage에서 제거
          console.warn('[Save Project] Project not found, removing from localStorage:', projectId);
          localStorage.removeItem('currentProjectId');
        }
      }

      // 씬 모델을 컴포넌트 요청 형식으로 변환 (partId가 있는 모델만)
      const components: ComponentRequest[] = sceneModels
        .filter(m => m.modelUrl && m.visible && m.partId && m.partId > 0) // partId가 있어야 함
        .map(m => ({
          partId: m.partId!, // partId가 있는 것만 필터링했으므로 non-null assertion 사용
          posX: m.position.x,
          posY: m.position.y,
          posZ: m.position.z,
          rotX: m.rotation.x,
          rotY: m.rotation.y,
          rotZ: m.rotation.z,
          scaleX: m.scale,
          scaleY: m.scale,
          scaleZ: m.scale,
        }));
      
      console.log('[Save Project] Components to save:', components);
      console.log('[Save Project] Components count:', components.length);

      // 프로젝트 요청 생성
      const projectRequest: ProjectRequest = {
        title: dioramaName,
        description: `Created with ${sceneModels.length} models`,
        isPublic: false,
        components: components,
      };

      // 백엔드에 저장
      let projectId: number;
      try {
        projectId = await projectApi.saveProject(userId, projectRequest, currentProjectId);
      } catch (error) {
        // 프로젝트를 찾을 수 없는 경우 (404 또는 500 에러), 새 프로젝트로 생성
        if (error instanceof Error && (
          error.message.includes('Project not found') || 
          error.message.includes('500') ||
          error.message.includes('404')
        )) {
          console.warn('기존 프로젝트를 찾을 수 없습니다. 새 프로젝트로 생성합니다.');
          // currentProjectId를 제거하고 새 프로젝트로 생성
          localStorage.removeItem('currentProjectId');
          projectId = await projectApi.saveProject(userId, projectRequest, undefined);
        } else {
          throw error;
        }
      }

      // 프로젝트 ID 저장
      localStorage.setItem('currentProjectId', projectId.toString());

      toast.success(`"${dioramaName}" 프로젝트가 저장되었습니다.`);
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      toast.error(error instanceof Error ? error.message : '프로젝트 저장에 실패했습니다.');

      // 실패 시 로컬 스토리지에 백업 저장
      const diorama: Diorama = {
        id: `diorama-${Date.now()}`,
        name: dioramaName,
        models: [...sceneModels],
        groups: [...modelGroups],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const existingDioramas = JSON.parse(localStorage.getItem("dioramas") || "[]");
      existingDioramas.push(diorama);
      localStorage.setItem("dioramas", JSON.stringify(existingDioramas));
      setSavedDioramas((prev) => [...prev, diorama]);
    }
  }, [dioramaName, sceneModels, modelGroups]);

  // 디오라마 내보내기 (GLB)
  const handleExportDiorama = useCallback(async () => {
    if (sceneModels.length === 0) {
      toast.error("내보낼 모델이 없습니다.");
      return;
    }

    try {
      toast.info("GLB 파일 생성 중...");

      // Three.js와 GLTFExporter 로드
      const THREE = await import('three');
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

      // 임시 씬 생성
      const exportScene = new THREE.Scene();
      const loader = new GLTFLoader();

      // 모든 모델 로드 및 씬에 추가
      const loadPromises = sceneModels
        .filter(model => model.visible && model.modelUrl)
        .map(async (model) => {
          try {
            const gltf = await new Promise<any>((resolve, reject) => {
              loader.load(
                model.modelUrl!,
                resolve,
                undefined,
                reject
              );
            });

            const modelGroup = gltf.scene.clone();

            // 위치, 회전, 스케일 적용
            modelGroup.position.set(
              model.position.x,
              model.position.y,
              model.position.z
            );
            modelGroup.rotation.set(
              model.rotation.x,
              model.rotation.y,
              model.rotation.z
            );
            modelGroup.scale.set(
              model.scale,
              model.scale,
              model.scale
            );

            // 모델 이름 설정
            modelGroup.name = model.name || `Model_${model.id}`;

            exportScene.add(modelGroup);
          } catch (error) {
            console.error(`Failed to load model ${model.id}:`, error);
            toast.warning(`모델 "${model.name}" 로드 실패`);
          }
        });

      await Promise.all(loadPromises);

      if (exportScene.children.length === 0) {
        toast.error("내보낼 수 있는 모델이 없습니다.");
        return;
      }

      // GLTFExporter로 GLB 파일 생성
      const exporter = new GLTFExporter();
      const result = await new Promise<any>((resolve, reject) => {
        exporter.parse(
          exportScene,
          (glb: any) => resolve(glb),
          (error: Error) => reject(error),
          {
            binary: true, // GLB 형식으로 내보내기
            includeCustomExtensions: true,
          }
        );
      });

      // Blob 생성 및 다운로드
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dioramaName.replace(/\s+/g, "_")}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("GLB 파일이 내보내졌습니다.");
    } catch (error) {
      console.error('GLB 내보내기 실패:', error);
      toast.error("GLB 파일 내보내기 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
    }
  }, [dioramaName, sceneModels]);

  // 내 프로젝트 목록 가져오기
  const fetchMyProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      // 현재 사용자 정보 가져오기
      const user = await userApi.getMe();
      
      // /api/projects/me 엔드포인트를 사용하여 내 프로젝트만 가져오기 (userId 포함)
      const myProjectsList = await projectApi.getMyProjects({ 
        sort: 'latest',
        userId: user.id 
      });
      setMyProjects(myProjectsList);
    } catch (err) {
      console.error("Failed to fetch my projects:", err);
      toast.error("프로젝트 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  // 프로젝트 불러오기 다이얼로그 열기
  const handleOpenLoadProjectDialog = useCallback(() => {
    setIsLoadProjectDialogOpen(true);
    fetchMyProjects();
  }, [fetchMyProjects]);

  // 프로젝트 선택 및 로드
  const handleLoadProject = useCallback(async (projectId: number) => {
    try {
      setIsLoadingProjects(true);
      toast.info("프로젝트를 불러오는 중...");
      
      const project = await projectApi.getProject(projectId);
      
      // 모든 컴포넌트의 파츠 정보를 병렬로 가져오기
      const partPromises = project.components.map(component => 
        partApi.getPart(component.partId).catch(err => {
          console.error(`Failed to get part ${component.partId}:`, err);
          return null;
        })
      );
      
      const parts = await Promise.all(partPromises);
      
      // 프로젝트의 컴포넌트들을 SceneModel로 변환
      const models: SceneModel[] = project.components.map((component, index) => {
        const part = parts[index];
        return {
          id: `project-${project.id}-component-${component.id}-${Date.now()}`,
          partId: component.partId,
          partType: part?.type || 'OBJECT', // 파츠 타입 설정
          modelUrl: part?.modelFileUrl, // 파츠의 모델 URL 설정
          name: component.partName || part?.name || `Component ${index + 1}`,
          position: { x: component.posX, y: component.posY, z: component.posZ },
          rotation: { x: component.rotX, y: component.rotY, z: component.rotZ },
          scale: component.scaleX || 1, // scaleX를 기본값으로 사용
          visible: true,
          locked: false,
        };
      });

      // 배경 파츠가 있으면 추가
      if (project.backgroundPartId) {
        try {
          const backgroundPart = await partApi.getPart(project.backgroundPartId);
          if (backgroundPart.modelFileUrl) {
            const backgroundModel: SceneModel = {
              id: `project-${project.id}-background-${Date.now()}`,
              partId: project.backgroundPartId,
              partType: 'BACKGROUND',
              modelUrl: backgroundPart.modelFileUrl,
              name: project.backgroundPartName || backgroundPart.name || '배경',
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: 1,
              visible: true,
              locked: false,
            };
            models.push(backgroundModel);
          }
        } catch (err) {
          console.error("Failed to load background part:", err);
        }
      }

      setSceneModels(models);
      setDioramaName(project.title);
      setModelGroups([]); // 그룹 초기화
      setSelectedModelIds([]);
      setIsLoadProjectDialogOpen(false);
      toast.success(`"${project.title}" 프로젝트를 불러왔습니다.`);
    } catch (err) {
      console.error("Failed to load project:", err);
      toast.error("프로젝트를 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  // 디오라마 불러오기 (로컬 파일 - 레거시)
  const handleImportDiorama = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.models) {
          setSceneModels(data.models.map((m: any) => ({
            ...m,
            visible: m.visible ?? true,
            locked: m.locked ?? false,
          })));
        }
        if (data.groups) {
          setModelGroups(data.groups);
        }
        if (data.name) {
          setDioramaName(data.name);
        }
        toast.success("디오라마를 불러왔습니다.");
      } catch {
        toast.error("디오라마 파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // 모델 선택 핸들러 (다중 선택 지원)
  const handleModelSelect = useCallback((modelId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedModelIds((prev) =>
        prev.includes(modelId)
          ? prev.filter((id) => id !== modelId)
          : [...prev, modelId]
      );
    } else {
      setSelectedModelIds([modelId]);
    }
  }, []);

  // 3D 씬에서 모델 위치 업데이트
  const handleModelPositionUpdate = (modelId: string, position: { x: number; y: number; z: number }) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId
          ? { ...model, position: { ...model.position, ...position } }
          : model
      )
    );
  };

  // 3D 씬에서 모델 회전 업데이트
  const handleModelRotationUpdate = (modelId: string, rotation: { x: number; y: number; z: number }) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId
          ? { ...model, rotation: { ...model.rotation, ...rotation } }
          : model
      )
    );
  };

  // 3D 씬에서 모델 크기 업데이트
  const handleModelScaleUpdate = (modelId: string, scale: number) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId
          ? { ...model, scale }
          : model
      )
    );
  };

  // transformMode를 3D 씬용 모드로 변환
  const getSceneTransformMode = (): 'translate' | 'rotate' | 'scale' => {
    switch (transformMode) {
      case 'position': return 'translate';
      case 'rotation': return 'rotate';
      case 'scale': return 'scale';
      default: return 'translate';
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const modelTypes = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];
    const allowedExtensions = [".glb", ".obj", ".fbx", ".stl"];

    for (const file of Array.from(files)) {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      const isImage = imageTypes.includes(file.type) || [".jpg", ".jpeg", ".png", ".webp"].includes(fileExtension);
      const isModel = modelTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

      if (!isImage && !isModel) {
        toast.error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
        continue;
      }

      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name}: 파일 크기가 100MB를 초과합니다.`);
        continue;
      }

      const fileId = `file-${Date.now()}-${Math.random()}`;
      let previewUrl: string | undefined;

      if (isImage) {
        previewUrl = URL.createObjectURL(file);

        setUploadedFiles((prev) => [
          ...prev,
          {
            id: fileId,
            file,
            previewUrl,
            type: "image",
          },
        ]);
        toast.success(`${file.name}이(가) 업로드되었습니다.`);
      } else if (isModel) {
        // 3D 모델 파일인 경우 정보 입력창 즉시 띄우기 (Non-blocking)
        const partialData = {
          file,
          previewUrl: undefined,
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: 'OBJECT' as PartType,
          category: 'FURNITURE_HOME' as PartCategory
        };

        setUploadFileData(partialData);
        setIsUploadDialogOpen(true);
        toast.info(`${file.name} 정보를 확인해주세요.`);

        // 썸네일은 백그라운드에서 생성
        if (fileExtension === ".glb") {
          generateThumbnailFromGLB(file).then(thumbnailFile => {
            if (thumbnailFile) {
              const url = URL.createObjectURL(thumbnailFile);
              setUploadFileData(prev => prev ? { ...prev, previewUrl: url } : null);
            }
          }).catch(err => {
            console.error("Delayed thumbnail generation failed:", err);
          });
        }
      }
    }
  };

  // 파츠 업로드 확정 핸들러 (백그라운드 처리)
  const handleConfirmUpload = async () => {
    if (!uploadFileData) return;

    const uploadId = `upload-${Date.now()}`;
    const fileId = `file-${Date.now()}-${Math.random()}`;

    // 1. 업로드 큐에 추가할 펜딩 객체
    const newPending: PendingUpload = {
      id: uploadId,
      name: uploadFileData.name,
      progress: 0,
      status: 'uploading',
      file: uploadFileData.file,
      previewUrl: uploadFileData.previewUrl,
      type: uploadFileData.type,
      category: uploadFileData.category,
    };

    // 2. 즉시 목록에 추가 (Pending 상태)
    setUploadedFiles((prev) => [
      ...prev,
      {
        id: fileId,
        file: uploadFileData.file,
        previewUrl: uploadFileData.previewUrl,
        type: "model",
        isRegistered: false,
        isPending: true,
      },
    ]);

    // 3. 팝업 즉시 닫기
    setPendingUploads(prev => [...prev, newPending]);
    setIsUploadDialogOpen(false);

    const currentUploadData = { ...uploadFileData };
    setUploadFileData(null);
    setUploadProgress(0);

    toast.info(`"${currentUploadData.name}" 업로드를 시작합니다.`);

    // 4. 썸네일 생성 및 백그라운드 업로드 수행
    (async () => {
      try {
        // 썸네일 생성
        toast.info('썸네일 생성 중...');
        const thumbnailFile = await generateThumbnailFromGLB(currentUploadData.file);

        // partApi.uploadPart를 사용하여 GLB와 썸네일 함께 업로드
        const partId = await partApi.uploadPart(
          currentUploadData.name,
          currentUploadData.type,
          currentUploadData.category,
          currentUploadData.file,
          thumbnailFile,
          (progress) => {
            setPendingUploads(prev => prev.map(u =>
              u.id === uploadId ? {
                ...u,
                progress,
                status: progress === 100 ? 'processing' : 'uploading'
              } : u
            ));
          }
        );

        // 성공 시 업데이트
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, partId, isRegistered: true, isPending: false } : f
        ));

        setSceneModels(prev => prev.map(m =>
          m.id === fileId ? { ...m, partId, partType: currentUploadData.type } : m
        ));

        setPendingUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u
        ));

        setTimeout(() => {
          setPendingUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 3000);

        toast.success(`"${currentUploadData.name}" 등록 완료!`);
        
        // 업로드 완료 후 부품 목록 새로고침
        await fetchLibraryParts();
      } catch (error) {
        console.error('Background part upload failed:', error);
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, isPending: false } : f
        ));
        setPendingUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: 'error' } : u
        ));
        toast.error(`"${currentUploadData.name}" 등록 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    })();
  };

  // 파일 삭제 핸들러
  const handleFileRemove = (fileId: string, previewUrl?: string) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.success("파일이 삭제되었습니다.");
  };

  // 파일 드래그 앤 드롭 핸들러
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFileUpload(files);
    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = "";
  };

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent, asset: { id?: number; partId?: number; partType?: 'OBJECT' | 'BACKGROUND'; modelUrl?: string; prompt?: string; taskId?: string; name?: string; thumbnail?: string; category?: string; file?: File; previewUrl?: string }) => {
    const dragData = {
      type: asset.modelUrl ? "generated" : asset.file ? "uploaded" : "recommended",
      id: asset.id,
      partId: asset.partId,
      partType: asset.partType,
      modelUrl: asset.modelUrl,
      prompt: asset.prompt,
      taskId: asset.taskId,
      name: asset.name || asset.prompt || asset.file?.name || "에셋",
      thumbnail: asset.thumbnail,
      category: asset.category,
      file: asset.file ? {
        name: asset.file.name,
        size: asset.file.size,
        type: asset.file.type,
      } : undefined,
      previewUrl: asset.previewUrl,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
  };

  // 드롭 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    try {
      // 드래그 데이터 가져오기
      let dragDataStr = e.dataTransfer.getData("application/json");

      // 데이터가 없으면 다른 형식으로 시도
      if (!dragDataStr) {
        // 파일이 직접 드롭된 경우
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          handleFileUpload(files);
          return;
        }
        console.error("드래그 데이터를 찾을 수 없습니다.");
        return;
      }

      const dragData = JSON.parse(dragDataStr);

      // 씬에 이미 있는 모델 수에 따라 오프셋 적용
      const offset = sceneModels.length * 0.5;
      const centerX = offset;
      const centerY = 0;
      const centerZ = offset;

      if (dragData.type === "generated" && dragData.modelUrl) {
        const newModel: SceneModel = {
          id: dragData.taskId || `model-${Date.now()}`,
          partId: dragData.id,
          partType: dragData.partType || 'OBJECT',
          modelUrl: dragData.modelUrl,
          name: dragData.name || dragData.prompt || "3D 모델",
          position: { x: centerX, y: centerY, z: centerZ },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
          visible: true,
          locked: false,
        };
        setSceneModels((prev) => [...prev, newModel]);
        setSelectedModelIds([newModel.id]);
        toast.success("씬에 추가되었습니다.");
      } else if (dragData.type === "uploaded" && dragData.file) {
        // 업로드된 파일의 경우
        const uploadedFile = uploadedFiles.find(f => f.file.name === dragData.file.name);
        if (uploadedFile) {
          if (uploadedFile.type === "model") {
            // 3D 모델 파일인 경우
            const fileUrl = URL.createObjectURL(uploadedFile.file);
            const newModel: SceneModel = {
              id: uploadedFile.id,
              partId: uploadedFile.partId,
              partType: dragData.partType || 'OBJECT',
              modelUrl: fileUrl,
              name: uploadedFile.file.name,
              position: { x: centerX, y: centerY, z: centerZ },
              rotation: { x: 0, y: 0, z: 0 },
              scale: 1,
              visible: true,
              locked: false,
              isUploaded: uploadedFile.isRegistered,
            };
            setSceneModels((prev) => [...prev, newModel]);
            setSelectedModelIds([newModel.id]);
            toast.success("씬에 추가되었습니다.");
          } else {
            // 이미지 파일인 경우
            toast.info("이미지 파일은 3D 모델로 변환 후 씬에 추가할 수 있습니다.");
          }
        }
      } else if (dragData.type === "recommended" && dragData.modelUrl) {
        // 추천 에셋의 경우 - 실제 GLB 파일 URL 사용
        const offset = sceneModels.length * 0.5;
        const centerX = offset;
        const centerY = 0;
        const centerZ = offset;

        const newModel: SceneModel = {
          id: `recommended-${dragData.name}-${Date.now()}`,
          partId: dragData.id,
          partType: dragData.partType || 'OBJECT',
          modelUrl: dragData.modelUrl,
          name: dragData.name || "추천 에셋",
          position: { x: centerX, y: centerY, z: centerZ },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
          visible: true,
          locked: false,
        };
        setSceneModels((prev) => [...prev, newModel]);
        setSelectedModelIds([newModel.id]);
        toast.success("씬에 추가되었습니다.");
      } else if (dragData.type === "recommended") {
        toast.info(`"${dragData.name}" 에셋을 씬에 추가하려면 먼저 생성해주세요.`);
      }
    } catch (err) {
      console.error("드롭 처리 오류:", err);
    }
  };

  // 드래그 오버 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);
  };

  // 드래그 리브 핸들러 - 실제로 뷰포트를 벗어날 때만 false로 설정
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // relatedTarget이 뷰포트 외부이거나 null인 경우에만 false로 설정
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !target.contains(relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  // 모델 삭제 핸들러
  const handleModelDelete = useCallback((modelId: string) => {
    setSceneModels((prev) => {
      const model = prev.find(m => m.id === modelId);
      // Blob URL인 경우 메모리 해제
      if (model?.modelUrl && model.modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(model.modelUrl);
      }
      return prev.filter(m => m.id !== modelId);
    });
    // 그룹에서도 제거
    setModelGroups((prev) =>
      prev.map((group) => ({
        ...group,
        modelIds: group.modelIds.filter((id) => id !== modelId),
      })).filter((group) => group.modelIds.length > 0)
    );
    setSelectedModelIds((prev) => prev.filter((id) => id !== modelId));
    toast.success("모델이 삭제되었습니다.");
  }, []);

  // 선택된 모든 모델 삭제
  const handleDeleteSelectedModels = useCallback(() => {
    if (selectedModelIds.length === 0) return;

    selectedModelIds.forEach((id) => {
      const model = sceneModels.find(m => m.id === id);
      if (model?.modelUrl && model.modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(model.modelUrl);
      }
    });

    setSceneModels((prev) => prev.filter((m) => !selectedModelIds.includes(m.id)));
    setModelGroups((prev) =>
      prev.map((group) => ({
        ...group,
        modelIds: group.modelIds.filter((id) => !selectedModelIds.includes(id)),
      })).filter((group) => group.modelIds.length > 0)
    );
    setSelectedModelIds([]);
    toast.success(`${selectedModelIds.length}개 모델이 삭제되었습니다.`);
  }, [selectedModelIds, sceneModels]);

  // 모델 클릭 핸들러
  const handleModelClick = useCallback((modelId: string) => {
    setSelectedModelIds([modelId]);
  }, []);

  // 뷰포트 클릭 핸들러 (배경 클릭 시 선택 해제)
  const handleViewportClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedModelIds([]);
    }
  };

  // 모델 이름 변경
  const handleRenameModel = useCallback((modelId: string, newName: string) => {
    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === modelId ? { ...model, name: newName } : model
      )
    );
  }, []);

  // 그룹 이름 변경
  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
    setModelGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, name: newName } : group
      )
    );
  }, []);

  // 그룹이 없는 모델들
  const ungroupedModels = sceneModels.filter((m) => !m.groupId);
  // 타입별로 모델 분리
  const objectModels = ungroupedModels.filter((m) => !m.partType || m.partType === 'OBJECT');
  const backgroundModels = ungroupedModels.filter((m) => m.partType === 'BACKGROUND');

  // 모델 드래그 시작 핸들러
  const handleModelDragStart = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const model = sceneModels.find(m => m.id === modelId);
    if (!model) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewport = (e.currentTarget.closest('[class*="absolute"]')?.parentElement as HTMLElement);
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const offsetX = e.clientX - (model.position?.x || 0) - viewportRect.left;
    const offsetY = e.clientY - (model.position?.y || 0) - viewportRect.top;

    setDraggingModelId(modelId);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedModelIds([modelId]);
  };

  // 모델 드래그 핸들러
  const handleModelDrag = (e: React.MouseEvent) => {
    if (!draggingModelId || !dragOffset) return;

    const viewport = e.currentTarget as HTMLElement;
    const viewportRect = viewport.getBoundingClientRect();
    const newX = e.clientX - viewportRect.left - dragOffset.x;
    const newY = e.clientY - viewportRect.top - dragOffset.y;

    setSceneModels((prev) =>
      prev.map((model) =>
        model.id === draggingModelId
          ? { ...model, position: { x: newX, y: newY, z: model.position.z } }
          : model
      )
    );
  };

  // 모델 드래그 종료 핸들러
  const handleModelDragEnd = () => {
    setDraggingModelId(null);
    setDragOffset(null);
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* 왼쪽 패널: 프롬프팅 입력 및 설정 */}
      <div className="w-80 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">모델 생성</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                프롬프트 입력
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="원하는 3D 모델을 설명해주세요..."
                className="min-h-[120px] bg-background resize-none"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !apiKey}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status || "생성 중..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  모델 생성
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{taskStatusDetail || "요청 중..."}</span>
                  {taskProgress !== null && (
                    <span className="font-semibold text-primary">{taskProgress}%</span>
                  )}
                </div>
                {taskProgress !== null && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(taskProgress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 생성된 에셋 목록 (고정 섹션) */}
        <div className="p-4 border-t overflow-y-auto flex-shrink-0">
          <h3 className="text-sm font-semibold mb-3">생성된 에셋</h3>
          {generatedModels.length > 0 ? (
            <div className="space-y-2">
              {generatedModels.map((model, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="aspect-video bg-muted overflow-hidden relative">
                    {model.modelUrl && !model.isLoading ? (
                      <div className="w-full h-full">
                        <ModelViewer
                          src={model.modelUrl}
                          alt="3D 모델"
                          className="w-full h-full"
                        />
                      </div>
                    ) : model.previewImageUrl && !model.isLoading ? (
                      <img
                        src={model.previewImageUrl}
                        alt="미리보기"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                        {model.progress !== undefined && model.progress !== null && (
                          <>
                            <div className="w-full bg-background/50 rounded-full h-1.5 mb-1">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(model.progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {model.progress}%
                            </span>
                          </>
                        )}
                        {(!model.progress && model.progress !== 0) && (
                          <span className="text-xs text-muted-foreground">
                            {model.status === "queued" ? "대기 중..." : "생성 중..."}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {model.prompt || "생성 중..."}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleDownload(model)}
                        disabled={!model.modelUrl || model.isLoading}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleAddToScene(model)}
                        disabled={!model.modelUrl || model.isLoading}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        씬 추가
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>생성된 모델이 없습니다</p>
            </div>
          )}
        </div>

        {/* 파일 업로드 섹션 - 스크롤 뷰 */}
        <div className="flex-1 min-h-0 flex flex-col border-t">
          <div className="overflow-y-auto p-4 space-y-4">
            {/* 파일 업로드 영역 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                파일 업로드
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingFile
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,.glb,.obj,.fbx,.stl"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="text-primary hover:underline">클릭하여 업로드</span>
                    <span className="text-muted-foreground"> 또는 드래그 앤 드롭</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP (≤5MB) 또는 GLB, OBJ, FBX, STL (≤100MB)
                  </p>
                </label>
              </div>
            </div>

            {/* 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  업로드된 파일 ({uploadedFiles.length})
                </label>
                <div className="space-y-2">
                  {uploadedFiles.map((uploadedFile) => (
                    <Card
                      key={uploadedFile.id}
                      className={`relative overflow-hidden ${uploadedFile.type === "model" ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      draggable={uploadedFile.type === "model"}
                      onDragStart={(e) => handleDragStart(e, {
                        file: uploadedFile.file,
                        previewUrl: uploadedFile.previewUrl,
                        name: uploadedFile.file.name,
                      })}
                    >
                      {/* 썸네일 영역 - 전체 너비 */}
                      <div className="w-full aspect-square bg-muted overflow-hidden relative">
                        {uploadedFile.previewUrl ? (
                          <img
                            src={uploadedFile.previewUrl}
                            alt={uploadedFile.file.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'auto' }}
                            loading="lazy"
                          />
                        ) : uploadedFile.type === "model" ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <div className="text-center">
                              <div className="text-3xl mb-1">📦</div>
                              <p className="text-[10px] text-muted-foreground font-medium">3D</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {/* 상태 뱃지 */}
                        {(uploadedFile as any).isPending ? (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded flex items-center gap-1 shadow-sm uppercase animate-pulse">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Pending...
                          </div>
                        ) : (uploadedFile as any).isRegistered && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500/90 text-white text-[9px] font-bold rounded flex items-center gap-1 shadow-sm uppercase">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Registered
                          </div>
                        )}
                      </div>

                      {/* 파일 정보 영역 */}
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-medium truncate leading-tight">{uploadedFile.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      {/* 삭제 버튼 - 우상단 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 p-0 bg-background/80 hover:bg-background backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileRemove(uploadedFile.id, uploadedFile.previewUrl);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 가운데: 3D 편집 뷰포트 */}
      <div
        className={`flex-1 bg-white relative overflow-hidden transition-all duration-200 ${isDraggingOver ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(true);
        }}
      >
        {/* 드래그 오버 시 시각적 피드백 */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-primary font-semibold">여기에 드롭하세요</p>
            </div>
          </div>
        )}

        {/* 3D 뷰포트 컨텐츠 */}
        {sceneModels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full opacity-40">
                  <defs>
                    <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#888888', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#aaaaaa', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="none" stroke="url(#cubeGradient)" strokeWidth="2" />
                  <line x1="50" y1="20" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2" />
                  <line x1="20" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2" />
                  <line x1="80" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2" />
                  <circle cx="50" cy="50" r="4" fill="#888888" className="animate-pulse" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">3D 편집 뷰포트</p>
              <p className="text-gray-400 text-xs mt-1">에셋을 드래그하여 씬에 추가하세요</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0" style={{ pointerEvents: isDraggingOver ? 'none' : 'auto' }}>
            <Unified3DScene
              models={sceneModels
                .filter(m => m.modelUrl && m.visible)
                .map(m => ({
                  id: m.id,
                  modelUrl: m.modelUrl!,
                  name: m.name,
                  position: m.position,
                  rotation: m.rotation,
                  scale: m.scale,
                  locked: m.locked,
                }))}
              selectedModelId={selectedModelId}
              transformMode={getSceneTransformMode()}
              onModelClick={handleModelClick}
              onModelDrag={handleModelPositionUpdate}
              onModelRotate={handleModelRotationUpdate}
              onModelScale={handleModelScaleUpdate}
              webcamEnabled={webcamEnabled}
              transferMode={transferMode}
              onTransferStateChange={(state) => {
                // transferMode에 따라 적절한 로그만 출력
                if (state === 'sending' && transferMode === 'send') {
                  // 전송 모드일 때만 전송 로그 출력
                  // toast는 handleSendGLB에서 이미 출력하므로 여기서는 생략
                } else if (state === 'receiving' && transferMode === 'receive') {
                  // 수신 모드일 때만 수신 로그 출력
                  // toast는 handleReceiveGLB에서 이미 출력하므로 여기서는 생략
                }
              }}
            />
            {/* 선택된 모델 삭제 버튼 */}
            {selectedModelId && (
              <div className="absolute top-4 right-4 z-20">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleModelDelete(selectedModelId)}
                >
                  <X className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽 패널: 씬 관리 및 에셋 조합 */}
      <div className="w-80 border-l bg-sidebar flex flex-col">
        {/* 디오라마 헤더 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Input
              value={dioramaName}
              onChange={(e) => setDioramaName(e.target.value)}
              className="h-8 text-sm font-semibold"
              placeholder="디오라마 이름"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleSaveDiorama}>
              <Save className="h-3 w-3 mr-1" />
              저장
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleExportDiorama}>
              <FileDown className="h-3 w-3 mr-1" />
              내보내기
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleOpenLoadProjectDialog}>
                  <Upload className="h-3 w-3 mr-1" />
                  불러오기
              </Button>
          </div>
        </div>

        {/* 씬 모델 목록 */}
        <div className="flex-1 overflow-y-auto">
          {/* 부품 파츠 섹션 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">부품 파츠 ({objectModels.length})</h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleCreateGroup}
                  disabled={selectedModelIds.length < 2}
                  title="그룹 만들기"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleDeleteSelectedModels}
                  disabled={selectedModelIds.length === 0}
                  title="선택 삭제"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {objectModels.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>씬에 모델을 추가하세요</p>
                <p className="text-xs mt-1">에셋을 드래그하여 조합하세요</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* 그룹화된 모델들 (OBJECT 타입만) */}
                {modelGroups
                  .filter(group => group.modelIds.some(id => {
                    const model = sceneModels.find(m => m.id === id);
                    return model && (!model.partType || model.partType === 'OBJECT');
                  }))
                  .map((group) => (
                  <div key={group.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer hover:bg-muted"
                      onClick={() => handleToggleGroupExpand(group.id)}
                    >
                      {group.expanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <Layers className="h-3 w-3 text-primary" />
                      <Input
                        value={group.name}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRenameGroup(group.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 text-xs bg-transparent border-none p-0 focus-visible:ring-0"
                      />
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                          {group.modelIds.filter(id => {
                            const model = sceneModels.find(m => m.id === id);
                            return model && (!model.partType || model.partType === 'OBJECT');
                          }).length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUngroupModels(group.id);
                        }}
                        title="그룹 해제"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {group.expanded && (
                      <div className="pl-4">
                        {sceneModels
                            .filter((m) => m.groupId === group.id && (!m.partType || m.partType === 'OBJECT'))
                          .map((model) => (
                            <ModelListItem
                              key={model.id}
                              model={model}
                              isSelected={selectedModelIds.includes(model.id)}
                              onSelect={(multi) => handleModelSelect(model.id, multi)}
                              onDelete={() => handleModelDelete(model.id)}
                              onDuplicate={() => handleDuplicateModel(model.id)}
                              onToggleVisibility={() => handleToggleVisibility(model.id)}
                              onToggleLock={() => handleToggleLock(model.id)}
                              onRename={(name) => handleRenameModel(model.id, name)}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 그룹화되지 않은 부품 파츠 모델들 */}
                {objectModels.map((model) => (
                  <ModelListItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModelIds.includes(model.id)}
                    onSelect={(multi) => handleModelSelect(model.id, multi)}
                    onDelete={() => handleModelDelete(model.id)}
                    onDuplicate={() => handleDuplicateModel(model.id)}
                    onToggleVisibility={() => handleToggleVisibility(model.id)}
                    onToggleLock={() => handleToggleLock(model.id)}
                    onRename={(name) => handleRenameModel(model.id, name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 배경 파츠 섹션 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">배경 파츠 ({backgroundModels.length})</h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleCreateGroup}
                  disabled={selectedModelIds.length < 2}
                  title="그룹 만들기"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleDeleteSelectedModels}
                  disabled={selectedModelIds.length === 0}
                  title="선택 삭제"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {backgroundModels.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>씬에 모델을 추가하세요</p>
                <p className="text-xs mt-1">에셋을 드래그하여 조합하세요</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* 그룹화된 모델들 (BACKGROUND 타입만) */}
                {modelGroups
                  .filter(group => group.modelIds.some(id => {
                    const model = sceneModels.find(m => m.id === id);
                    return model && model.partType === 'BACKGROUND';
                  }))
                  .map((group) => (
                    <div key={group.id} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => handleToggleGroupExpand(group.id)}
                      >
                        {group.expanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <Layers className="h-3 w-3 text-primary" />
                        <Input
                          value={group.name}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRenameGroup(group.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 text-xs bg-transparent border-none p-0 focus-visible:ring-0"
                        />
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {group.modelIds.filter(id => {
                            const model = sceneModels.find(m => m.id === id);
                            return model && model.partType === 'BACKGROUND';
                          }).length}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUngroupModels(group.id);
                          }}
                          title="그룹 해제"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {group.expanded && (
                        <div className="pl-4">
                          {sceneModels
                            .filter((m) => m.groupId === group.id && m.partType === 'BACKGROUND')
                            .map((model) => (
                              <ModelListItem
                                key={model.id}
                                model={model}
                                isSelected={selectedModelIds.includes(model.id)}
                                onSelect={(multi) => handleModelSelect(model.id, multi)}
                                onDelete={() => handleModelDelete(model.id)}
                                onDuplicate={() => handleDuplicateModel(model.id)}
                                onToggleVisibility={() => handleToggleVisibility(model.id)}
                                onToggleLock={() => handleToggleLock(model.id)}
                                onRename={(name) => handleRenameModel(model.id, name)}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  ))}

                {/* 그룹화되지 않은 배경 파츠 모델들 */}
                {backgroundModels.map((model) => (
                  <ModelListItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModelIds.includes(model.id)}
                    onSelect={(multi) => handleModelSelect(model.id, multi)}
                    onDelete={() => handleModelDelete(model.id)}
                    onDuplicate={() => handleDuplicateModel(model.id)}
                    onToggleVisibility={() => handleToggleVisibility(model.id)}
                    onToggleLock={() => handleToggleLock(model.id)}
                    onRename={(name) => handleRenameModel(model.id, name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 선택된 모델 변환 컨트롤 */}
          {selectedModel && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold mb-3">변환 (Transform)</h3>

              {/* 변환 모드 선택 */}
              <div className="space-y-2 mb-4">
                {/* Webcam Toggle */}
                <Button
                  size="sm"
                  variant={webcamEnabled ? "default" : "outline"}
                  className="w-full h-8"
                  onClick={() => {
                    setWebcamEnabled(!webcamEnabled);
                    toast.info(webcamEnabled ? '모션 제어 비활성화' : '모션 제어 활성화 - 손 제스처로 객체를 조작할 수 있습니다');
                  }}
                >
                  <Camera className={`h-4 w-4 mr-2 ${webcamEnabled ? 'text-white' : ''}`} />
                  {webcamEnabled ? '모션 제어 ON' : '모션 제어 OFF'}
                </Button>

                {/* Transfer Mode Toggle (전송/수신 모드 전환) */}
                {webcamEnabled && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={transferMode === "send" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTransferMode("send");
                        toast.info("전송 모드: 손바닥 → 그랩 2초로 GLB 파일을 서버로 전송합니다");
                      }}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      전송
                    </Button>
                    <Button
                      size="sm"
                      variant={transferMode === "receive" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTransferMode("receive");
                        toast.info("수신 모드: 주먹 → 손바닥 펼침 2초로 서버에서 GLB 파일을 수신합니다");
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      수신
                    </Button>
                  </div>
                )}

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={transformMode === "position" ? "default" : "outline"}
                    className="flex-1 h-7"
                    onClick={() => setTransformMode("position")}
                  >
                    <Move className="h-3 w-3 mr-1" />
                    위치
                  </Button>
                  <Button
                    size="sm"
                    variant={transformMode === "rotation" ? "default" : "outline"}
                    className="flex-1 h-7"
                    onClick={() => setTransformMode("rotation")}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    회전
                  </Button>
                  <Button
                    size="sm"
                    variant={transformMode === "scale" ? "default" : "outline"}
                    className="flex-1 h-7"
                    onClick={() => setTransformMode("scale")}
                  >
                    <Maximize2 className="h-3 w-3 mr-1" />
                    크기
                  </Button>
                </div>
              </div>

              {/* 위치 컨트롤 */}
              {transformMode === "position" && (
                <div className="space-y-3">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <div key={axis} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium uppercase">{axis}</label>
                        <span className="text-xs text-muted-foreground">
                          {selectedModel.position[axis].toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedModel.position[axis]]}
                        min={-10}
                        max={10}
                        step={0.1}
                        onValueChange={([value]) =>
                          handleTransformUpdate(selectedModel.id, "position", axis, value)
                        }
                        disabled={selectedModel.locked}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 회전 컨트롤 */}
              {transformMode === "rotation" && (
                <div className="space-y-3">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <div key={axis} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium uppercase">{axis}</label>
                        <span className="text-xs text-muted-foreground">
                          {((selectedModel.rotation[axis] * 180) / Math.PI).toFixed(0)}°
                        </span>
                      </div>
                      <Slider
                        value={[selectedModel.rotation[axis]]}
                        min={-Math.PI}
                        max={Math.PI}
                        step={0.01}
                        onValueChange={([value]) =>
                          handleTransformUpdate(selectedModel.id, "rotation", axis, value)
                        }
                        disabled={selectedModel.locked}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 크기 컨트롤 */}
              {transformMode === "scale" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">균일 크기</label>
                    <span className="text-xs text-muted-foreground">
                      {(selectedModel.scale * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[selectedModel.scale]}
                    min={0.1}
                    max={5}
                    step={0.1}
                    onValueChange={([value]) =>
                      handleTransformUpdate(selectedModel.id, "scale", "uniform", value)
                    }
                    disabled={selectedModel.locked}
                  />
                </div>
              )}
            </div>
          )}

          {/* 파츠 추천 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">파츠 추천</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setIsSearchDialogOpen(true)}
              >
                <Grid3x3 className="h-3 w-3" />
              </Button>
            </div>
            {isLoadingLibrary && libraryParts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-3">
                  {libraryParts
                    .slice((partsSectionPage - 1) * partsPerPage, partsSectionPage * partsPerPage)
                    .map((part) => {
                      const imageUrl = part.thumbnailUrl || `https://via.placeholder.com/400x300/1a1a1a/ffffff?text=${encodeURIComponent(part.name)}`;

                return (
                  <div
                          key={part.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, {
                            partId: part.id,
                            partType: part.type,
                            modelUrl: part.modelFileUrl,
                            name: part.name,
                            thumbnail: part.thumbnailUrl,
                            category: part.category,
                    })}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TravelCard
                      imageUrl={imageUrl}
                            imageAlt={part.name}
                            title={part.name}
                            location={part.category || "3D Model"}
                            overview={part.description || `A 3D ${part.name} model. Drag and drop into the scene to add it.`}
                      onBookNow={() => {
                              if (part.modelFileUrl) {
                          const offset = sceneModels.length * 0.5;
                          const newModel: SceneModel = {
                                  id: `part-${part.id}-${Date.now()}`,
                                  partId: part.id,
                                  partType: part.type,
                                  modelUrl: part.modelFileUrl,
                                  name: part.name,
                            position: { x: offset, y: 0, z: offset },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: 1,
                            visible: true,
                            locked: false,
                          };
                          setSceneModels((prev) => [...prev, newModel]);
                          setSelectedModelIds([newModel.id]);
                                toast.success(`${part.name}이(가) 씬에 추가되었습니다.`);
                        }
                      }}
                      className="h-[200px]"
                    />
                  </div>
                );
              })}
            </div>
                {libraryParts.length > partsPerPage && (() => {
                  const totalPages = Math.ceil(libraryParts.length / partsPerPage);
                  return (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPartsSectionPage(prev => Math.max(1, prev - 1))}
                        disabled={partsSectionPage === 1}
                        className="rounded-xl px-3"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[60px] text-center">
                        {partsSectionPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPartsSectionPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={partsSectionPage >= totalPages}
                        className="rounded-xl px-3"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent
          className="max-w-[1200px] sm:max-w-[1200px] w-[95vw] max-h-[90vh] overflow-hidden p-0 border-0 shadow-2xl bg-white rounded-2xl"
        >
          <div
            className="flex flex-col h-[90vh] space-y-0"
          >
            {/* 헤더 섹션 */}
            <div className="p-6 border-b space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">부품 라이브러리</h2>
                  <p className="text-sm text-muted-foreground mt-1">프로젝트에 사용할 3D 부품을 검색하고 추가하세요.</p>
                </div>
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                  {filteredAndSortedParts.length} 개의 부품
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="부품 이름 또는 카테고리 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 text-base rounded-xl border-muted-foreground/20 focus:border-primary shadow-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(value: 'latest' | 'name') => setSortBy(value)}
                  >
                    <SelectTrigger className="w-[140px] h-11 rounded-xl">
                      <SelectValue placeholder="정렬 방식" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">최신순</SelectItem>
                      <SelectItem value="name">이름순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 부품 목록 그리드 섹션 */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {isLoadingLibrary ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground animate-pulse">부품을 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedParts.map((part) => {
                      const imageUrl = part.thumbnailUrl || `https://via.placeholder.com/400x300/1a1a1a/ffffff?text=${encodeURIComponent(part.name)}`;

                      return (
                        <div
                          key={part.id}
                          className="group relative"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, {
                            partId: part.id,
                            partType: part.type,
                            modelUrl: part.modelFileUrl, // fetchLibraryParts에서 이미 정문화됨
                            name: part.name,
                            thumbnail: part.thumbnailUrl,
                            category: part.category,
                          })}
                        >
                          <TravelCard
                            imageUrl={imageUrl}
                            imageAlt={part.name}
                            title={part.name}
                            location={part.category || "3D Model"}
                            overview={part.description || `A 3D ${part.name} model.`}
                            onBookNow={() => {
                              const modelUrl = part.modelFileUrl;
                              if (modelUrl) {
                                const offset = sceneModels.length * 0.5;
                                const newModel: SceneModel = {
                                  id: `library-${part.id}-${Date.now()}`,
                                  partId: part.id,
                                  partType: part.type,
                                  modelUrl: modelUrl,
                                  name: part.name,
                                  position: { x: offset, y: 0, z: offset },
                                  rotation: { x: 0, y: 0, z: 0 },
                                  scale: 1,
                                  visible: true,
                                  locked: false,
                                };
                                setSceneModels((prev) => [...prev, newModel]);
                                setSelectedModelIds([newModel.id]);
                                toast.success(`${part.name}이(가) 씬에 추가되었습니다.`);
                                // 다이얼로그 닫지 않음 (여러 개 추가 가능하도록)
                              } else {
                                toast.error("모델 파일 경로를 찾을 수 없습니다.");
                                console.error("Part model url is missing:", part);
                              }
                            }}
                            className="h-[280px] transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl"
                          />
                          {/* Hover 시 나타나는 뱃지 */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Badge className="bg-primary/90 text-[10px] font-bold">
                              {part.type}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredAndSortedParts.length === 0 && !isLoadingLibrary && (
                    <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-white/50">
                      <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <h3 className="text-lg font-medium text-muted-foreground">검색 결과가 없습니다</h3>
                      <p className="text-sm text-muted-foreground mt-1">다른 검색어를 입력해 보세요.</p>
                    </div>
                  )}

                  {/* 페이지네이션 컨트롤 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8 pb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="rounded-xl px-4"
                      >
                        이전
                      </Button>
                      <span className="text-sm font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="rounded-xl px-4"
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 하단 링크 */}
            <div className="flex gap-4 pt-4 border-t text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Contact support</a>
              <a href="#" className="hover:text-foreground transition-colors">Share feedback</a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 파츠 업로드 다이얼로그 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-6 py-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-muted rounded-xl border-2 border-primary/20 overflow-hidden flex items-center justify-center relative shadow-inner">
                {uploadFileData?.previewUrl ? (
                  <img src={uploadFileData.previewUrl} className="w-full h-full object-cover" alt="미리보기" />
                ) : (
                  <div className="text-3xl">📦</div>
                )}
                <div className="absolute bottom-1 right-1 bg-primary text-[8px] text-white px-1 rounded font-bold">3D</div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold leading-none">파츠 정보 입력</h3>
                <p className="text-sm text-muted-foreground">서버에 등록할 파츠의 정보를 입력해주세요.</p>
              </div>
            </div>

            <div className="grid gap-5 text-left">
              <div className="grid gap-2">
                <Label htmlFor="part-name" className="text-xs font-bold uppercase text-muted-foreground">파츠 이름</Label>
                <Input
                  id="part-name"
                  value={uploadFileData?.name || ''}
                  onChange={(e) => setUploadFileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="의자, 나무, 등..."
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="part-type" className="text-xs font-bold uppercase text-muted-foreground">타입</Label>
                  <Select
                    value={uploadFileData?.type}
                    onValueChange={(val: PartType) => setUploadFileData(prev => prev ? { ...prev, type: val } : null)}
                  >
                    <SelectTrigger id="part-type" className="h-10 text-sm">
                      <SelectValue placeholder="타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OBJECT">객체 (Object)</SelectItem>
                      <SelectItem value="BACKGROUND">배경 (Background)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="part-category" className="text-xs font-bold uppercase text-muted-foreground">카테고리</Label>
                  <Select
                    value={uploadFileData?.category}
                    onValueChange={(val: PartCategory) => setUploadFileData(prev => prev ? { ...prev, category: val } : null)}
                  >
                    <SelectTrigger id="part-category" className="h-10 text-sm">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="FURNITURE_HOME">가구</SelectItem>
                      <SelectItem value="ARCHITECTURE">건축</SelectItem>
                      <SelectItem value="NATURE_PLANTS">자연/식물</SelectItem>
                      <SelectItem value="CHARACTERS_CREATURES">캐릭터</SelectItem>
                      <SelectItem value="CARS_VEHICLES">차량</SelectItem>
                      <SelectItem value="ELECTRONICS_GADGETS">전자제품</SelectItem>
                      <SelectItem value="FOOD_DRINK">음식</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                disabled={isUploadingPart}
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setUploadFileData(null);
                  setUploadProgress(0);
                }}
              >
                취소
              </Button>
              <Button
                className="flex-1 h-11"
                disabled={isUploadingPart || !uploadFileData?.name}
                onClick={handleConfirmUpload}
              >
                {isUploadingPart ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    등록 완료
                  </>
                )}
              </Button>
            </div>

            {/* 업로드 프로그레스 바 */}
            {isUploadingPart && (
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>
                    {uploadProgress < 100
                      ? "Uploading to server"
                      : "Finalizing & Processing on server..."}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress
                  value={uploadProgress}
                  className={`h-1.5 ${uploadProgress === 100 ? "animate-pulse" : ""}`}
                />
                {uploadProgress === 100 && (
                  <p className="text-[9px] text-muted-foreground animate-pulse">
                    The server is registering your asset. This may take a moment.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 프로젝트 불러오기 다이얼로그 */}
      <Dialog open={isLoadProjectDialogOpen} onOpenChange={setIsLoadProjectDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">내 프로젝트 불러오기</h2>
            <p className="text-sm text-muted-foreground mt-1">
              저장된 프로젝트를 선택하여 불러오세요
            </p>
          </div>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : myProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold">저장된 프로젝트가 없습니다</p>
                <p className="text-sm mt-2">프로젝트를 저장하면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                    onClick={() => handleLoadProject(project.id)}
                  >
                    <div className="p-4 flex flex-col h-full">
                      {project.previewImageUrl && (
                        <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                          <img
                            src={project.previewImageUrl}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{project.title}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-shrink-0">
                            {project.description}
                          </p>
                        )}
                        <div className="mt-auto">
                          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1.5">
                              <Layers className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">{project.components.length} 개</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">{project.viewsCount}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span>❤️</span>
                              <span className="whitespace-nowrap">{project.likesCount}</span>
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {new Date(project.updatedAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsLoadProjectDialogOpen(false)}
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 모델 리스트 아이템 컴포넌트
function ModelListItem({
  model,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onToggleLock,
  onRename,
}: {
  model: SceneModel;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(model.name);

  const handleRename = () => {
    if (editName.trim() && editName !== model.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-1 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? "bg-primary/20 border border-primary/50" : "hover:bg-muted"
        } ${!model.visible ? "opacity-50" : ""}`}
      onClick={(e) => onSelect(e.shiftKey || e.ctrlKey || e.metaKey)}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 cursor-grab" />

      <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
        <div className="text-[10px]">📦</div>
      </div>

      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setEditName(model.name);
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-5 text-xs flex-1 min-w-0"
          autoFocus
        />
      ) : (
        <span
          className="text-xs truncate flex-1 min-w-0"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {model.name}
        </span>
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          title={model.visible ? "숨기기" : "보이기"}
        >
          {model.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          title={model.locked ? "잠금 해제" : "잠금"}
        >
          {model.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="복제"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="삭제"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
