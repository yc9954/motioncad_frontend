// Backend API Client
// Base URL from OpenAPI spec
// 개발 환경에서는 Vite 프록시를 사용하여 CORS 문제 해결
const API_BASE_URL = import.meta.env.DEV
  ? '' // 개발 환경: Vite 프록시 사용 (/api로 시작)
  : (import.meta.env.VITE_API_BASE_URL || 'https://f76640308ac2.ngrok-free.app');

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
  getProfile: async (userId: number): Promise<UserResponse> => {
    return apiCall<UserResponse>(`/api/users/${userId}`);
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
