import { Camera, Grid3x3, Save, Upload, RotateCcw } from 'lucide-react';
import { Switch } from '@/app/components/ui/switch';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

interface TopNavigationBarProps {
  webcamEnabled: boolean;
  onWebcamToggle: () => void;
  handTrackingActive: boolean;
  gridSnapEnabled: boolean;
  onGridSnapToggle: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
}

export function TopNavigationBar({
  webcamEnabled,
  onWebcamToggle,
  handTrackingActive,
  gridSnapEnabled,
  onGridSnapToggle,
  onSave,
  onLoad,
  onReset,
}: TopNavigationBarProps) {
  return (
    <div className="h-16 bg-[#1a1b26]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6">
      {/* Left: Logo/Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-[#00d4ff] to-[#0088ff] rounded-lg flex items-center justify-center shadow-lg shadow-[#00d4ff]/30">
          <div className="w-5 h-5 border-2 border-white rounded"></div>
        </div>
        <h1 className="text-white text-lg font-semibold tracking-tight">Diorama Builder</h1>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-4">
        {/* Webcam Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 bg-[#242532]/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <Camera className={`w-4 h-4 ${webcamEnabled ? 'text-[#00d4ff]' : 'text-gray-500'}`} />
                <Switch checked={webcamEnabled} onCheckedChange={onWebcamToggle} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#2a2b38] border-white/10">
              <p>Toggle webcam for hand tracking</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Hand Tracking Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 bg-[#242532]/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/5">
                <div className={`w-2 h-2 rounded-full ${handTrackingActive ? 'bg-[#00ff88] shadow-lg shadow-[#00ff88]/50 animate-pulse' : 'bg-gray-600'}`}></div>
                <span className="text-sm text-gray-400">
                  Hand Tracking {handTrackingActive ? 'ON' : 'OFF'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#2a2b38] border-white/10">
              <p>{handTrackingActive ? 'Hand detected' : 'No hand detected'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Grid Snap Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 bg-[#242532]/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <Grid3x3 className={`w-4 h-4 ${gridSnapEnabled ? 'text-[#00d4ff]' : 'text-gray-500'}`} />
                <Switch checked={gridSnapEnabled} onCheckedChange={onGridSnapToggle} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#2a2b38] border-white/10">
              <p>Toggle grid snapping</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black px-5 h-9 shadow-lg shadow-[#00d4ff]/30 font-medium"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          onClick={onLoad}
          variant="secondary"
          className="bg-[#242532]/80 hover:bg-[#2a2b38] text-white px-5 h-9 border border-white/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Load
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          className="border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 px-5 h-9"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}