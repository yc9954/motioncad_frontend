import { Badge } from '@/app/components/ui/badge';
import { Hand, Square, Circle, ArrowUp, Grab, ZoomIn } from 'lucide-react';

interface Canvas3DViewportProps {
  webcamEnabled: boolean;
  currentGesture: string;
  handPosition: { x: number; y: number } | null;
}

const GESTURE_ICONS: Record<string, React.ReactNode> = {
  'Pinch': <Hand className="w-3 h-3" />,
  'Open Palm': <Hand className="w-3 h-3" />,
  'Point': <ArrowUp className="w-3 h-3" />,
  'Grab': <Grab className="w-3 h-3" />,
  'Zoom': <ZoomIn className="w-3 h-3" />,
  'None': <Circle className="w-3 h-3" />,
};

export function Canvas3DViewport({
  webcamEnabled,
  currentGesture,
  handPosition,
}: Canvas3DViewportProps) {
  return (
    <div className="flex-1 bg-[#16171f] relative overflow-hidden">
      {/* Subtle Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      ></div>

      {/* Ambient Glow Effects */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 3D Viewport Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 relative">
            {/* Isometric cube illustration */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
                <defs>
                  <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#0088ff', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="none" stroke="url(#cubeGradient)" strokeWidth="2"/>
                <line x1="50" y1="20" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                <line x1="20" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                <line x1="80" y1="35" x2="50" y2="50" stroke="url(#cubeGradient)" strokeWidth="2"/>
                <circle cx="50" cy="50" r="4" fill="#00d4ff" className="animate-pulse"/>
              </svg>
            </div>
          </div>
          <p className="text-gray-500 text-sm">3D Viewport</p>
          <p className="text-gray-600 text-xs mt-1">Select parts from the library to build your diorama</p>
        </div>
      </div>

      {/* Webcam Preview */}
      {webcamEnabled && (
        <div className="absolute top-4 right-4 w-52 h-40 bg-[#1a1b26]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 to-transparent"></div>
            <div className="text-center z-10">
              <Hand className="w-8 h-8 text-[#00d4ff] mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-gray-400">Webcam Active</p>
              <p className="text-[10px] text-gray-600 mt-1">Tracking hand gestures</p>
            </div>
            {/* Recording indicator */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-md backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] text-red-400 font-medium">REC</span>
            </div>
          </div>
        </div>
      )}

      {/* Hand Cursor Indicator */}
      {handPosition && webcamEnabled && (
        <div
          className="absolute w-8 h-8 pointer-events-none"
          style={{
            left: `${handPosition.x}%`,
            top: `${handPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-full h-full bg-[#00d4ff] rounded-full shadow-lg shadow-[#00d4ff]/50 flex items-center justify-center">
            <div className="w-4 h-4 bg-[#00d4ff] rounded-full"></div>
            <div className="absolute inset-0 bg-[#00d4ff] rounded-full animate-ping opacity-40"></div>
          </div>
        </div>
      )}

      {/* Gesture Status Badge */}
      <div className="absolute bottom-4 right-4">
        <Badge
          className={`
            px-4 py-2.5 text-sm backdrop-blur-xl
            ${currentGesture === 'None' 
              ? 'bg-[#1a1b26]/80 text-gray-500 border-white/5' 
              : 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 shadow-lg shadow-[#00d4ff]/10'
            }
          `}
          variant="outline"
        >
          <div className="flex items-center gap-2">
            {GESTURE_ICONS[currentGesture] || GESTURE_ICONS['None']}
            <span className="font-medium">Gesture: {currentGesture}</span>
          </div>
        </Badge>
      </div>

      {/* Corner Grid Indicators - more subtle */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="w-8 h-8 border-l border-t border-white/10"></div>
      </div>
      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
        <div className="w-8 h-8 border-l border-b border-white/10"></div>
      </div>
    </div>
  );
}