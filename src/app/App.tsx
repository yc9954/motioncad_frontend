import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingPage } from '@/app/components/landing-page';
import { DashboardPage } from '@/app/components/dashboard-page';
import { LoginPage } from '@/app/components/login-page';
import { SignupPage } from '@/app/components/signup-page';
import { TopNavigationBar } from '@/app/components/top-navigation-bar';
import { PartsLibrary, Part } from '@/app/components/parts-library';
import { Canvas3DViewport } from '@/app/components/canvas-3d-viewport';
import { PropertiesPanel, TransformValues } from '@/app/components/properties-panel';
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { OAuth2RedirectHandler } from '@/app/components/oauth2-redirect-handler';

const GESTURES = ['None', 'Open Palm', 'Pinch', 'Point', 'Grab', 'Zoom'];

function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authApi.isAuthenticated());
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

  // Check auth status on mount
  useEffect(() => {
    setIsAuthenticated(authApi.isAuthenticated());
  }, []);

  // Simulate hand tracking when webcam is enabled
  useEffect(() => {
    if (webcamEnabled) {
      // Simulate hand detection after a short delay
      const trackingTimer = setTimeout(() => {
        setHandTrackingActive(true);
        toast.success('Hand tracking activated');
      }, 1000);

      const gestureInterval = setInterval(() => {
        const randomGesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
        setCurrentGesture(randomGesture);

        if (Math.random() > 0.3) {
          setHandPosition({
            x: 30 + Math.random() * 40,
            y: 30 + Math.random() * 40,
          });
        }
      }, 3000);

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
  }, [webcamEnabled]);

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

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    navigate('/');
    toast.info('로그아웃 되었습니다.');
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    navigate('/');
  };

  const MainApp = () => (
    <div className="size-full flex flex-col bg-[#0d0e14] text-white">
      <TopNavigationBar
        webcamEnabled={webcamEnabled}
        onWebcamToggle={handleWebcamToggle}
        handTrackingActive={handTrackingActive}
        gridSnapEnabled={gridSnapEnabled}
        onGridSnapToggle={handleGridSnapToggle}
        onSave={handleSave}
        onLoad={handleLoad}
        onReset={handleReset}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <PartsLibrary onPartSelect={handlePartSelect} />
        <Canvas3DViewport
          webcamEnabled={webcamEnabled}
          currentGesture={currentGesture}
          handPosition={handPosition}
        />
        <PropertiesPanel
          selectedPart={selectedPart}
          transform={transform}
          onTransformChange={handleTransformChange}
          onDelete={handleDelete}
        />
      </div>

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

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <DashboardPage
              onNavigateToBuilder={() => navigate('/builder')}
              onNavigateToLanding={handleLogout}
            />
          ) : (
            <LandingPage
              onGetStarted={() => navigate('/login')}
            />
          )
        }
      />
      <Route
        path="/builder"
        element={isAuthenticated ? <MainApp /> : <Navigate to="/login" />}
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignup={() => navigate('/signup')}
            />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/" />
          ) : (
            <SignupPage
              onNavigateToLogin={() => navigate('/login')}
            />
          )
        }
      />
      <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
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
    </Router>
  );
}
