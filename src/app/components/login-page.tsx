import { useState } from "react";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription, GlassCardAction, GlassCardFooter } from "@/app/components/ui/glass-card";
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToSignup?: () => void;
}

export function LoginPage({ onLoginSuccess, onNavigateToSignup }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      // 개발 단계: 백엔드 API 호출 시도, 실패 시 자동 로그인
      try {
        const response = await authApi.login({ email, password });
        
        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
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
    <div className='bg-[url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)] w-full h-screen flex items-center justify-center bg-cover bg-center'>
      <GlassCard className="w-full max-w-sm">
        <GlassCardHeader>
          <GlassCardTitle>Login to your account</GlassCardTitle>
          <GlassCardDescription>
            Enter your email below to login to your account
          </GlassCardDescription>
          <GlassCardAction>
            <Button variant="link" onClick={handleSignup}>
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
            className="w-full" 
            onClick={() => toast.info("Google 로그인 기능은 준비 중입니다.")}
          >
            Login with Google
          </Button>
        </GlassCardFooter>
      </GlassCard>
    </div>
  );
}
