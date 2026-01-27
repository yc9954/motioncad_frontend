import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export function OAuth2RedirectHandler() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('accessToken', token);
            localStorage.setItem('userId', '1'); // For now, we assume user ID 1 or fetch it later
            toast.success('Google 로그인 성공!');
            navigate('/', { replace: true });
        } else {
            const error = params.get('error');
            toast.error(error || '로그인에 실패했습니다.');
            navigate('/login', { replace: true });
        }
    }, [location, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0d0e14] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium">로그인 처리 중...</p>
            </div>
        </div>
    );
}
