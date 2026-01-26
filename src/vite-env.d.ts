/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRIPO_API_KEY?: string;
  readonly VITE_TRIPO_CLIENT_ID?: string;
  // 다른 환경 변수들도 여기에 추가할 수 있습니다
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
