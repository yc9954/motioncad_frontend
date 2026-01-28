// Backend API Client
// Base URL from OpenAPI spec
// 개발 환경에서는 Vite 프록시를 사용하여 CORS 문제 해결
export const API_BASE_URL = import.meta.env.DEV
  ? '' // 개발 환경: Vite 프록시 사용 (/api로 시작)
  : (import.meta.env.VITE_API_BASE_URL || 'https://f76640308ac2.ngrok-free.app');

export const getOAuth2Url = (provider: string) => {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
};

// Types
export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
}

export interface UserUpdateRequest {
  nickname?: string;
  region?: string;
  job?: string;
  userDescription?: string;
}

export interface UserSettings {
  handSensitivity?: number;
  cameraResolution?: string;
  uiTheme?: string;
  leftHanded?: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  totalProjects?: number;
  totalLikes?: number;
  totalViews?: number;
  region?: string;
  job?: string;
  userDescription?: string;
  userSettings?: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentRequest {
  partId: number;
  posX?: number;
  posY?: number;
  posZ?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

export interface ComponentResponse {
  id: number;
  partId: number;
  partName: string;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface ProjectRequest {
  title: string;
  description?: string;
  backgroundPartId?: number;
  isPublic?: boolean;
  previewImageUrl?: string;
  components?: ComponentRequest[];
}

export interface ProjectResponse {
  id: number;
  title: string;
  description?: string;
  nickname?: string;
  backgroundPartId?: number;
  backgroundPartName?: string;
  isPublic: boolean;
  previewImageUrl?: string;
  likesCount: number;
  viewsCount: number;
  commentCount: number;
  components: ComponentResponse[];
  createdAt: string;
  updatedAt: string;
}

export type PartType = 'BACKGROUND' | 'OBJECT';

export type PartCategory =
  | 'ANIMALS_PETS'
  | 'ARCHITECTURE'
  | 'ART_ABSTRACT'
  | 'CARS_VEHICLES'
  | 'CHARACTERS_CREATURES'
  | 'CULTURAL_HERITAGE_HISTORY'
  | 'ELECTRONICS_GADGETS'
  | 'FASHION_STYLE'
  | 'FOOD_DRINK'
  | 'FURNITURE_HOME'
  | 'MUSIC'
  | 'NATURE_PLANTS'
  | 'NEWS_POLITICS'
  | 'PEOPLE'
  | 'PLACES_TRAVEL'
  | 'SCIENCE_TECHNOLOGY'
  | 'SPORTS_FITNESS'
  | 'WEAPONS_MILITARY';

export interface PartResponse {
  id: number;
  name: string;
  type: PartType;
  description?: string;
  category?: PartCategory;
  thumbnailUrl?: string;
  modelFileUrl?: string;
  isPublic: boolean;
  isAiGenerated: boolean;
  creatorNickname?: string;
  likesCount: number;
  viewsCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Helper function to set auth token
function setAuthToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

// Helper function to remove auth token
function removeAuthToken(): void {
  localStorage.removeItem('accessToken');
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add ngrok-skip-browser-warning header to avoid ngrok warning
  headers['ngrok-skip-browser-warning'] = 'true';

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  // For non-JSON responses, return as text or null
  const text = await response.text();
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch (e) {
    return text as unknown as T;
  }
}

// Helper function for API calls with progress tracking
async function apiCallWithProgress<T>(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}${endpoint}`;

    xhr.open(options.method || 'GET', url);

    // Set headers
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    // Progress tracking
    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          options.onProgress?.(Math.round(percentComplete));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let response;
        const contentType = xhr.getResponseHeader('content-type');
        if (contentType && contentType.includes('application/json')) {
          response = JSON.parse(xhr.responseText);
        } else {
          response = xhr.responseText;
        }
        resolve(response as T);
      } else {
        reject(new Error(`API Error: ${xhr.status} - ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.send(options.body);
  });
}

// Authentication APIs
export const authApi = {
  signup: async (data: SignupRequest): Promise<void> => {
    await apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiCall<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    return response;
  },

  logout: (): void => {
    removeAuthToken();
  },

  isAuthenticated: (): boolean => {
    return !!getAuthToken();
  },
};

// User APIs
export const userApi = {
  getMe: async (): Promise<UserResponse> => {
    return apiCall<UserResponse>('/api/users/me');
  },

  getProfile: async (userId: number): Promise<UserResponse> => {
    return apiCall<UserResponse>(`/api/users/${userId}`);
  },

  updateProfile: async (userId: number, data: UserUpdateRequest): Promise<void> => {
    await apiCall(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateSettings: async (userId: number, settings: UserSettings): Promise<void> => {
    await apiCall(`/api/users/${userId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// Project APIs
export const projectApi = {
  getProjects: async (params?: {
    sort?: string;
    timeRange?: string;
  }): Promise<ProjectResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.timeRange) queryParams.append('timeRange', params.timeRange);

    const queryString = queryParams.toString();
    return apiCall<ProjectResponse[]>(`/api/projects${queryString ? `?${queryString}` : ''}`);
  },

  getProject: async (projectId: number): Promise<ProjectResponse> => {
    return apiCall<ProjectResponse>(`/api/projects/${projectId}`);
  },

  saveProject: async (
    userId: number,
    project: ProjectRequest,
    projectId?: number
  ): Promise<number> => {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId.toString());
    if (projectId) queryParams.append('projectId', projectId.toString());

    return apiCall<number>(`/api/projects?${queryParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  likeProject: async (projectId: number): Promise<void> => {
    await apiCall(`/api/projects/${projectId}/like`, {
      method: 'POST',
    });
  },

  commentProject: async (projectId: number): Promise<void> => {
    await apiCall(`/api/projects/${projectId}/comment`, {
      method: 'POST',
    });
  },
};

// Part APIs
export const partApi = {
  getParts: async (params: {
    type: PartType;
    category?: PartCategory;
    sort?: string;
    timeRange?: string;
    isAiGenerated?: boolean;
  }): Promise<PartResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('type', params.type);
    if (params.category) queryParams.append('category', params.category);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.timeRange) queryParams.append('timeRange', params.timeRange);
    if (params.isAiGenerated !== undefined) {
      queryParams.append('isAiGenerated', params.isAiGenerated.toString());
    }

    return apiCall<PartResponse[]>(`/api/parts?${queryParams.toString()}`);
  },

  uploadPart: async (
    name: string,
    type: PartType,
    category: PartCategory,
    modelFile: File,
    thumbnailFile?: File,
    onProgress?: (progress: number) => void
  ): Promise<number> => {
    const formData = new FormData();
    formData.append('modelFile', modelFile);
    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    }

    const queryParams = new URLSearchParams();
    queryParams.append('name', name);
    queryParams.append('type', type);
    queryParams.append('category', category);

    return apiCallWithProgress<number>(`/api/parts?${queryParams.toString()}`, {
      method: 'POST',
      body: formData,
      onProgress
    });
  },

  likePart: async (partId: number): Promise<void> => {
    await apiCall(`/api/parts/${partId}/like`, {
      method: 'POST',
    });
  },
};

// AI Asset APIs
export const assetApi = {
  confirmAiAsset: async (
    name: string,
    externalUrl: string
  ): Promise<number> => {
    const queryParams = new URLSearchParams();
    queryParams.append('name', name);
    queryParams.append('externalUrl', externalUrl);

    return apiCall<number>(`/api/assets/confirm?${queryParams.toString()}`, {
      method: 'POST',
    });
  },

  aggregateAsset: async (
    name: string,
    type: string,
    category: string,
    modelFile: File,
    thumbnailFile?: File,
    description?: string,
    sourceId?: string
  ): Promise<number> => {
    const formData = new FormData();
    formData.append('modelFile', modelFile);
    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    }

    const queryParams = new URLSearchParams();
    queryParams.append('name', name);
    queryParams.append('type', type);
    queryParams.append('category', category);
    if (description) queryParams.append('description', description);
    if (sourceId) queryParams.append('sourceId', sourceId);

    const token = getAuthToken();
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/assets/aggregate?${queryParams.toString()}`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  checkDuplicate: async (sourceId: string): Promise<boolean> => {
    return apiCall<boolean>(`/api/assets/check-duplicate/${sourceId}`);
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<Record<string, string>> => {
    return apiCall<Record<string, string>>('/api/health');
  },
};

// GLB File Transfer APIs
export const transferApi = {
  // GLB 파일 업로드 (전송 상태)
  uploadGLB: async (glbFile: File, sessionId?: string): Promise<{ fileId: string; url: string }> => {
    const formData = new FormData();
    formData.append('glbFile', glbFile);
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    const token = getAuthToken();
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
      // FormData를 사용할 때는 Content-Type을 설정하지 않음 (브라우저가 자동으로 boundary 포함)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('[Transfer] 업로드 시작, 파일 크기:', glbFile.size, 'bytes');
      console.log('[Transfer] 업로드 URL:', `${API_BASE_URL}/api/transfer/upload`);

      const response = await fetch(`${API_BASE_URL}/api/transfer/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('[Transfer] 업로드 응답 상태:', response.status, response.statusText);
      console.log('[Transfer] 업로드 응답 Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        let errorText = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }

        // 503 오류는 서버/ngrok 문제
        if (response.status === 503) {
          throw new Error(`서버 연결 오류 (503): 서버가 응답하지 않습니다. ngrok 연결을 확인하거나 잠시 후 다시 시도하세요.`);
        }

        console.error('[Transfer] 업로드 에러:', response.status, errorText);
        throw new Error(`Upload Error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      console.log('[Transfer] 업로드 완료:', result);
      return result;
    } catch (error) {
      console.error('[Transfer] uploadGLB 네트워크 에러:', error);

      // 네트워크 에러 처리
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('네트워크 연결 실패: 서버에 연결할 수 없습니다. ngrok 연결을 확인하거나 서버가 실행 중인지 확인하세요.');
      }

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  },

  // GLB 파일 다운로드 (수신 상태)
  // 서버가 302 리다이렉트를 반환하므로 리다이렉트를 따라가서 파일 다운로드
  downloadGLB: async (fileId: string): Promise<Blob> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('[Transfer] 다운로드 시작, fileId:', fileId);

      // 리다이렉트를 따라가도록 fetch 옵션 설정
      const response = await fetch(`${API_BASE_URL}/api/transfer/download/${fileId}`, {
        method: 'GET',
        headers,
        redirect: 'follow', // 리다이렉트 자동 따라가기
      });

      console.log('[Transfer] 다운로드 응답 상태:', response.status, response.statusText);
      console.log('[Transfer] 다운로드 응답 Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found: ${fileId}`);
        }

        // 에러 응답이 JSON일 수도 있으니 시도
        let errorText = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }

        console.error('[Transfer] 다운로드 에러:', response.status, errorText);
        throw new Error(`Download Error: ${response.status} - ${errorText}`);
      }

      // OpenAPI 스펙에 따르면 바이너리 데이터 (byte array)를 반환
      const blob = await response.blob();
      console.log('[Transfer] 다운로드 완료, blob 크기:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      return blob;
    } catch (error) {
      console.error('[Transfer] downloadGLB 네트워크 에러:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  },

  // 최신 GLB 파일 ID 가져오기 (수신 상태에서 사용)
  getLatestFileId: async (): Promise<string | null> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/transfer/latest`, {
        method: 'GET',
        headers,
        redirect: 'manual', // 리다이렉트를 수동으로 처리
      });

      // 리다이렉트 응답 처리 (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        console.warn('[Transfer] 리다이렉트 감지:', location);

        // OAuth 로그인 페이지로 리다이렉트된 경우
        if (location && (location.includes('oauth2') || location.includes('accounts.google.com'))) {
          throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
        }

        // 다른 리다이렉트인 경우
        throw new Error(`Unexpected redirect: ${location}`);
      }

      // 401, 403: 인증/권한 오류
      if (response.status === 401 || response.status === 403) {
        console.warn('[Transfer] 인증이 필요합니다. (401/403)');
        throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[Transfer] 최신 파일이 없음 (404)');
          return null; // 아직 업로드된 파일이 없음
        }
        const errorText = await response.text();
        console.error('[Transfer] getLatestFileId 에러:', response.status, errorText);
        throw new Error(`Get Latest Error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Transfer] 예상치 못한 응답 형식:', contentType, text.substring(0, 100));
        throw new Error(`Unexpected response type: ${contentType}`);
      }

      const data = await response.json();
      console.log('[Transfer] getLatestFileId 응답:', data);

      // OpenAPI 스펙에 따르면 LatestFileResponse는 { fileId: string } 형식
      if (data && typeof data.fileId === 'string') {
        return data.fileId;
      }

      // 응답 형식이 다를 경우를 대비한 fallback
      if (data && data.fileId === null || data.fileId === undefined) {
        console.log('[Transfer] fileId가 null/undefined');
        return null;
      }

      console.warn('[Transfer] 예상치 못한 응답 구조:', data);
      return null;
    } catch (error) {
      console.error('[Transfer] getLatestFileId 네트워크 에러:', error);

      // CORS 에러나 네트워크 에러 처리
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // 리다이렉트로 인한 CORS 에러일 수 있음
        throw new Error('서버 연결 실패 또는 인증이 필요합니다. 로그인 상태를 확인해주세요.');
      }

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  },
};
