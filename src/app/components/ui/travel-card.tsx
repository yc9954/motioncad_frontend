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

        {/* Gradient Overlay for Text Readability - 하단 그라데이션 강화 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20"></div>

        {/* Content Container */}
        <div className="relative flex h-full flex-col p-4 text-card-foreground z-30 overflow-hidden">
          {/* Top Section: Logo */}
          <div className="flex h-20 items-start">
             {logo && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50 bg-black/20 backdrop-blur-sm">
                   {logo}
                </div>
             )}
          </div>
          
          {/* 헤더와 설명글을 함께 감싸서 호버 시 올라가도록 */}
          <div className="absolute bottom-0 left-0 right-0 transform translate-y-0 group-hover:-translate-y-20 transition-transform duration-300 ease-in-out">
            {/* 헤더 (제목, 위치) - 기본 상태에서 카드 가장 아래에 위치 */}
            <div className="p-4 space-y-2">
              <div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-xs text-white/80">{location}</p>
              </div>
            </div>

            {/* Overview - 호버 시 아래에서 올라오면서 표시 */}
            <div className="absolute top-full left-0 right-0 px-4 pb-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-in-out">
              <div className="space-y-2 pt-2 border-t border-white/20">
                <h4 className="text-xs font-semibold text-white/90 mb-1">OVERVIEW</h4>
                <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                  {overview}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
TravelCard.displayName = "TravelCard";

export { TravelCard };
