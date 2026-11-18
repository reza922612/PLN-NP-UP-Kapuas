import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink, Loader2, MapPin, Navigation } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

interface ResolvedPlaceInfo {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  googleMapsURI: string | null;
}

export interface UnitLocationMapProps {
  unitName: string;
  region: string;
  mapShareUrl: string;
  searchQueries: string[];
  addressHint?: string;
}

const isQuotaError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err || '');
  const upper = msg.toUpperCase();
  return (
    upper.includes('429') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('QUOTA')
  );
};

interface MapInnerProps extends UnitLocationMapProps {}

const UnitLocationMapInner: React.FC<MapInnerProps> = ({
  unitName,
  region,
  mapShareUrl,
  searchQueries,
  addressHint,
}) => {
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const [markerRef, marker] = useAdvancedMarkerRef();

  const [placeInfo, setPlaceInfo] = useState<ResolvedPlaceInfo | null>(null);
  const [resolving, setResolving] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);
  const [infoOpen, setInfoOpen] = useState<boolean>(true);

  useEffect(() => {
    if (
      apiStatus === APILoadingStatus.AUTH_FAILURE ||
      apiStatus === APILoadingStatus.FAILED
    ) {
      setFailed(true);
      setResolving(false);
    }
  }, [apiStatus]);

  useEffect(() => {
    if (!placesLib) return;

    let cancelled = false;
    const queries = Array.from(
      new Set([
        ...searchQueries,
        ...(addressHint ? [`${unitName} ${addressHint}`] : []),
      ].filter(Boolean))
    );

    const resolvePlace = async () => {
      setResolving(true);
      setFailed(false);

      for (const textQuery of queries) {
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery,
            fields: ['displayName', 'formattedAddress', 'location', 'googleMapsURI', 'id'],
            language: 'id',
            region: 'id',
            maxResultCount: 1,
          });

          const match = places?.[0];
          if (match?.location) {
            if (!cancelled) {
              setPlaceInfo({
                id: match.id || textQuery,
                displayName: match.displayName || unitName,
                formattedAddress: match.formattedAddress || region,
                location: {
                  lat: match.location.lat(),
                  lng: match.location.lng(),
                },
                googleMapsURI: match.googleMapsURI ?? null,
              });
              setInfoOpen(true);
              setResolving(false);
            }
            return;
          }
        } catch (err) {
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (!cancelled) {
            setFailed(true);
            setResolving(false);
          }
          return;
        }
      }

      if (!cancelled) {
        setFailed(true);
        setResolving(false);
      }
    };

    void resolvePlace();
    return () => {
      cancelled = true;
    };
  }, [placesLib, unitName, region, addressHint, searchQueries.join('|')]);

  if (resolving && !placeInfo && !failed) {
    return (
      <div className="h-[280px] sm:h-[320px] w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 flex flex-col items-center justify-center gap-2.5 text-center p-6">
        <Loader2 size={24} className="animate-spin text-[#0072BC] dark:text-[#72C8F1]" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Memuat peta lokasi {unitName} dari Google Maps Platform...
        </p>
      </div>
    );
  }

  if (failed || !placeInfo) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
            <MapPin size={19} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{unitName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {addressHint || region}
            </p>
          </div>
        </div>
        <a
          href={mapShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors shrink-0"
        >
          <span>Buka di Google Maps</span>
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${placeInfo.location.lat},${placeInfo.location.lng}`
  )}`;

  return (
    <div className="space-y-3">
      <div className="h-[280px] sm:h-[320px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative">
        <GoogleMap
          defaultCenter={placeInfo.location}
          defaultZoom={16}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={true}
          zoomControl={true}
        >
          <AdvancedMarker
            ref={markerRef}
            position={placeInfo.location}
            title={placeInfo.displayName}
            onClick={() => setInfoOpen((prev) => !prev)}
          >
            <Pin background="#0072BC" borderColor="#173B65" glyphColor="#F9D423" scale={1.15} />
          </AdvancedMarker>

          {infoOpen && marker && (
            <InfoWindow
              anchor={marker}
              maxWidth={270}
              onCloseClick={() => setInfoOpen(false)}
            >
              <div className="p-1 space-y-1.5 text-slate-800">
                <p className="text-xs font-extrabold text-[#173B65] leading-snug">
                  {placeInfo.displayName}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {placeInfo.formattedAddress}
                </p>
                <div className="pt-1 flex items-center gap-3">
                  <a
                    href={mapShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#0072BC] hover:underline inline-flex items-center gap-1"
                  >
                    Buka di Google Maps
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <MapPin size={16} className="text-[#0072BC] dark:text-[#72C8F1] mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {placeInfo.displayName}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {placeInfo.formattedAddress}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {placeInfo.location.lat.toFixed(6)}, {placeInfo.location.lng.toFixed(6)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#0072BC] hover:text-[#0072BC] dark:hover:text-[#72C8F1] transition-colors"
          >
            <Navigation size={13} />
            Petunjuk Arah
          </a>
          <a
            href={mapShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors"
          >
            <span>Lihat di Google Maps</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};

const UnitLocationMap: React.FC<UnitLocationMapProps> = (props) => {
  if (!API_KEY) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
            <MapPin size={19} />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{props.unitName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {props.addressHint || props.region}
            </p>
          </div>
        </div>
        <a
          href={props.mapShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors shrink-0"
        >
          <span>Buka di Google Maps</span>
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={['marker', 'places']}
      language="id"
      region="ID"
      version="weekly"
    >
      <UnitLocationMapInner {...props} />
    </APIProvider>
  );
};

export default UnitLocationMap;
