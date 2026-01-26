import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, XCircle, Download, Plus, Image as ImageIcon, Settings, Grid3x3, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { generate3DModel, checkTaskStatus } from "@/lib/tripo-api";
import { ModelViewer } from "@/app/components/model-viewer";
import { Unified3DScene } from "@/app/components/unified-3d-scene";

export function PromptingTab() {
  // 환경 변수에서 API 키 가져오기
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
  const [sceneModels, setSceneModels] = useState<Array<{
    id: string;
    modelUrl?: string;
    name: string;
    position?: { x: number; y: number; z?: number };
    rotation?: { x: number; y: number; z: number };
    scale?: number;
  }>>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [draggingModelId, setDraggingModelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    file: File;
    previewUrl?: string;
    type: "image" | "model";
  }>>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // 추천 에셋 목록 (예시)
  const recommendedAssets = [
    { id: 1, name: "의자", thumbnail: "🪑", category: "가구" },
    { id: 2, name: "테이블", thumbnail: "🪑", category: "가구" },
    { id: 3, name: "램프", thumbnail: "💡", category: "조명" },
    { id: 4, name: "화분", thumbnail: "🪴", category: "장식" },
    { id: 5, name: "책장", thumbnail: "📚", category: "가구" },
    { id: 6, name: "소파", thumbnail: "🛋️", category: "가구" },
  ];

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
    let pollInterval: NodeJS.Timeout | null = null;

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

  const handleAddToScene = (model: { modelUrl?: string; prompt?: string; taskId?: string }) => {
    if (model.modelUrl) {
      const newModel = {
        id: model.taskId || `model-${Date.now()}`,
        modelUrl: model.modelUrl,
        name: model.prompt || "3D 모델",
        position: { x: 0, y: 0, z: 0 },
        scale: 1,
      };
      setSceneModels((prev) => [...prev, newModel]);
      toast.success("씬에 추가되었습니다.");
    } else {
      toast.error("모델을 씬에 추가할 수 없습니다.");
    }
  };

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

  // 파일 업로드 핸들러
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const modelTypes = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];
    const allowedExtensions = [".glb", ".obj", ".fbx", ".stl"];

    Array.from(files).forEach((file) => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      const isImage = imageTypes.includes(file.type) || [".jpg", ".jpeg", ".png", ".webp"].includes(fileExtension);
      const isModel = modelTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

      if (!isImage && !isModel) {
        toast.error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name}: 파일 크기가 100MB를 초과합니다.`);
        return;
      }

      const fileId = `file-${Date.now()}-${Math.random()}`;
      let previewUrl: string | undefined;

      if (isImage) {
        previewUrl = URL.createObjectURL(file);
      }

      setUploadedFiles((prev) => [
        ...prev,
        {
          id: fileId,
          file,
          previewUrl,
          type: isImage ? "image" : "model",
        },
      ]);

      toast.success(`${file.name}이(가) 업로드되었습니다.`);
    });
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
  const handleDragStart = (e: React.DragEvent, asset: { modelUrl?: string; prompt?: string; taskId?: string; name?: string; thumbnail?: string; category?: string; file?: File; previewUrl?: string }) => {
    const dragData = {
      type: asset.modelUrl ? "generated" : asset.file ? "uploaded" : "recommended",
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
    setIsDraggingOver(false);
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData("application/json"));
      
      // 3D 씬 중앙 좌표 (3D 공간 기준)
      const centerX = 0;
      const centerY = 0;
      const centerZ = 0;
      
      if (dragData.type === "generated" && dragData.modelUrl) {
        const newModel = {
          id: dragData.taskId || `model-${Date.now()}`,
          modelUrl: dragData.modelUrl,
          name: dragData.name || dragData.prompt || "3D 모델",
          position: { x: centerX, y: centerY, z: centerZ },
          scale: 1,
        };
        setSceneModels((prev) => [...prev, newModel]);
        toast.success("씬에 추가되었습니다.");
      } else if (dragData.type === "uploaded" && dragData.file) {
        // 업로드된 파일의 경우
        const uploadedFile = uploadedFiles.find(f => f.file.name === dragData.file.name);
        if (uploadedFile) {
          if (uploadedFile.type === "model") {
            // 3D 모델 파일인 경우
            const fileUrl = URL.createObjectURL(uploadedFile.file);
            const newModel = {
              id: uploadedFile.id,
              modelUrl: fileUrl,
              name: uploadedFile.file.name,
              position: { x: centerX, y: centerY, z: centerZ },
              scale: 1,
            };
            setSceneModels((prev) => [...prev, newModel]);
            toast.success("씬에 추가되었습니다.");
          } else {
            // 이미지 파일인 경우
            toast.info("이미지 파일은 3D 모델로 변환 후 씬에 추가할 수 있습니다.");
          }
        }
      } else if (dragData.type === "recommended") {
        // 추천 에셋의 경우 (실제 모델 URL이 없을 수 있음)
        toast.info(`"${dragData.name}" 에셋을 씬에 추가하려면 먼저 생성해주세요.`);
      }
    } catch (err) {
      console.error("드롭 처리 오류:", err);
    }
  };

  // 드래그 오버 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);
  };

  // 드래그 리브 핸들러
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  // 모델 삭제 핸들러
  const handleModelDelete = (modelId: string) => {
    setSceneModels((prev) => {
      const model = prev.find(m => m.id === modelId);
      // Blob URL인 경우 메모리 해제
      if (model?.modelUrl && model.modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(model.modelUrl);
      }
      return prev.filter(m => m.id !== modelId);
    });
    setSelectedModelId(null);
    toast.success("모델이 삭제되었습니다.");
  };

  // 모델 클릭 핸들러
  const handleModelClick = (modelId: string) => {
    setSelectedModelId(modelId);
  };

  // 뷰포트 클릭 핸들러 (배경 클릭 시 선택 해제)
  const handleViewportClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedModelId(null);
    }
  };

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
    setSelectedModelId(modelId);
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
          ? { ...model, position: { x: newX, y: newY } }
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

        {/* 설정 섹션 */}
        <div className="p-4 space-y-4 border-t overflow-y-auto flex-shrink-0">
          {/* 파일 업로드 영역 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              파일 업로드
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                isDraggingFile
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

            {/* 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((uploadedFile) => (
                  <Card 
                    key={uploadedFile.id} 
                    className={`p-2 flex items-center gap-2 ${
                      uploadedFile.type === "model" ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                    draggable={uploadedFile.type === "model"}
                    onDragStart={(e) => handleDragStart(e, {
                      file: uploadedFile.file,
                      previewUrl: uploadedFile.previewUrl,
                      name: uploadedFile.file.name,
                    })}
                  >
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                      {uploadedFile.previewUrl ? (
                        <img
                          src={uploadedFile.previewUrl}
                          alt={uploadedFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : uploadedFile.type === "model" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <div className="text-center">
                            <div className="text-2xl mb-1">📦</div>
                            <p className="text-[8px] text-muted-foreground font-medium">3D</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{uploadedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleFileRemove(uploadedFile.id, uploadedFile.previewUrl)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 생성된 에셋 목록 (왼쪽 패널 하단) */}
        <div className="p-4 border-t overflow-y-auto flex-1">
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
      </div>

      {/* 가운데: 3D 편집 뷰포트 */}
      <div 
        className={`flex-1 bg-[#16171f] relative overflow-hidden transition-all duration-200 ${
          isDraggingOver ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* 드래그 오버 시 시각적 피드백 */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-primary font-semibold">여기에 드롭하세요</p>
            </div>
          </div>
        )}

        {/* Ambient Glow Effects */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* 3D 뷰포트 컨텐츠 */}
        {sceneModels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
                  <defs>
                    <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#0088ff', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="none" stroke="url(#cubeGradient)" strokeWidth="2"/>
                  <line x1="50" y1="20" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                  <line x1="20" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                  <line x1="80" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                  <circle cx="50" cy="50" r="4" fill="#00d4ff" className="animate-pulse"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm">3D 편집 뷰포트</p>
              <p className="text-gray-600 text-xs mt-1">에셋을 드래그하여 씬에 추가하세요</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <Unified3DScene
              models={sceneModels
                .filter(m => m.modelUrl)
                .map(m => ({
                  id: m.id,
                  modelUrl: m.modelUrl!,
                  name: m.name,
                  position: { 
                    x: m.position?.x || 0, 
                    y: m.position?.y || 0, 
                    z: m.position?.z || 0 
                  },
                  rotation: m.rotation || { x: 0, y: 0, z: 0 },
                  scale: m.scale || 1,
                }))}
              selectedModelId={selectedModelId}
              onModelClick={handleModelClick}
              onModelDrag={handleModelPositionUpdate}
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

      {/* 오른쪽 패널: 에셋 결과물 및 라이브러리 */}
      <div className="w-80 border-l bg-sidebar flex flex-col">
        {/* 생성된 에셋 결과물 (한 줄로) */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold mb-3">생성된 에셋</h3>
          {generatedModels.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {generatedModels.map((model, index) => (
                <Card 
                  key={index} 
                  className={`min-w-[120px] flex-shrink-0 ${
                    model.modelUrl && !model.isLoading ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"
                  }`}
                  draggable={!!model.modelUrl && !model.isLoading}
                  onDragStart={(e) => handleDragStart(e, model)}
                >
                  <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                    {/* 모델이 완료되고 URL이 있을 때만 뷰어 표시 */}
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
                      /* 로딩 중일 때 로딩 인디케이터와 진행률 표시 */
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-2">
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
                  <div className="p-2 space-y-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {model.prompt || "생성 중..."}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 flex-1"
                        onClick={() => handleDownload(model)}
                        disabled={!model.modelUrl || model.isLoading}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 flex-1"
                        onClick={() => handleAddToScene(model)}
                        disabled={!model.modelUrl || model.isLoading}
                      >
                        <Plus className="h-3 w-3" />
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

        {/* 라이브러리 및 추천 에셋 (2열 그리드) */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">추천 에셋</h3>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Grid3x3 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recommendedAssets.map((asset) => (
              <Card
                key={asset.id}
                className="p-3 cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2 text-3xl">
                  {asset.thumbnail}
                </div>
                <p className="text-xs font-medium truncate">{asset.name}</p>
                <p className="text-xs text-muted-foreground truncate">{asset.category}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
