import { useEffect, useState, type ImgHTMLAttributes } from "react";

type ProtectedProfileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  token?: string | null;
};

function protectedObjectPath(source: string): string | null {
  try {
    const url = new URL(source, window.location.origin);
    const sameOriginOrCountercult = url.origin === window.location.origin
      || url.hostname === "countercult.network"
      || url.hostname === "www.countercult.network";
    if (!sameOriginOrCountercult) return null;

    if (url.pathname.startsWith("/api/storage/objects/")) {
      return `${url.pathname}${url.search}`;
    }
    if (url.pathname.startsWith("/objects/")) {
      return `/api/storage/objects/${url.pathname.slice("/objects/".length)}${url.search}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function ProtectedProfileImage({
  src,
  token,
  ...imageProps
}: ProtectedProfileImageProps) {
  const [displaySource, setDisplaySource] = useState<string | null>(src ?? null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const objectPath = src ? protectedObjectPath(src) : null;

    if (!src || !token || !objectPath) {
      setDisplaySource(src ?? null);
      return;
    }

    const controller = new AbortController();
    setDisplaySource(null);
    fetch(objectPath, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error("profile image unavailable");
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setDisplaySource(objectUrl);
      })
      .catch(() => {
        if (active) setDisplaySource(null);
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (!displaySource) return null;
  return <img {...imageProps} src={displaySource} />;
}
