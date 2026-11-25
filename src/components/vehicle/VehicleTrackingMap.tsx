import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Car,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Gauge,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  Square,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { VehicleLoanRequest } from '../../types';
import { cn } from '../../lib/utils';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

// Default center: Pontianak / Kubu Raya (UP Kapuas area)
const DEFAULT_CENTER = { lat: -0.0263, lng: 109.3425 };

interface VehicleTrackingMapProps {
  loans: VehicleLoanRequest[];
  currentUserUid?: string;
  canManage: boolean;
  onPushTracking: (
    loan: VehicleLoanRequest,
    coords: {
      lat: number;
      lng: number;
      speedKmh?: number | null;
      heading?: number | null;
      accuracy?: number | null;
      label?: string | null;
    }
  ) => Promise<void>;
  onStopTracking: (loan: VehicleLoanRequest, markCompleted?: boolean) => Promise<void>;
}

const TrackingPolylineLayer: React.FC<{
  points: { lat: number; lng: number }[];
}> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.Polyline || points.length < 2) {
      return;
    }

    const polyline = new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: '#0072BC',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, points]);

  return null;
};

const CameraFocusHelper: React.FC<{
  target: { lat: number; lng: number } | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    const currentZoom = map.getZoom();
    if (!currentZoom || currentZoom < 12) {
      map.setZoom(14);
    }
  }, [map, target?.lat, target?.lng]);

  return null;
};

const VehicleMarkerItem: React.FC<{
  loan: VehicleLoanRequest;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ loan, isSelected, onSelect }) => {
  const [markerEl, setMarkerEl] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(isSelected);
  const markerRef = useCallback((m: google.maps.marker.AdvancedMarkerElement | null) => {
    setMarkerEl(m);
  }, []);

  useEffect(() => {
    setInfoOpen(isSelected);
  }, [isSelected]);

  if (loan.currentLat == null || loan.currentLng == null) return null;
  const position = { lat: loan.currentLat, lng: loan.currentLng };
  const isLive = loan.isTrackingActive || loan.status === 'Sedang Berpergian';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={`${loan.perintahJalan?.kendaraanNoPol || loan.loanNumber} - ${loan.tujuan}`}
        onClick={() => {
          onSelect();
          setInfoOpen(true);
        }}
      >
        <Pin
          background={isLive ? '#10b981' : '#0072BC'}
          borderColor="#173B65"
          glyphColor="#F9D423"
          scale={isSelected ? 1.28 : 1.05}
        />
      </AdvancedMarker>

      {isSelected && infoOpen && markerEl && (
        <InfoWindow anchor={markerEl} maxWidth={280} onCloseClick={() => setInfoOpen(false)}>
          <div className="p-1 space-y-1.5 text-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#173B65]">
                {loan.perintahJalan?.kendaraanNoPol || loan.loanNumber}
              </span>
              <span className="text-[10px] font-bold uppercase text-emerald-700">
                {loan.status}
              </span>
            </div>
            <p className="text-[11px] font-bold text-[#0072BC]">
              {loan.perintahJalan?.kendaraanNama || 'Kendaraan Dinas'}
            </p>
            <p className="text-[11px] text-slate-600">
              Driver: <span className="font-semibold">{loan.perintahJalan?.driverNama || '-'}</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Pemohon: <span className="font-semibold">{loan.pemohonNama}</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Tujuan: <span className="font-semibold">{loan.tujuan}</span>
            </p>
            {loan.lastLocationLabel && (
              <p className="text-[10px] text-slate-500">Lokasi: {loan.lastLocationLabel}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const TrackingMapCanvas: React.FC<{
  trackableLoans: VehicleLoanRequest[];
  selectedLoan: VehicleLoanRequest | null;
  onSelectLoanId: (id: string) => void;
}> = ({ trackableLoans, selectedLoan, onSelectLoanId }) => {
  const apiStatus = useApiLoadingStatus();
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (
      apiStatus === APILoadingStatus.AUTH_FAILURE ||
      apiStatus === APILoadingStatus.FAILED
    ) {
      setMapFailed(true);
    }
  }, [apiStatus]);

  const locatedLoans = useMemo(
    () => trackableLoans.filter((l) => l.currentLat != null && l.currentLng != null),
    [trackableLoans]
  );

  const focusPoint = useMemo(() => {
    if (selectedLoan?.currentLat != null && selectedLoan?.currentLng != null) {
      return { lat: selectedLoan.currentLat, lng: selectedLoan.currentLng };
    }
    if (locatedLoans[0]?.currentLat != null && locatedLoans[0]?.currentLng != null) {
      return { lat: locatedLoans[0].currentLat, lng: locatedLoans[0].currentLng };
    }
    return null;
  }, [selectedLoan, locatedLoans]);

  const selectedPath = useMemo(() => {
    if (!selectedLoan?.trackingHistory?.length) return [];
    return selectedLoan.trackingHistory.map((pt) => ({ lat: pt.lat, lng: pt.lng }));
  }, [selectedLoan?.trackingHistory]);

  if (mapFailed) {
    return (
      <div className="h-[360px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B172A] p-6 flex flex-col items-center justify-center text-center gap-3">
        <MapPin size={28} className="text-[#0072BC] dark:text-[#72C8F1]" />
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-extrabold text-[#173B65] dark:text-white">
            Peta Interaktif Tidak Dapat Dimuat
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Data koordinat GPS tetap tersinkron secara real-time di daftar kendaraan. Anda dapat membuka titik koordinat langsung di Google Maps.
          </p>
        </div>
        {focusPoint && (
          <a
            href={`https://www.google.com/maps?q=${focusPoint.lat},${focusPoint.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
          >
            Buka Koordinat di Google Maps
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="h-[380px] sm:h-[440px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative">
      <GoogleMap
        defaultCenter={focusPoint || DEFAULT_CENTER}
        defaultZoom={focusPoint ? 14 : 11}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        zoomControl={true}
      >
        <CameraFocusHelper target={focusPoint} />
        <TrackingPolylineLayer points={selectedPath} />
        {locatedLoans.map((loan) => (
          <VehicleMarkerItem
            key={loan.id}
            loan={loan}
            isSelected={selectedLoan?.id === loan.id}
            onSelect={() => loan.id && onSelectLoanId(loan.id)}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

const VehicleTrackingMap: React.FC<VehicleTrackingMapProps> = ({
  loans,
  currentUserUid,
  canManage,
  onPushTracking,
  onStopTracking,
}) => {
  const trackableLoans = useMemo(
    () =>
      loans.filter((l) =>
        ['Perintah Jalan Terbit', 'Sedang Berpergian', 'Disetujui', 'Selesai'].includes(l.status)
      ),
    [loans]
  );

  const activeTripLoans = useMemo(
    () =>
      trackableLoans.filter(
        (l) => l.status === 'Sedang Berpergian' || l.status === 'Perintah Jalan Terbit'
      ),
    [trackableLoans]
  );

  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [watchingLoanId, setWatchingLoanId] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [sendingCheckpoint, setSendingCheckpoint] = useState(false);
  const [checkpointNote, setCheckpointNote] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);

  const selectedLoan = useMemo(() => {
    return (
      trackableLoans.find((l) => l.id === selectedLoanId) ||
      activeTripLoans[0] ||
      trackableLoans[0] ||
      null
    );
  }, [trackableLoans, activeTripLoans, selectedLoanId]);

  const stopBrowserWatch = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatchingLoanId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const startBrowserGpsWatch = (loan: VehicleLoanRequest) => {
    if (!loan.id) return;
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Perangkat/browser ini tidak mendukung fitur Geolocation GPS.');
      return;
    }

    stopBrowserWatch();
    setWatchingLoanId(loan.id);
    lastSentAtRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        // Throttle writes to every 8 seconds
        if (now - lastSentAtRef.current < 8000) return;
        lastSentAtRef.current = now;

        const speedKmh =
          pos.coords.speed != null && !Number.isNaN(pos.coords.speed)
            ? Math.max(0, Math.round(pos.coords.speed * 3.6))
            : null;

        try {
          await onPushTracking(loan, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speedKmh,
            heading: pos.coords.heading ?? null,
            accuracy: pos.coords.accuracy ?? null,
            label: checkpointNote.trim() || `GPS Live (${loan.tujuan})`,
          });
        } catch {
          setGpsError('Gagal mengirim titik GPS terbaru ke server.');
        }
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? 'Izin akses lokasi ditolak oleh browser. Aktifkan izin lokasi atau gunakan input checkpoint manual.'
            : `Gagal membaca sinyal GPS (${err.message}).`
        );
        stopBrowserWatch();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  };

  const handleOneShotGpsCheckin = (loan: VehicleLoanRequest) => {
    if (!('geolocation' in navigator)) {
      setGpsError('Browser tidak mendukung GPS.');
      return;
    }
    setGpsError(null);
    setSendingCheckpoint(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await onPushTracking(loan, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speedKmh:
              pos.coords.speed != null && !Number.isNaN(pos.coords.speed)
                ? Math.round(pos.coords.speed * 3.6)
                : 0,
            accuracy: pos.coords.accuracy ?? null,
            label: checkpointNote.trim() || `Check-in Lokasi (${loan.tujuan})`,
          });
          setCheckpointNote('');
        } catch {
          setGpsError('Gagal menyimpan checkpoint lokasi.');
        } finally {
          setSendingCheckpoint(false);
        }
      },
      (err) => {
        setGpsError(`Gagal mengambil posisi saat ini: ${err.message}`);
        setSendingCheckpoint(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleManualCheckpoint = async (loan: VehicleLoanRequest) => {
    const latNum = Number(manualLat);
    const lngNum = Number(manualLng);
    if (
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      setGpsError('Masukkan koordinat Latitude (-90..90) dan Longitude (-180..180) yang valid.');
      return;
    }
    setGpsError(null);
    setSendingCheckpoint(true);
    try {
      await onPushTracking(loan, {
        lat: latNum,
        lng: lngNum,
        speedKmh: 0,
        label: checkpointNote.trim() || `Pos Pantau Manual (${loan.tujuan})`,
      });
      setCheckpointNote('');
    } finally {
      setSendingCheckpoint(false);
    }
  };

  const canControlSelected =
    selectedLoan &&
    (canManage || selectedLoan.createdByUid === currentUserUid) &&
    ['Perintah Jalan Terbit', 'Sedang Berpergian', 'Disetujui'].includes(selectedLoan.status);

  return (
    <div className="space-y-5">
      {gpsError && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-semibold">
          {gpsError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left/Top: Vehicle Trip Selector + Live Broadcast Control */}
        <div className="space-y-4">
          <div className="corporate-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100 flex items-center gap-2">
                <Radio size={15} className="text-emerald-500" />
                Kendaraan Terpantau ({activeTripLoans.length} Aktif)
              </h3>
            </div>

            {trackableLoans.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada perjalanan kendaraan dinas yang memiliki Perintah Jalan atau aktif.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {trackableLoans.map((loan) => {
                  const isSel = selectedLoan?.id === loan.id;
                  const isLive = loan.isTrackingActive || loan.status === 'Sedang Berpergian';
                  return (
                    <button
                      key={loan.id}
                      type="button"
                      onClick={() => loan.id && setSelectedLoanId(loan.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all space-y-1',
                        isSel
                          ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/20 border-[#0072BC]'
                          : 'bg-[#F8FBFD] dark:bg-[#0B172A] border-slate-200/80 dark:border-slate-800 hover:border-[#72C8F1]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#173B65] dark:text-white truncate">
                          {loan.perintahJalan?.kendaraanNoPol || loan.loanNumber}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold',
                            isLive
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : loan.status === 'Selesai'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          )}
                        >
                          {isLive ? 'Sedang Berpergian' : loan.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] truncate">
                        {loan.perintahJalan?.kendaraanNama || 'Menunggu Penetapan Unit'} · Tujuan:{' '}
                        {loan.tujuan}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          Driver: {loan.perintahJalan?.driverNama || '-'}
                        </span>
                        {loan.currentLat != null && (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                            GPS OK
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live GPS Broadcaster & Checkpoint Panel */}
          {selectedLoan && (
            <div className="corporate-card p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <p className="text-xs font-extrabold text-[#173B65] dark:text-white">
                    Telemetri &amp; Kontrol Tracking
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedLoan.perintahJalan?.kendaraanNoPol || selectedLoan.loanNumber}
                  </p>
                </div>
                {selectedLoan.isTrackingActive && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE GPS
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Gauge size={11} /> Kecepatan
                  </p>
                  <p className="font-extrabold text-[#173B65] dark:text-white tabular-nums mt-0.5">
                    {selectedLoan.currentSpeedKmh != null
                      ? `${selectedLoan.currentSpeedKmh} km/j`
                      : '0 km/j'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={11} /> Pembaruan
                  </p>
                  <p className="font-bold text-[#173B65] dark:text-white text-[11px] mt-0.5 truncate">
                    {selectedLoan.trackingUpdatedAt
                      ? formatDistanceToNow(new Date(selectedLoan.trackingUpdatedAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })
                      : 'Belum ada sinyal'}
                  </p>
                </div>
              </div>

              <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5">
                  <User size={13} className="text-[#0072BC]" />
                  <span>
                    Pemohon: <span className="font-bold">{selectedLoan.pemohonNama}</span>
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Car size={13} className="text-[#0072BC]" />
                  <span>
                    Driver:{' '}
                    <span className="font-bold">
                      {selectedLoan.perintahJalan?.driverNama || '-'}
                    </span>
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Compass size={13} className="text-[#0072BC]" />
                  <span className="font-mono tabular-nums">
                    {selectedLoan.currentLat != null && selectedLoan.currentLng != null
                      ? `${selectedLoan.currentLat.toFixed(5)}, ${selectedLoan.currentLng.toFixed(5)}`
                      : 'Koordinat belum dikirim'}
                  </span>
                </p>
              </div>

              {canControlSelected && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Kirim Lokasi Perjalanan (Dengan Izin Perangkat)
                  </p>
                  <input
                    type="text"
                    value={checkpointNote}
                    onChange={(e) => setCheckpointNote(e.target.value)}
                    placeholder="Catatan posisi / checkpoint (opsional)..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {watchingLoanId === selectedLoan.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          stopBrowserWatch();
                          await onStopTracking(selectedLoan, false);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                      >
                        <Square size={13} />
                        Hentikan Live GPS
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startBrowserGpsWatch(selectedLoan)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        <Navigation size={13} />
                        Mulai Live GPS
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={sendingCheckpoint}
                      onClick={() => handleOneShotGpsCheckin(selectedLoan)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] disabled:opacity-50"
                    >
                      {sendingCheckpoint ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <MapPin size={13} />
                      )}
                      Check-in GPS
                    </button>
                  </div>

                  {/* Manual Coordinate Fallback for Admin/PIC */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    <input
                      type="number"
                      step="any"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="Lat (-0.026)"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono outline-none"
                    />
                    <input
                      type="number"
                      step="any"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder="Lng (109.34)"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      disabled={sendingCheckpoint}
                      onClick={() => handleManualCheckpoint(selectedLoan)}
                      className="col-span-1 px-2 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-bold hover:bg-slate-900"
                    >
                      Set
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      stopBrowserWatch();
                      await onStopTracking(selectedLoan, true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={14} />
                    Selesaikan Perjalanan (Kembali ke Pool)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Interactive Google Map + Route Breadcrumbs */}
        <div className="xl:col-span-2 space-y-4">
          {!API_KEY ? (
            <div className="h-[380px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1A2E] p-6 flex flex-col items-center justify-center text-center gap-3">
              <MapPin size={28} className="text-[#0072BC] dark:text-[#72C8F1]" />
              <p className="text-sm font-extrabold text-[#173B65] dark:text-white">
                Peta Google Maps Menunggu Konfigurasi Kunci API
              </p>
              <p className="text-xs text-slate-500 max-w-md">
                Koordinat GPS kendaraan tetap tercatat dan dapat dipantau pada panel kiri serta dibuka di Google Maps.
              </p>
              {selectedLoan?.currentLat != null && selectedLoan?.currentLng != null && (
                <a
                  href={`https://www.google.com/maps?q=${selectedLoan.currentLat},${selectedLoan.currentLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold"
                >
                  Buka Lokasi di Google Maps
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          ) : (
            <APIProvider
              apiKey={API_KEY}
              libraries={['marker']}
              language="id"
              region="ID"
              version="weekly"
            >
              <TrackingMapCanvas
                trackableLoans={trackableLoans}
                selectedLoan={selectedLoan}
                onSelectLoanId={setSelectedLoanId}
              />
            </APIProvider>
          )}

          {/* Route Breadcrumb Timeline */}
          {selectedLoan && (selectedLoan.trackingHistory?.length || 0) > 0 && (
            <div className="corporate-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-[#173B65] dark:text-white uppercase tracking-wider">
                  Riwayat Titik Perjalanan ({selectedLoan.trackingHistory?.length} Titik)
                </h4>
                {selectedLoan.currentLat != null && selectedLoan.currentLng != null && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedLoan.currentLat},${selectedLoan.currentLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] inline-flex items-center gap-1 hover:underline"
                  >
                    Buka di Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {[...(selectedLoan.trackingHistory || [])].reverse().map((pt, idx) => (
                  <div
                    key={`${pt.recordedAt}_${idx}`}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#173B65] dark:text-slate-100 truncate">
                        {pt.note || 'Titik Pemantauan GPS'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                        {pt.speedKmh != null ? ` · ${pt.speedKmh} km/j` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold shrink-0 tabular-nums">
                      {new Date(pt.recordedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleTrackingMap;
