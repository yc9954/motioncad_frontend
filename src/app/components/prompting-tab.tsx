import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Loader2, Sparkles, CheckCircle2, XCircle, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { generate3DModel, checkTaskStatus, getModelDownloadUrl } from "@/lib/tripo-api";
import { ModelViewer } from "@/app/components/model-viewer";

export function PromptingTab() {
  // 환경 변수에서 API 키 가져오기
  const apiKey = import.meta.env.VITE_TRIPO_API_KEY;
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<{
    taskId?: string;
    modelUrl?: string;
    downloadUrl?: string;
    previewImageUrl?: string; // rendered_image URL
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [taskProgress, setTaskProgress] = useState<number | null>(null);
  const [taskStatusDetail, setTaskStatusDetail] = useState<string>("");

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
    setGeneratedModel(null);
    setStatus("생성 요청 중...");

    try {
      // Tripo AI API로 3D 모델 생성 요청
      const result = await generate3DModel(prompt, apiKey);
      
      setStatus("생성 중...");
      toast.success("생성 요청이 성공적으로 전송되었습니다!");

      // 작업 ID가 있으면 상태 확인
      if (result.task_id) {
        setGeneratedModel({
          taskId: result.task_id,
          modelUrl: result.model_url,
        });

        // 폴링으로 작업 상태 확인 (선택사항)
        // 실제 구현에서는 WebSocket이나 Server-Sent Events를 사용할 수 있습니다
        checkTaskStatusPolling(result.task_id, apiKey);
      } else if (result.model_url) {
        // 즉시 모델 URL이 반환된 경우
        setGeneratedModel({
          modelUrl: result.model_url,
        });
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
        
        setTaskStatusDetail(statusText);
        
        // 진행률 업데이트 (null이 아니면 표시)
        if (progress !== null && progress !== undefined) {
          setTaskProgress(progress);
        } else if (result.status === "queued") {
          setTaskProgress(0);
        } else if (result.status === "running") {
          // running 상태인데 progress가 없으면 이전 값 유지하거나 50%로 설정
          setTaskProgress((prev) => prev ?? 50);
        }
        
        // 상태 텍스트 업데이트
        if (progress !== null && progress !== undefined) {
          setStatus(`${statusText}... ${progress}%`);
        } else {
          setStatus(`${statusText}...`);
        }
        
        // Tripo AI API 상태: success, failed, banned, expired, cancelled, unknown
        // ongoing 상태: queued, running
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
          setGeneratedModel((prev) => ({
            ...prev,
            modelUrl: modelUrl || prev?.modelUrl,
            downloadUrl: modelUrl || prev?.downloadUrl,
            previewImageUrl: previewImageUrl || prev?.previewImageUrl,
          }));
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
          setIsGenerating(false);
          if (pollInterval) {
            clearTimeout(pollInterval);
          }
          throw new Error(result.error || `모델 생성에 실패했습니다. 상태: ${statusText}`);
        }

        // queued 또는 running 상태면 계속 폴링
        if (result.status === "queued" || result.status === "running") {
          // 미리보기 이미지가 있으면 업데이트 (rendered_image)
          const previewImageUrl = result.data?.output?.rendered_image;
          if (previewImageUrl) {
            setGeneratedModel((prev) => ({
              ...prev,
              previewImageUrl,
            }));
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            pollInterval = setTimeout(poll, 5000); // 5초 후 다시 확인
          } else {
            setIsGenerating(false);
            if (pollInterval) {
              clearTimeout(pollInterval);
            }
            throw new Error("생성 시간이 초과되었습니다. (30분) Task ID를 확인하여 나중에 다시 확인해주세요.");
          }
        } else {
          // unknown 상태 등 예상치 못한 상태
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

  const handleDownload = async () => {
    if (!generatedModel?.modelUrl && !generatedModel?.taskId) {
      toast.error("다운로드할 모델이 없습니다.");
      return;
    }

    try {
      let downloadUrl = generatedModel.downloadUrl || generatedModel.modelUrl;
      
      // 다운로드 URL이 없으면 Task 상태를 다시 확인하여 가져오기
      if (!downloadUrl && generatedModel.taskId && apiKey) {
        const taskStatus = await checkTaskStatus(generatedModel.taskId, apiKey);
        
        // 모델 URL 우선순위: model > pbr_model > base_model
        downloadUrl = 
          taskStatus.model_url || 
          taskStatus.data?.output?.model || 
          taskStatus.data?.output?.pbr_model || 
          taskStatus.data?.output?.base_model;
        
        if (downloadUrl) {
          setGeneratedModel((prev) => ({
            ...prev,
            modelUrl: downloadUrl,
            downloadUrl,
          }));
        }
      }

      if (downloadUrl) {
        // 새 창에서 다운로드 URL 열기
        window.open(downloadUrl, "_blank");
        toast.success("다운로드가 시작되었습니다.");
      } else {
        toast.error("다운로드 URL을 찾을 수 없습니다. Task가 완료되지 않았거나 모델이 생성되지 않았을 수 있습니다.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.";
      toast.error(errorMessage);
      console.error("Download error:", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">AI 3D Model Generation</h1>
        <p className="text-muted-foreground">
          텍스트 프롬프트를 입력하여 Tripo AI로 3D 모델을 생성하세요.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              프롬프트 입력
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: A futuristic city with flying cars and neon lights, cyberpunk style, highly detailed"
              className="min-h-[200px] bg-background"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-2">
              원하는 3D 모델을 자세히 설명해주세요. 더 구체적인 설명일수록 더 나은 결과를 얻을 수 있습니다.
            </p>
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
                Generate 3D Model
              </>
            )}
          </Button>
          
          {isGenerating && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {taskStatusDetail || "요청 중..."}
                </span>
                {taskProgress !== null && taskProgress !== undefined && (
                  <span className="font-semibold text-primary">{taskProgress}%</span>
                )}
              </div>
              {taskProgress !== null && taskProgress !== undefined ? (
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(taskProgress, 100)}%` }}
                  >
                    {taskProgress > 10 && (
                      <span className="text-xs text-primary-foreground font-medium">
                        {taskProgress}%
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="bg-primary h-3 rounded-full animate-pulse" style={{ width: "50%" }} />
                </div>
              )}
              {taskStatusDetail && (
                <p className="text-xs text-muted-foreground">
                  {taskStatusDetail === "대기 중" && "작업이 큐에 추가되었습니다. 곧 시작됩니다..."}
                  {taskStatusDetail === "생성 중" && "3D 모델을 생성하고 있습니다. 잠시만 기다려주세요..."}
                  {taskStatusDetail === "생성 완료" && "모델 생성이 완료되었습니다!"}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">오류 발생</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {generatedModel && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">생성 완료</h3>
          </div>
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative border">
              {generatedModel.modelUrl ? (
                <ModelViewer
                  src={generatedModel.modelUrl}
                  alt="3D 모델 미리보기"
                  className="w-full h-full"
                />
              ) : generatedModel.previewImageUrl ? (
                <img
                  src={generatedModel.previewImageUrl}
                  alt="3D 모델 미리보기"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <p className="text-muted-foreground text-center">3D 모델 미리보기</p>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    모델을 로드하는 중...
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Add to Scene
              </Button>
            </div>
            {generatedModel?.taskId && (
              <p className="text-xs text-muted-foreground">
                Task ID: {generatedModel.taskId}
              </p>
            )}
          </div>
        </Card>
      )}

      {!apiKey && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ Tripo AI API 키가 설정되지 않았습니다. .env 파일에 VITE_TRIPO_API_KEY를 설정해주세요.
          </p>
        </Card>
      )}
    </div>
  );
}
