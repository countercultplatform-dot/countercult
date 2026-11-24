import { useEffect, useRef, useState } from "react";

export type ExchangePhoto = {
  src: string;
  alt: string;
  position?: "center" | "top" | "bottom";
};

type ExchangePhotoSlideshowProps = {
  photos: ExchangePhoto[];
  label: string;
  className?: string;
  aspect?: "wide" | "portrait";
  linkImages?: boolean;
  testId?: string;
  accessToken?: string;
};

export function ExchangePhotoSlideshow({
  photos,
  label,
  className = "",
  aspect = "wide",
  linkImages = false,
  testId,
  accessToken,
}: ExchangePhotoSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [sourceFailed, setSourceFailed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const currentIndex = photos.length ? activeIndex % photos.length : 0;
  const activePhoto = photos[currentIndex];
  const source = activePhoto?.src ?? "";
  const privateObjectPath = source.startsWith("/api/storage/objects/")
    ? source
    : source.startsWith("/objects/")
      ? `/api/storage${source}`
      : null;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSourceFailed(false);
    if (!source) {
      setResolvedSrc(null);
      return;
    }
    if (!privateObjectPath) {
      setResolvedSrc(source);
      return;
    }
    setResolvedSrc(null);
    if (!accessToken) {
      setSourceFailed(true);
      return;
    }
    fetch(privateObjectPath, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => {
        if (!response.ok) throw new Error("Exchange photo unavailable");
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSourceFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, privateObjectPath, accessToken]);

  if (photos.length === 0) return null;
  const goTo = (index: number) => {
    setActiveIndex((index + photos.length) % photos.length);
  };
  const image = (
    <img
      src={resolvedSrc ?? undefined}
      alt={activePhoto.alt}
      style={{ objectPosition: activePhoto.position ?? "center" }}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );

  return (
    <div
      className={`exchange-photo-slideshow exchange-photo-slideshow-${aspect} ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-testid={testId}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        const endX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (startX === null || endX === undefined) return;
        const distance = endX - startX;
        if (Math.abs(distance) < 45 || photos.length < 2) return;
        goTo(currentIndex + (distance < 0 ? 1 : -1));
      }}
    >
      <div className="exchange-photo-slideshow-frame">
        {sourceFailed ? (
          <div className="exchange-photo-unavailable" role="status">photo unavailable</div>
        ) : !resolvedSrc ? (
          <div className="exchange-photo-loading" aria-label="Loading photo" />
        ) : linkImages ? (
          <a
            className="exchange-photo-slideshow-image-link"
            href={resolvedSrc ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open photo ${currentIndex + 1} of ${photos.length}: ${activePhoto.alt}`}
          >
            {image}
          </a>
        ) : image}
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="exchange-photo-slideshow-arrow exchange-photo-slideshow-previous"
            aria-label="Previous photo"
            onClick={() => goTo(currentIndex - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="exchange-photo-slideshow-arrow exchange-photo-slideshow-next"
            aria-label="Next photo"
            onClick={() => goTo(currentIndex + 1)}
          >
            ›
          </button>
          <div className="exchange-photo-slideshow-controls">
            <span className="exchange-photo-slideshow-count" aria-live="polite">
              {currentIndex + 1} / {photos.length}
            </span>
            <div className="exchange-photo-slideshow-dots" aria-label="Choose a photo">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.src}-${index}`}
                  type="button"
                  className={`exchange-photo-slideshow-dot ${index === currentIndex ? "is-active" : ""}`}
                  aria-label={`Show photo ${index + 1}`}
                  aria-current={index === currentIndex ? "true" : undefined}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
