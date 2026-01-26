import { useEffect, useRef } from "react";

interface ModelViewerProps {
  src: string;
  alt?: string;
  className?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src: string;
          alt?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "ar"?: boolean;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          "exposure"?: string;
          "interaction-policy"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function ModelViewer({ src, alt = "3D Model", className = "" }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // model-viewer 스크립트 로드
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <model-viewer
        src={src}
        alt={alt}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="1"
        interaction-policy="allow-when-focused"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}
