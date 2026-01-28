"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/app/components/ui/carousel";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
}

export interface Gallery4Props {
  title?: string;
  description?: string;
  items: Gallery4Item[];
}

const Gallery4 = ({
  title = "Case Studies",
  description = "Discover how leading companies and developers are leveraging modern web technologies to build exceptional digital experiences. These case studies showcase real-world applications and success stories.",
  items,
}: Gallery4Props) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 무한 루프를 위해 아이템을 여러 번 복제
  const duplicatedItems = [...items, ...items, ...items];

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    const updateSelection = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
    };
  }, [carouselApi]);

  // 초기 위치를 중간 세트로 설정 (무한 루프처럼 보이도록)
  useEffect(() => {
    if (!carouselApi || items.length === 0) {
      return;
    }
    // 중간 세트의 시작 위치로 이동
    carouselApi.scrollTo(items.length, true);
  }, [carouselApi, items.length]);

  // 자동 슬라이드 (무한 루프)
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const autoplayInterval = setInterval(() => {
      carouselApi.scrollNext();
      
      // 마지막 세트의 끝에 도달하면 첫 번째 세트의 시작으로 부드럽게 이동
      const currentIndex = carouselApi.selectedScrollSnap();
      if (currentIndex >= items.length * 2) {
        carouselApi.scrollTo(items.length, false);
      }
    }, 3000); // 3초마다 다음 슬라이드로 이동

    return () => {
      clearInterval(autoplayInterval);
    };
  }, [carouselApi, items.length]);

  return (
    <section className="pt-6 pb-2">
      <div className="container mx-auto px-6">
        <div className="mb-4 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">{description}</p>
          </div>
          <div className="hidden shrink-0 gap-2 md:flex">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                carouselApi?.scrollPrev();
              }}
              disabled={!canScrollPrev}
              className="disabled:pointer-events-auto"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                carouselApi?.scrollNext();
              }}
              disabled={!canScrollNext}
              className="disabled:pointer-events-auto"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            loop: true, // 무한 루프 활성화
            align: "start",
            skipSnaps: false,
            dragFree: false,
            breakpoints: {
              "(max-width: 768px)": {
                dragFree: true,
              },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-0 2xl:ml-[max(8rem,calc(50vw-700px))] 2xl:mr-[max(0rem,calc(50vw-700px))]">
            {duplicatedItems.map((item, index) => (
              <CarouselItem
                key={`${item.id}-${index}`}
                className="max-w-[280px] pl-[16px] lg:max-w-[300px] basis-[280px] lg:basis-[300px]"
              >
                <a href={item.href} className="group rounded-xl">
                  <div className="group relative h-full min-h-[20rem] max-w-full overflow-hidden rounded-xl md:aspect-[5/4] lg:aspect-[16/9] border border-border bg-card shadow-lg cursor-pointer transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
                    {/* Fallback gradient background */}
                    <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 z-0" />
                    
                    {/* Background Image with Zoom Effect on Hover */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute h-full w-full object-cover object-center transition-transform duration-500 ease-in-out group-hover:scale-110 z-10"
                    />
                    
                    {/* Gradient Overlay for Text Readability - 하단 그라데이션 강화 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20"></div>
                    
                    {/* Content Container */}
                    <div className="relative flex h-full flex-col p-4 text-card-foreground z-30 overflow-hidden">
                      {/* 헤더와 설명글을 함께 감싸서 호버 시 올라가도록 */}
                      <div className="absolute bottom-0 left-0 right-0 transform translate-y-0 group-hover:-translate-y-20 transition-transform duration-300 ease-in-out">
                        {/* 헤더 (제목) - 기본 상태에서 카드 가장 아래에 위치 */}
                        <div className="p-4 space-y-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                          </div>
                        </div>

                        {/* Overview - 호버 시 아래에서 올라오면서 표시 */}
                        <div className="absolute top-full left-0 right-0 px-4 pb-6 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-in-out">
                          <div className="space-y-2 pt-2 border-t border-white/20">
                            <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center text-xs text-white/80 mt-2">
                              Read more{" "}
                              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="mt-4 flex justify-center gap-2">
          {items.map((_, index) => {
            // 무한 루프를 위해 현재 슬라이드 인덱스를 items 길이로 나눈 나머지 사용
            const normalizedIndex = currentSlide % items.length;
            return (
              <button
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  normalizedIndex === index ? "bg-primary" : "bg-primary/20"
                }`}
                onClick={() => carouselApi?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { Gallery4 };
