import { Component } from "@/components/ui/flow-gradient-hero-section";
import { Button } from "@/app/components/ui/button";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="relative w-full h-screen">
      <Component 
        title="Build 3D Worlds"
        ctaText="Start Building"
        onCtaClick={onGetStarted}
        showPauseButton={false}
      />
      {/* 로그인 버튼 추가 */}
      {onLogin && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={onLogin}
            variant="outline"
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            로그인
          </Button>
        </div>
      )}
    </div>
  );
}
