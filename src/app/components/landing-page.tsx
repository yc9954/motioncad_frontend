import { Component } from "@/components/ui/flow-gradient-hero-section";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <Component 
      title="Build 3D Worlds"
      ctaText="Start Building"
      onCtaClick={onGetStarted}
      showPauseButton={false}
    />
  );
}
