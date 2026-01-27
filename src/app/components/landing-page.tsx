import { Component } from "@/components/ui/flow-gradient-hero-section";
import { Button } from "@/app/components/ui/button";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="relative w-full h-screen">
      <Component
        title="Build 3D Worlds"
        ctaText="Start Building"
        onCtaClick={onGetStarted}
        showPauseButton={false}
      />
    </div>
  );
}
