/**
 * Tripo AI API 클라이언트
 * 
 * 사용 방법:
 * 1. 프로필 탭에서 Tripo AI API 키를 설정하세요
 * 2. Prompting 탭에서 프롬프트를 입력하고 생성 버튼을 클릭하세요
 * 
 * API 문서: https://docs.tripo3d.ai (실제 문서 URL로 변경 필요)
 */

export interface TripoAPIResponse {
  code?: number;
  data?: {
    task_id?: string;
    type?: string;
    status?: string;
    input?: any;
    output?: {
      model?: string; // 모델 다운로드 URL (5분 후 만료)
      base_model?: string; // 베이스 모델 다운로드 URL
      pbr_model?: string; // PBR 모델 다운로드 URL
      generated_image?: string; // 생성된 이미지 URL
      rendered_image?: string; // 미리보기 이미지 URL
    };
    progress?: number; // 0-100
    create_time?: number;
  };
  message?: string;
  suggestion?: string;
  task_id?: string; // Legacy support
  model_url?: string; // Legacy support
  status?: string; // Legacy support
  error?: string; // Legacy support
}

export interface TripoAPIError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Tripo AI API로 3D 모델 생성
 * 
 * @param prompt - 3D 모델을 생성할 텍스트 프롬프트
 * @param apiKey - Tripo AI API Secret Key (또는 Client ID:Secret Key 형식)
 * @returns 생성된 모델 정보 또는 에러
 */
export async function generate3DModel(
  prompt: string,
  apiKey: string
): Promise<TripoAPIResponse> {
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. .env 파일에 VITE_TRIPO_API_KEY를 설정해주세요.");
  }

  if (!prompt.trim()) {
    throw new Error("프롬프트를 입력해주세요.");
  }

  // Tripo AI API는 Bearer 토큰을 사용합니다
  // 문서: https://platform.tripo3d.ai/docs/general
  const authHeader = `Bearer ${apiKey}`;

  try {
    // Vite 프록시를 통해 API 호출 (CORS 문제 해결)
    // 프록시 설정: /api/tripo -> https://api.tripo3d.ai
    // 엔드포인트: POST https://api.tripo3d.ai/v2/openapi/task
    const response = await fetch("/api/tripo/v2/openapi/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        type: "text_to_model", // 필수: task type 지정
        prompt: prompt,
        // 선택적 파라미터들 (Tripo AI 문서 참조)
        // model_version: "v2.5-20250123", // 기본값
        // negative_prompt: "...",
        // texture: true,
        // pbr: true,
        // etc.
      }),
    });

    const data: TripoAPIResponse = await response.json();

    // Tripo AI API 응답 구조: { code: 0, data: { task_id: "..." } }
    if (data.code !== 0) {
      throw new Error(
        data.message || 
        data.suggestion || 
        `API 요청 실패: code ${data.code}`
      );
    }

    // 응답을 일관된 형식으로 변환
    return {
      ...data,
      task_id: data.data?.task_id || data.task_id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("알 수 없는 오류가 발생했습니다.");
  }
}

/**
 * 생성 작업 상태 확인
 * 
 * @param taskId - 작업 ID
 * @param apiKey - Tripo AI API 키
 * @returns 작업 상태 정보
 */
export async function checkTaskStatus(
  taskId: string,
  apiKey: string
): Promise<TripoAPIResponse> {
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  // Tripo AI API는 Bearer 토큰을 사용합니다
  const authHeader = `Bearer ${apiKey}`;

  try {
    // Vite 프록시를 통해 API 호출
    // Task 상태 확인 엔드포인트 (문서 확인 필요)
    const response = await fetch(`/api/tripo/v2/openapi/task/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    const data: TripoAPIResponse = await response.json();

    // 디버깅: 응답 데이터 로그 출력
    console.log('[Tripo API] Task Status Response:', {
      taskId,
      code: data.code,
      status: data.data?.status,
      progress: data.data?.progress,
      hasModel: !!data.data?.output?.model,
      hasBaseModel: !!data.data?.output?.base_model,
      hasPbrModel: !!data.data?.output?.pbr_model,
      hasRenderedImage: !!data.data?.output?.rendered_image,
      fullResponse: data,
    });

    // Tripo AI API 응답 구조 확인
    if (data.code !== 0) {
      throw new Error(
        data.message || 
        data.suggestion || 
        `상태 확인 실패: code ${data.code}`
      );
    }

    // 모델 URL 우선순위: model > pbr_model > base_model
    const modelUrl = 
      data.data?.output?.model || 
      data.data?.output?.pbr_model || 
      data.data?.output?.base_model || 
      data.model_url;

    // 응답을 일관된 형식으로 변환
    const result: TripoAPIResponse = {
      ...data,
      task_id: data.data?.task_id || data.task_id,
      status: data.data?.status || data.status,
      model_url: modelUrl, // output에서 모델 URL 가져오기 (우선순위: model > pbr_model > base_model)
      data: data.data, // 전체 data 객체 보존 (progress 등 포함)
    };
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("상태 확인 중 오류가 발생했습니다.");
  }
}

/**
 * 생성된 모델 다운로드 URL 가져오기
 * 
 * 참고: Tripo AI API에서는 모델 다운로드 URL이 Task 상태 확인 응답의 output.model 필드에 포함됩니다.
 * 별도의 다운로드 엔드포인트는 없습니다.
 * 
 * @param taskId - Task ID (모델 ID가 아님)
 * @param apiKey - Tripo AI API 키
 * @returns 다운로드 URL
 */
export async function getModelDownloadUrl(
  taskId: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  // Task 상태 확인을 통해 모델 URL 가져오기
  const taskStatus = await checkTaskStatus(taskId, apiKey);
  
  if (taskStatus.model_url) {
    return taskStatus.model_url;
  }

  throw new Error("모델 다운로드 URL을 찾을 수 없습니다. Task가 아직 완료되지 않았을 수 있습니다.");
}
