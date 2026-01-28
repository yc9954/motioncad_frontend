import { useState } from "react";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription, GlassCardAction, GlassCardFooter } from "@/app/components/ui/glass-card";
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { authApi, getOAuth2Url } from "@/lib/api";
import { toast } from "sonner";
import { FaGoogle } from 'react-icons/fa';

// Google OAuth URL 생성
const getGoogleOAuthUrl = (): string => {
    // OAuth는 세션 유지를 위해 항상 직접 백엔드 URL 사용 (프록시 사용 안 함)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://ec2-54-180-23-126.ap-northeast-2.compute.amazonaws.com:8080';
    const baseUrlWithProtocol = apiBaseUrl.startsWith('http') ? apiBaseUrl : `http://${apiBaseUrl}`;
    return `${baseUrlWithProtocol}/oauth2/authorization/google`;
};

interface SignupPageProps {
    onSignupSuccess?: () => void;
    onNavigateToLogin?: () => void;
}

export function SignupPage({ onSignupSuccess, onNavigateToLogin }: SignupPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");

    const handleSignup = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!email || !password || !nickname) {
            toast.error("모든 필드를 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            await authApi.signup({ email, password, nickname });
            toast.success("회원가입 성공! 이제 로그인해주세요.");
            if (onSignupSuccess) {
                onSignupSuccess();
            } else if (onNavigateToLogin) {
                onNavigateToLogin();
            }
        } catch (error) {
            console.error('Signup error:', error);
            toast.error("회원가입에 실패했습니다. 이미 가입된 이메일일 수 있습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const oauthUrl = getGoogleOAuthUrl();
        console.log('[Signup] Google OAuth URL:', oauthUrl);
        window.location.href = oauthUrl;
    };

    return (
        <div className='bg-[url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)] w-full h-screen flex items-center justify-center bg-cover bg-center'>
            <GlassCard className="w-full max-w-sm">
                <GlassCardHeader>
                    <GlassCardTitle>Create an account</GlassCardTitle>
                    <GlassCardDescription>
                        Enter your details below to create your account
                    </GlassCardDescription>
                    <GlassCardAction>
                        <Button variant="link" onClick={onNavigateToLogin}>
                            Login
                        </Button>
                    </GlassCardAction>
                </GlassCardHeader>
                <GlassCardContent>
                    <form onSubmit={handleSignup}>
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">Nickname</Label>
                                <Input
                                    id="nickname"
                                    type="text"
                                    placeholder="Your nickname"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    required
                                />
                            </div>
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
                                <Label htmlFor="password">Password</Label>
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
                <GlassCardFooter className="flex-col gap-2 pt-2">
                    <Button
                        type="submit"
                        className="w-full"
                        onClick={handleSignup}
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full flex items-center gap-2"
                        onClick={handleGoogleLogin}
                    >
                        <FaGoogle className="text-red-500" />
                        Continue with Google
                    </Button>
                </GlassCardFooter>
            </GlassCard>
        </div>
    );
}
