/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { MapPin, Navigation, Settings, ShieldAlert, RefreshCw, Compass, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'loading';

// Component to update map center when location changes
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

export default function App() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<PermissionStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  const requestLocation = () => {
    setStatus('loading');
    if (!navigator.geolocation) {
      setError("Brauzeringiz GPS-ni qo'llab-quvvatlamaydi.");
      setStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
        setStatus('granted');
        setIsTracking(true);
      },
      (err) => {
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError("GPS ruxsati rad etildi. Iltimos, sozlamalar orqali ruxsat bering.");
        } else {
          setStatus('denied');
          setError("Joylashuvni aniqlashda xatolik yuz berdi.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Initial check
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'prompt') {
          setStatus('prompt');
        } else {
          setStatus('denied');
        }

        result.onchange = () => {
          if (result.state === 'granted') {
            requestLocation();
          } else {
            setStatus(result.state as PermissionStatus);
          }
        };
      });
    } else {
      requestLocation();
    }
  }, []);

  // Continuous tracking
  useEffect(() => {
    let watchId: number;
    if (isTracking && status === 'granted') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setAccuracy(pos.coords.accuracy);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, status]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">GPS Locator</h1>
        </div>
        <div className="flex items-center gap-4">
          {accuracy && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Aniqlik</span>
              <span className={`text-xs font-bold ${accuracy < 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                ±{Math.round(accuracy)} metr
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {status === 'granted' ? 'Jonli' : 'Oflayn'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col">
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Joylashuv aniqlanmoqda...</p>
            </motion.div>
          )}

          {status === 'denied' && (
            <motion.div
              key="denied"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">GPS Ruxsati Kerak</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Ilovadan foydalanish uchun GPS joylashuvni aniqlash ruxsatini berishingiz kerak. 
              </p>
              
              <div className="bg-slate-100 rounded-2xl p-6 w-full text-left mb-8">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                  <Settings className="w-4 h-4" /> Qanday yoqish mumkin?
                </h3>
                <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside">
                  <li>Brauzer manzili yonidagi qulf belgisini bosing.</li>
                  <li>"Joylashuv" (Location) ruxsatini yoqing.</li>
                  <li>Sahifani yangilang.</li>
                </ol>
              </div>

              <button
                onClick={requestLocation}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" /> Qayta urinish
              </button>
            </motion.div>
          )}

          {status === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Joylashuvni Aniqlash</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Sizning joriy joylashuvingizni xaritada ko'rsatishimiz uchun ruxsat bering.
              </p>
              <button
                onClick={requestLocation}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-200"
              >
                Ruxsat berish
              </button>
            </motion.div>
          )}

          {status === 'granted' && position && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 relative"
            >
              <MapContainer
                center={position}
                zoom={15}
                className="w-full h-full z-0"
                zoomControl={false}
              >
                {mapType === 'street' ? (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                )}
                
                {accuracy && (
                  <Circle 
                    center={position} 
                    radius={accuracy} 
                    pathOptions={{ 
                      fillColor: '#6366f1', 
                      fillOpacity: 0.15, 
                      color: '#6366f1', 
                      weight: 1,
                      dashArray: '5, 5'
                    }} 
                  />
                )}

                <Marker position={position}>
                  <Popup>
                    Siz shu yerdasiz! <br />
                    Aniqlik: ±{Math.round(accuracy || 0)}m
                  </Popup>
                </Marker>
                <ChangeView center={position} />
              </MapContainer>

              {/* Map Type Toggle */}
              <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
                <button
                  onClick={() => setMapType(prev => prev === 'street' ? 'satellite' : 'street')}
                  className="bg-white/90 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-xl flex items-center gap-2 hover:bg-white transition-all group"
                >
                  <div className={`p-2 rounded-lg transition-colors ${mapType === 'satellite' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 pr-2">
                    {mapType === 'street' ? 'Sputnik' : 'Xarita'}
                  </span>
                </button>
              </div>

              {/* Accuracy Warning for Desktop */}
              {accuracy && accuracy > 100 && (
                <div className="absolute top-6 left-6 z-[1000] max-w-[240px]">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl shadow-lg flex gap-3 items-start">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 mb-1">Past aniqlik</p>
                      <p className="text-[10px] text-amber-700 leading-tight">
                        Kompyuterda joylashuv IP orqali aniqlanishi mumkin. Aniqroq natija uchun telefoningizdan foydalaning yoki ilovani yangi oynada oching.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Info Overlay */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-[1000]">
                <div className="bg-white/90 backdrop-blur-md border border-white p-6 rounded-3xl shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Joriy Joylashuv</p>
                      <h3 className="text-lg font-bold text-slate-900">Sizning Koordinatalaringiz</h3>
                    </div>
                    <button 
                      onClick={requestLocation}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Kenglik (Lat)</p>
                      <p className="text-sm font-mono font-bold text-slate-700">{position[0].toFixed(6)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Uzunlik (Lng)</p>
                      <p className="text-sm font-mono font-bold text-slate-700">{position[1].toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
