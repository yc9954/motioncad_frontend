import { useState } from "react";
import { Login1 } from "@/components/ui/login-1";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToSignup?: () => void;
}

export function LoginPage({ onLoginSuccess, onNavigateToSignup }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 개발 단계: 백엔드 API 호출 시도, 실패 시 자동 로그인
      try {
        const response = await authApi.login({ email, password });
        
        if (response.accessToken) {
          localStorage.setItem('userId', '1');
          toast.success("로그인 성공!");
          
          if (onLoginSuccess) {
            onLoginSuccess();
          }
          return;
        }
      } catch (apiError) {
        console.warn('API 로그인 실패, 자동 로그인 처리:', apiError);
        // API 실패 시 자동으로 로그인 처리 (개발용)
      }
      
      // 자동 로그인 처리 (개발 단계)
      localStorage.setItem('accessToken', 'dev-token');
      localStorage.setItem('userId', '1');
      toast.success("로그인 성공! (개발 모드)");
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      // 에러가 발생해도 자동 로그인 처리
      localStorage.setItem('accessToken', 'dev-token');
      localStorage.setItem('userId', '1');
      toast.success("로그인 성공! (개발 모드)");
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    if (onNavigateToSignup) {
      onNavigateToSignup();
    } else {
      toast.info("회원가입 페이지로 이동합니다.");
    }
  };

  return (
    <Login1 
      onLogin={handleLogin}
      onSignup={handleSignup}
    />
  );
}
