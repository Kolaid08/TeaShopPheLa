'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultLat?: number;
  defaultLng?: number;
}

export default function MapPicker({ onLocationSelect, defaultLat = 10.762622, defaultLng = 106.660172 }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let L: any;
    
    // Import leaflet dynamically to avoid window undefined errors in Next.js
    import('leaflet').then((leaflet) => {
      L = leaflet.default || leaflet;
      
      // Fix missing icon issues
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      } catch (e) {
        // ignore
      }

      if (mapRef.current && !mapInstanceRef.current) {
        const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng]).addTo(map);

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });

        // Fix modal sizing issue by invalidating size after animation completes
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
}
