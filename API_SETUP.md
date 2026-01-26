# Tripo AI API 연결 가이드

## 1. API 키 발급

1. [Tripo AI 웹사이트](https://www.tripo3d.ai)에 접속
2. 회원가입 또는 로그인
3. 대시보드에서 API 키 발급
4. API 키를 복사하여 안전하게 보관

## 2. 환경 변수 설정

### .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

#### 옵션 1: Secret Key만 사용 (Bearer 토큰)
```env
VITE_TRIPO_API_KEY=your_secret_key_here
```

#### 옵션 2: Client ID와 Secret Key 모두 사용 (Basic 인증)
```env
VITE_TRIPO_CLIENT_ID=your_client_id_here
VITE_TRIPO_API_KEY=your_secret_key_here
```

#### 옵션 3: 콜론으로 구분된 형식
```env
VITE_TRIPO_API_KEY=client_id:secret_key
```

**예시:**
```env
# Secret Key만 사용
VITE_TRIPO_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz

# 또는 Client ID와 Secret Key 분리
VITE_TRIPO_CLIENT_ID=client_abc123
VITE_TRIPO_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz

# 또는 콜론으로 구분
VITE_TRIPO_API_KEY=client_abc123:sk-1234567890abcdefghijklmnopqrstuvwxyz
```

### 중요 사항

- ⚠️ `.env` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- `.env.example` 파일은 예시로만 사용하세요 (실제 API 키는 포함하지 않음)

## 3. 개발 서버 재시작

환경 변수를 변경한 후에는 개발 서버를 재시작해야 합니다:

```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

## 4. API 사용 방법

1. **Prompting** 탭으로 이동
2. 원하는 3D 모델을 설명하는 프롬프트 입력
   - 예: "A futuristic city with flying cars and neon lights, cyberpunk style, highly detailed"
3. **Generate 3D Model** 버튼 클릭
4. 생성이 완료되면 다운로드하거나 씬에 추가할 수 있습니다

## 5. API 엔드포인트

현재 구현된 엔드포인트:
- **생성**: `POST https://api.tripo3d.ai/v1/tasks`
- **상태 확인**: `GET https://api.tripo3d.ai/v1/tasks/{task_id}`
- **다운로드**: `GET https://api.tripo3d.ai/v1/models/{model_id}/download`

> ⚠️ **주의**: 실제 Tripo AI API 엔드포인트는 공식 문서를 확인하세요.
> 현재 엔드포인트는 예시이며, 실제 API 문서에 따라 수정이 필요할 수 있습니다.

## 6. 트러블슈팅

### API 키가 인식되지 않음
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 `VITE_TRIPO_API_KEY`인지 확인 (VITE_ 접두사 필수)
- 개발 서버를 재시작했는지 확인
- `.env` 파일에 따옴표나 공백이 없는지 확인

### 생성 실패
- 프롬프트가 너무 짧거나 모호한 경우 더 구체적으로 작성
- 네트워크 연결 확인
- API 할당량 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 상태 확인 실패
- 작업 ID가 올바른지 확인
- API 키 권한 확인

## 7. 보안 주의사항

- ⚠️ `.env` 파일을 절대 공개 저장소에 커밋하지 마세요
- ⚠️ `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- ⚠️ 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요

## 8. 추가 리소스

- [Tripo AI 공식 문서](https://docs.tripo3d.ai) (실제 문서 URL로 변경 필요)
- [Tripo AI 지원](https://support.tripo3d.ai)
- [Vite 환경 변수 문서](https://vitejs.dev/guide/env-and-mode.html)
