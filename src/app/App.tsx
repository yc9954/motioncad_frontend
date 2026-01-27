import { useState, useEffect } from 'react';
import { LandingPage } from '@/app/components/landing-page';
import { DashboardPage } from '@/app/components/dashboard-page';
import { LoginPage } from '@/app/components/login-page';
import { TopNavigationBar } from '@/app/components/top-navigation-bar';
import { PartsLibrary, Part } from '@/app/components/parts-library';
import { Canvas3DViewport } from '@/app/components/canvas-3d-viewport';
import { PropertiesPanel, TransformValues } from '@/app/components/properties-panel';
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

const GESTURES = ['None', 'Open Palm', 'Pinch', 'Point', 'Grab', 'Zoom'];

export default function App() {
  // 초기 상태: 항상 랜딩 페이지에서 시작
  const [isAuthenticated, setIsAuthenticated] = useState(() => authApi.isAuthenticated());
  const [showLanding, setShowLanding] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [handTrackingActive, setHandTrackingActive] = useState(false);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [currentGesture, setCurrentGesture] = useState('None');
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [transform, setTransform] = useState<TransformValues>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 100,
  });

  // Simulate hand tracking when webcam is enabled
  useEffect(() => {
    if (webcamEnabled && !showLanding) {
      // Simulate hand detection after a short delay
      const trackingTimer = setTimeout(() => {
        setHandTrackingActive(true);
        toast.success('Hand tracking activated');
      }, 1000);

      // Simulate hand movement and gesture changes
      const gestureInterval = setInterval(() => {
        // Random gesture change
        const randomGesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
        setCurrentGesture(randomGesture);

        // Random hand position
        if (Math.random() > 0.3) {
          setHandPosition({
            x: 30 + Math.random() * 40,
            y: 30 + Math.random() * 40,
          });
        }
      }, 3000);

      // Continuous subtle hand movement
      const positionInterval = setInterval(() => {
        if (handPosition) {
          setHandPosition(prev => {
            if (!prev) return { x: 50, y: 50 };
            return {
              x: Math.max(20, Math.min(80, prev.x + (Math.random() - 0.5) * 5)),
              y: Math.max(20, Math.min(80, prev.y + (Math.random() - 0.5) * 5)),
            };
          });
        }
      }, 100);

      return () => {
        clearTimeout(trackingTimer);
        clearInterval(gestureInterval);
        clearInterval(positionInterval);
        setHandTrackingActive(false);
        setCurrentGesture('None');
        setHandPosition(null);
        toast.info('Hand tracking deactivated');
      };
    }
  }, [webcamEnabled, showLanding]);

  const handleGetStarted = () => {
    setShowLanding(false);
    setShowDashboard(true);
    toast.success('대시보드로 이동했습니다!', {
      description: '빌더를 시작하려면 Go to Builder 버튼을 클릭하세요.',
    });
  };

  const handleNavigateToBuilder = () => {
    setShowDashboard(false);
    toast.success('디오라마 빌더에 오신 것을 환영합니다!', {
      description: '왼쪽에서 파트를 선택하여 시작하세요.',
    });
  };

  const handleWebcamToggle = () => {
    setWebcamEnabled(!webcamEnabled);
    if (!webcamEnabled) {
      toast.info('Webcam enabled - Starting hand tracking...');
    } else {
      toast.info('Webcam disabled');
    }
  };

  const handleGridSnapToggle = () => {
    setGridSnapEnabled(!gridSnapEnabled);
    toast.info(`Grid snap ${!gridSnapEnabled ? 'enabled' : 'disabled'}`);
  };

  const handlePartSelect = (part: Part) => {
    setSelectedPart(part);
    // Reset transform for new part
    setTransform({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 100,
    });
    toast.success(`Selected: ${part.name}`);
  };

  const handleTransformChange = (newTransform: TransformValues) => {
    setTransform(newTransform);
  };

  const handleDelete = () => {
    if (selectedPart) {
      toast.success(`Deleted: ${selectedPart.name}`);
      setSelectedPart(null);
    }
  };

  const handleSave = () => {
    toast.success('Diorama saved successfully!', {
      description: 'Your scene has been saved to local storage.',
    });
  };

  const handleLoad = () => {
    toast.info('Loading diorama...', {
      description: 'No saved scenes found. Create a new scene to get started.',
    });
  };

  const handleReset = () => {
    setSelectedPart(null);
    setTransform({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 100,
    });
    toast.warning('Scene reset', {
      description: 'All parts have been removed from the scene.',
    });
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
    setShowLanding(false);
    setShowDashboard(true);
  };

  const handleShowLogin = () => {
    console.log('handleShowLogin called');
    setShowLogin(true);
    setShowLanding(false);
    setShowDashboard(false);
  };

  const handleGetStartedWithLogin = () => {
    // 개발 단계: 로그인 없이 바로 대시보드로 이동
    // if (!isAuthenticated) {
    //   setShowLogin(true);
    //   setShowLanding(false);
    // } else {
    //   handleGetStarted();
    // }
    handleGetStarted();
  };

  // Show login page
  if (showLogin) {
    return (
      <>
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onNavigateToSignup={() => {
            toast.info("회원가입 기능은 곧 추가될 예정입니다.");
          }}
        />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#2a2a3e',
              color: '#ffffff',
              border: '1px solid #3a3a4e',
            },
          }}
        />
      </>
    );
  }

  // Show landing page
  if (showLanding) {
    return (
      <>
        <LandingPage 
          onGetStarted={handleGetStartedWithLogin}
          onLogin={handleShowLogin}
        />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#2a2a3e',
              color: '#ffffff',
              border: '1px solid #3a3a4e',
            },
          }}
        />
      </>
    );
  }

  const handleNavigateToLanding = () => {
    setIsAuthenticated(false);
    setShowDashboard(false);
    setShowLogin(false);
    setShowLanding(true);
  };

  // Show dashboard page
  if (showDashboard) {
    return (
      <>
        <DashboardPage 
          onNavigateToBuilder={handleNavigateToBuilder}
          onNavigateToLanding={handleNavigateToLanding}
        />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#2a2a3e',
              color: '#ffffff',
              border: '1px solid #3a3a4e',
            },
          }}
        />
      </>
    );
  }

  // Show main application
  return (
    <div className="size-full flex flex-col bg-[#0d0e14] text-white">
      {/* Top Navigation */}
      <TopNavigationBar
        webcamEnabled={webcamEnabled}
        onWebcamToggle={handleWebcamToggle}
        handTrackingActive={handTrackingActive}
        gridSnapEnabled={gridSnapEnabled}
        onGridSnapToggle={handleGridSnapToggle}
        onSave={handleSave}
        onLoad={handleLoad}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Parts Library */}
        <PartsLibrary onPartSelect={handlePartSelect} />

        {/* Center - 3D Canvas */}
        <Canvas3DViewport
          webcamEnabled={webcamEnabled}
          currentGesture={currentGesture}
          handPosition={handPosition}
        />

        {/* Right Panel - Properties */}
        <PropertiesPanel
          selectedPart={selectedPart}
          transform={transform}
          onTransformChange={handleTransformChange}
          onDelete={handleDelete}
        />
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1b26',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.05)',
          },
        }}
      />
    </div>
  );
}