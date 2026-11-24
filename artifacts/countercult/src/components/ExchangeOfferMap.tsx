import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type { ResidencyOffer } from "@workspace/api-client-react";
import { getApproximateMapLocation } from "@/lib/exchangeMapLocations";

const Globe = lazy(() => import("react-globe.gl"));

type ExchangeOfferMapProps = {
  offers: Pick<ResidencyOffer, "id" | "city" | "kind">[];
  selectedOfferId: number | null;
  onSelectOffer: (offerId: number) => void;
};

type OfferLocationGroup = {
  lat: number;
  lng: number;
  city: string;
  precision: "approximate" | "country";
  offers: Pick<ResidencyOffer, "id" | "city" | "kind">[];
};

function canRenderGlobe(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function escapeTooltipText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function ExchangeOfferMap({
  offers,
  selectedOfferId,
  onSelectOffer,
}: ExchangeOfferMapProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [globeReady, setGlobeReady] = useState(false);
  const [webglAvailable] = useState(canRenderGlobe);

  const mappedOffers = useMemo(
    () => offers.flatMap((offer) => {
      const location = getApproximateMapLocation(offer.city);
      return location ? [{
        offer,
        lat: location.lat,
        lng: location.lng,
        city: location.label,
        precision: location.precision,
      }] : [];
    }),
    [offers],
  );
  const locationGroups = useMemo(() => {
    const groups = new Map<string, OfferLocationGroup>();
    for (const { offer, lat, lng, city, precision } of mappedOffers) {
      const key = `${lat},${lng}`;
      const group = groups.get(key);
      if (group) {
        group.offers.push(offer);
        if (precision === "country") {
          group.city = city;
          group.precision = "country";
        }
      } else {
        groups.set(key, { lat, lng, city, precision, offers: [offer] });
      }
    }
    return Array.from(groups.values());
  }, [mappedOffers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const bounds = container.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(bounds.width)),
        height: Math.max(1, Math.round(bounds.height)),
      });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    updateSize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globeReady || !globe) return;

    const controls = globe.controls();
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.32;
    controls.enableDamping = true;
    globe.pointOfView({ lat: 22, lng: 12, altitude: 2.25 }, 0);
    return () => {
      controls.autoRotate = false;
    };
  }, [globeReady]);

  const selectGroup = (group: OfferLocationGroup) => {
    const selectedOffer = group.offers.find((offer) => offer.id === selectedOfferId) ?? group.offers[0];
    if (!selectedOffer) return;
    onSelectOffer(selectedOffer.id);
    globeRef.current?.pointOfView(
      { lat: group.lat, lng: group.lng, altitude: 2.1 },
      650,
    );
  };

  return (
    <section
      aria-label="3D globe of broad Exchange listing locations"
      className="exchange-map-card overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
    >
      <div className="exchange-map-heading flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 sm:px-5">
        <div>
          <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.13em]">Exchange map</h4>
          <p className="mt-1 max-w-[24rem] text-[10px] font-medium leading-snug text-black/70">
            Every post makes the Exchange more useful. Share what you can offer so another artist can find it.
          </p>
        </div>
        <span aria-label={`${locationGroups.length} mapped city areas`} className="rounded-full bg-[#f3f3ee] px-3 py-1.5 font-mono text-[9px] font-black">
          {locationGroups.length} {locationGroups.length === 1 ? "place" : "places"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="exchange-globe relative h-[min(54vh,34rem)] min-h-[18rem] w-full overflow-hidden bg-[#08090b] sm:min-h-[22rem]"
        role="region"
        aria-label="Interactive 3D globe. Markers identify approximate city or country areas, not exact addresses."
        onPointerEnter={() => {
          if (globeRef.current) globeRef.current.controls().autoRotate = false;
        }}
        onPointerLeave={() => {
          if (
            globeRef.current &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            globeRef.current.controls().autoRotate = true;
          }
        }}
      >
        {!webglAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center font-mono text-xs font-bold uppercase leading-relaxed text-black/60">
            This browser cannot display the 3D globe. The listings are still available.
          </div>
        ) : (
          <>
            {!globeReady && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#08090b] font-mono text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d]">
                loading the 3D globe…
              </div>
            )}
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[#08090b] font-mono text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d]">
                  loading the 3D globe…
                </div>
              }
            >
              <Globe
                ref={globeRef}
                width={size.width}
                height={size.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundColor="#08090b"
                showGraticules
                showAtmosphere
                atmosphereColor="#c6ff3d"
                atmosphereAltitude={0.12}
                pointsData={locationGroups}
                pointLat={(point) => (point as OfferLocationGroup).lat}
                pointLng={(point) => (point as OfferLocationGroup).lng}
                pointColor={(point) => (
                  (point as OfferLocationGroup).offers.some((offer) => offer.id === selectedOfferId)
                    ? "#df5d45"
                    : "#c6ff3d"
                )}
                pointRadius={(point) => (
                  (point as OfferLocationGroup).offers.some((offer) => offer.id === selectedOfferId)
                    ? 0.8
                    : 0.62
                )}
                pointAltitude={0.016}
                pointLabel={(point) => {
                  const group = point as OfferLocationGroup;
                  const count = group.offers.length;
                  const areaLabel = group.precision === "country" ? "country-level area" : "approximate area";
                  return `${escapeTooltipText(group.city)} · ${count} ${count === 1 ? "listing" : "listings"} · ${areaLabel}`;
                }}
                onPointClick={(point) => selectGroup(point as OfferLocationGroup)}
                onGlobeReady={() => setGlobeReady(true)}
              />
            </Suspense>
          </>
        )}
        {mappedOffers.length === 0 && webglAvailable && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-center font-mono text-[9px] font-bold uppercase leading-relaxed text-black/65">
            No broad map point is available for these city names. Listings remain in the list.
          </div>
        )}
      </div>
      {locationGroups.length > 0 && (
        <div className="exchange-globe-locations border-t border-black/10 px-3 py-3 sm:px-4">
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-black/55">
            select a place to highlight its listing
          </p>
          <div className="flex flex-wrap gap-1.5">
            {locationGroups.map((group) => {
              const selected = group.offers.some((offer) => offer.id === selectedOfferId);
              return (
                <button
                  key={`${group.lat},${group.lng}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectGroup(group)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 font-sans text-[10px] font-semibold capitalize tracking-normal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    selected
                      ? "border-black bg-black text-[#c6ff3d]"
                      : "border-black/15 bg-white text-black hover:border-black hover:bg-[#c6ff3d]"
                  }`}
                >
                  {group.city}
                  {group.offers.length > 1 && <span aria-label={`${group.offers.length} listings`}>{group.offers.length}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
