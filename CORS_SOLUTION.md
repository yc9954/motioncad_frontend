# CORS 에러 해결 방법

## 에러 설명

**CORS (Cross-Origin Resource Sharing) 에러**는 브라우저의 보안 정책으로 인해 발생합니다.

### 왜 발생하나요?
- 브라우저는 다른 도메인(origin)의 리소스에 접근하는 것을 기본적으로 차단합니다
- `http://localhost:5173` (프론트엔드)에서 `https://api.tripo3d.ai` (API 서버)로 직접 요청을 보낼 수 없습니다
- 서버가 CORS 헤더를 제대로 설정하지 않았거나, 프리플라이트 요청이 실패하면 이 에러가 발생합니다

## 해결 방법: Vite 프록시 설정

프로젝트에 **Vite 프록시**를 설정했습니다. 이제 프론트엔드에서 `/api/tripo/*`로 요청하면 Vite 개발 서버가 Tripo AI API로 요청을 전달합니다.

### 작동 방식:
```
프론트엔드 → /api/tripo/v1/tasks → Vite 프록시 → https://api.tripo3d.ai/v1/tasks
```

### 장점:
- ✅ CORS 문제 해결 (같은 도메인으로 요청)
- ✅ API 키를 서버에서 관리 (환경 변수)
- ✅ 개발 환경에서 바로 사용 가능

## 사용 방법

1. `.env` 파일에 API 키 설정:
```env
VITE_TRIPO_API_KEY=your_api_key_here
```

2. 개발 서버 재시작:
```bash
npm run dev
```

3. 이제 API 호출이 정상적으로 작동합니다!

## 주의사항

⚠️ **프로덕션 환경에서는:**
- Vite 프록시는 개발 환경에서만 작동합니다
- 프로덕션에서는 별도의 백엔드 서버를 구축해야 합니다
- 백엔드에서 API 키를 관리하고 Tripo AI API를 호출하세요

## 대안: 백엔드 프록시 서버

프로덕션 환경을 위한 백엔드 예시:

```javascript
// Express.js 예시
app.post('/api/3d-generate', async (req, res) => {
  const { prompt } = req.body;
  const apiKey = process.env.TRIPO_API_KEY;
  
  const response = await fetch('https://api.tripo3d.ai/v1/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  
  const data = await response.json();
  res.json(data);
});
```
