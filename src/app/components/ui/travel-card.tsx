import * as React from "react";
import { cn } from "@/app/components/ui/utils";

// Define the props for the TravelCard component
interface TravelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  imageAlt: string;
  logo?: React.ReactNode;
  title: string;
  location: string;
  overview: string;
  onBookNow: () => void;
}

const TravelCard = React.forwardRef<HTMLDivElement, TravelCardProps>(
  (
    {
      className,
      imageUrl,
      imageAlt,
      logo,
      title,
      location,
      overview,
      onBookNow,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg cursor-pointer",
          "transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2",
          className
        )}
        onClick={onBookNow}
        {...props}
      >
        {/* Fallback gradient background - behind image */}
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 z-0" />
        
        {/* Background Image with Zoom Effect on Hover */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 z-10"
            onError={(e) => {
              // 이미지 로드 실패 시 숨김
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            loading="lazy"
          />
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20"></div>

        {/* Content Container */}
        <div className="relative flex h-full flex-col justify-between p-4 text-card-foreground z-30">
          {/* Top Section: Logo */}
          <div className="flex h-20 items-start">
             {logo && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50 bg-black/20 backdrop-blur-sm">
                   {logo}
                </div>
             )}
          </div>
          
          {/* Middle Section: Details */}
          <div className="space-y-2">
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-xs text-white/80">{location}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/90 mb-1">OVERVIEW</h4>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                {overview}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
TravelCard.displayName = "TravelCard";

export { TravelCard };
