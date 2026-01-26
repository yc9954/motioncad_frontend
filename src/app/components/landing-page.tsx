import Hero from "@/app/components/ui/animated-shader-hero";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const handlePrimaryClick = () => {
    onGetStarted();
  };

  const handleSecondaryClick = () => {
    console.log('Explore Features clicked!');
    // Add your logic here
  };

  return (
    <div className="w-full">
      <Hero
        headline={{
          line1: "Build 3D Worlds",
          line2: "With Your Hands"
        }}
        subtitle="Create stunning 3D dioramas with intuitive hand gestures and an extensive parts library. Design, customize, and bring your imagination to life in three dimensions."
        buttons={{
          primary: {
            text: "Start Building",
            onClick: handlePrimaryClick
          }
        }}
      />
    </div>
  );
}
