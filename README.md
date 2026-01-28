# 3D Diorama Builder UI

AI 기반 3D 모델 생성 및 대화형 3D 씬 구성 도구

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.182-000000?logo=three.js)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

## 개요

3D Diorama Builder는 사용자가 웹 브라우저에서 인터랙티브한 3D 씬을 구성할 수 있는 애플리케이션입니다. AI를 활용한 3D 모델 생성, 손 제스처 인식을 통한 직관적인 조작, 다양한 3D 파츠 라이브러리를 제공합니다.

**원본 디자인**: [Figma 프로토타입](https://www.figma.com/design/SqIgOxkJcDImlB0fy5e9oL/3D-Diorama-Builder-UI)

## 주요 기능

### 3D 씬 빌더
- Three.js 기반 인터랙티브 3D 뷰포트
- 객체 위치, 회전, 스케일 조정
- 그리드 스냅 기능
- 실시간 속성 편집 패널

### AI 기반 3D 모델 생성
- Tripo AI API를 통한 텍스트 → 3D 모델 변환
- 생성된 모델을 즉시 씬에 추가
- AI 에셋 라이브러리 저장

### 손 제스처 인식
- MediaPipe Hands 기반 웹캠 손 추적
- 지원 제스처: 오픈 팜, 핀치, 포인트, 그랩, 줌
- 손 제스처로 3D 객체 직접 조작

### 사용자 인증 & 프로젝트 관리
- 이메일/비밀번호 로그인
- OAuth2 (Google) 소셜 로그인
- 프로젝트 생성, 저장, 로드
- 프로젝트 공유 및 커뮤니티 기능 (좋아요, 댓글)

### 3D 파츠 라이브러리
- 카테고리별 3D 모델 (배경, 객체)
- 동물, 건축물, 캐릭터, 가구 등 다양한 카테고리
- 모델 즐겨찾기 및 공유

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **프레임워크** | React 18, TypeScript, Vite |
| **3D 렌더링** | Three.js, GLB/glTF 모델 |
| **UI 라이브러리** | Tailwind CSS, Radix UI, Material-UI, shadcn/ui |
| **라우팅** | react-router-dom v7 |
| **AI/ML** | MediaPipe (손 추적), Tripo AI (3D 생성) |
| **폼 관리** | react-hook-form |
| **드래그앤드롭** | react-dnd |
| **애니메이션** | Motion (Framer Motion) |
| **인증** | JWT, OAuth2 |

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd motioncad_frontend

# 의존성 설치
npm install
```

### 환경 변수 설정

루트 디렉토리에 `.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
# Tripo AI API (필수)
VITE_TRIPO_API_KEY=your_api_key_here

# Tripo Client ID (선택)
VITE_TRIPO_CLIENT_ID=your_client_id_here

# 백엔드 API URL (프로덕션용)
VITE_API_BASE_URL=your_backend_url
```

### 개발 서버 실행

```bash
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## 프로젝트 구조

```
src/
├── main.tsx                    # 진입점
├── app/
│   ├── App.tsx                 # 루트 컴포넌트 (라우팅)
│   └── components/
│       ├── landing-page.tsx    # 랜딩 페이지
│       ├── login-page.tsx      # 로그인
│       ├── signup-page.tsx     # 회원가입
│       ├── dashboard-page.tsx  # 대시보드
│       ├── canvas-3d-viewport.tsx   # 3D 캔버스
│       ├── properties-panel.tsx     # 속성 편집
│       ├── parts-library.tsx        # 파츠 라이브러리
│       ├── prompting-tab.tsx        # AI 모델 생성
│       ├── model-viewer.tsx         # 모델 뷰어
│       └── ui/                      # UI 컴포넌트
├── components/
│   └── blocks/                 # 재사용 블록 컴포넌트
├── lib/
│   ├── api.ts                  # 백엔드 API 클라이언트
│   ├── tripo-api.ts            # Tripo AI API
│   ├── hand-gesture-control.ts # 손 제스처 제어
│   ├── gesture-recognition.ts  # 제스처 인식
│   └── utils.ts                # 유틸리티 함수
└── styles/
    └── index.css               # 글로벌 스타일
```

## API 문서

### 백엔드 API

백엔드 API 스펙은 `swaggerAPI.json` 파일을 참조하세요.

주요 엔드포인트:
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/projects` - 프로젝트 목록
- `POST /api/projects` - 프로젝트 생성
- `GET /api/parts` - 파츠 목록
- `POST /api/ai-assets` - AI 에셋 저장

### Tripo AI API

Tripo AI API 설정 방법은 `API_SETUP.md`를 참조하세요.

## 프록시 설정

개발 환경에서 다음 프록시가 설정되어 있습니다 (`vite.config.ts`):

| 경로 | 대상 |
|------|------|
| `/api/tripo` | Tripo AI API |
| `/api` | 백엔드 서버 |
| `/oauth2` | OAuth2 서버 |
| `/s3-proxy` | S3 버킷 |

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |

## 관련 문서

- [API_SETUP.md](./API_SETUP.md) - Tripo AI API 설정 가이드
- [CORS_SOLUTION.md](./CORS_SOLUTION.md) - CORS 문제 해결 방법
- [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) - 라이선스 및 저작권 표시

## 라이선스

이 프로젝트의 라이선스 정보는 [ATTRIBUTIONS.md](./ATTRIBUTIONS.md)를 참조하세요.
