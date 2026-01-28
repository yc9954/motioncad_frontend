import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/tripo': {
        target: 'https://api.tripo3d.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tripo/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Proxy] Request:', req.method, req.url);
            console.log('[Proxy] Headers:', JSON.stringify(req.headers, null, 2));

            // 클라이언트에서 보낸 Authorization 헤더가 있으면 그대로 사용
            // 없으면 환경 변수에서 읽어서 추가 (백업)
            if (!req.headers['authorization']) {
              const apiKey = process.env.VITE_TRIPO_API_KEY;
              const clientId = process.env.VITE_TRIPO_CLIENT_ID;

              let authHeader: string | undefined;
              if (clientId && apiKey) {
                const credentials = Buffer.from(`${clientId}:${apiKey}`).toString('base64');
                authHeader = `Basic ${credentials}`;
              } else if (apiKey && apiKey.includes(':')) {
                const credentials = Buffer.from(apiKey).toString('base64');
                authHeader = `Basic ${credentials}`;
              } else if (apiKey) {
                authHeader = `Bearer ${apiKey}`;
              }

              if (authHeader) {
                proxyReq.setHeader('Authorization', authHeader);
                console.log('[Proxy] Added Authorization header from env');
              } else {
                console.warn('[Proxy] No API key found in environment variables or request headers');
              }
            } else {
              console.log('[Proxy] Using Authorization header from client request');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Proxy] Response:', proxyRes.statusCode, req.url);

            // CORS 헤더를 응답에 추가
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

            // 리다이렉트 처리 (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(proxyRes.statusCode || 0)) {
              const location = proxyRes.headers['location'];
              if (location && location.includes('api.tripo3d.ai')) {
                // 리다이렉트 URL을 프록시 경로로 변환
                const newLocation = location.replace('https://api.tripo3d.ai', '/api/tripo');
                proxyRes.headers['location'] = newLocation;
              }
            }
          });

          proxy.on('error', (err, req, res) => {
            console.error('[Proxy] Error:', err);
          });
        },
      },
      // 백엔드 API 프록시 추가 (OAuth2 포함)
      '/api': {
        target: 'http://ec2-54-180-23-126.ap-northeast-2.compute.amazonaws.com:8080',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Backend Proxy] Request:', req.method, req.url);

            // ngrok-skip-browser-warning 헤더 추가
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');

            // 클라이언트에서 보낸 헤더 전달
            if (req.headers['authorization']) {
              proxyReq.setHeader('Authorization', req.headers['authorization']);
            }

            // FormData 업로드 시 Content-Type을 자동으로 설정하도록 함
            // (multipart/form-data는 boundary가 포함되어야 하므로 자동 설정에 맡김)
            if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
              // boundary는 자동으로 설정되므로 그대로 전달
              console.log('[Backend Proxy] FormData upload detected');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Backend Proxy] Response:', proxyRes.statusCode, req.url);

            // CORS 헤더 추가
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          });

          proxy.on('error', (err, req, res) => {
            console.error('[Backend Proxy] Error:', err.message, err.code);
            console.error('[Backend Proxy] Request URL:', req.url);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({
                error: 'Proxy error',
                message: err.message,
                code: err.code
              }));
            }
          });
        },
      },
      '/oauth2': {
        target: 'http://ec2-54-180-23-126.ap-northeast-2.compute.amazonaws.com:8080',
        changeOrigin: true,
        secure: false,
      },
      // S3 버킷 프록시 (CORS 문제 해결용)
      '/s3-proxy': {
        target: 'http://ec2-54-180-23-126.ap-northeast-2.compute.amazonaws.com:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
        secure: true,
      },
    },
  },
})
