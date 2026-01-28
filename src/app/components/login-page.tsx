import { useState, useEffect } from "react";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription, GlassCardAction, GlassCardFooter } from "@/app/components/ui/glass-card";
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { authApi, getOAuth2Url } from "@/lib/api";
import { toast } from "sonner";
import { FaGoogle } from 'react-icons/fa';
import { Component } from "@/components/ui/flow-gradient-hero-section";

// Google OAuth URL 생성
const getGoogleOAuthUrl = (): string => {
  // OAuth는 세션 유지를 위해 항상 직접 백엔드 URL 사용 (프록시 사용 안 함)
  // 프록시를 사용하면 세션이 유지되지 않아 authorization_request_not_found 에러 발생
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://86df24586530.ngrok-free.app';
  return `${apiBaseUrl}/oauth2/authorization/google`;
};

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToSignup?: () => void;
}

export function LoginPage({ onLoginSuccess, onNavigateToSignup }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 다크 테마 강제 적용
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });

      if (response.accessToken) {
        toast.success("로그인 성공!");
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("로그인에 실패했습니다. 계정 정보를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const oauthUrl = getGoogleOAuthUrl();
    console.log('[Login] Google OAuth URL:', oauthUrl);
    window.location.href = oauthUrl;
  };

  return (
    <div className="relative w-full h-screen">
      <Component
        title=""
        ctaText=""
        onCtaClick={() => {}}
        showPauseButton={false}
      />
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <GlassCard className="w-full max-w-sm">
          <GlassCardHeader>
            <GlassCardTitle>Login to your account</GlassCardTitle>
            <GlassCardDescription>
              Enter your email below to login to your account
            </GlassCardDescription>
            <GlassCardAction>
              <Button variant="link" onClick={onNavigateToSignup}>
                Sign Up
              </Button>
            </GlassCardAction>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("비밀번호 찾기 기능은 준비 중입니다.");
                      }}
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </form>
          </GlassCardContent>
          <GlassCardFooter className="flex-col gap-2">
            <Button
              type="submit"
              className="w-full"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-2"
              onClick={handleGoogleLogin}
            >
              <FaGoogle className="text-red-500" />
              Login with Google
            </Button>
          </GlassCardFooter>
        </GlassCard>
      </div>
    </div>
  );
}
