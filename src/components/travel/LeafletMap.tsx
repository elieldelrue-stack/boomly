"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type MapPoint = { id: string; name: string; latitude: number; longitude: number; href: string; subtitle: string };

const pin = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${active ? "#1c1917" : "#ea580c"};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points, center }: { points: MapPoint[]; center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
    if (center) coords.push(center);
    if (coords.length === 0) return;
    if (coords.length === 1) map.setView(coords[0], 15);
    else if (center && points.length > 0) {
      // Centré sur la recherche, avec les points les plus proches visibles
      const nearest = coords.slice(0, Math.min(4, points.length));
      map.fitBounds(L.latLngBounds([...nearest, center]), { padding: [40, 40], maxZoom: 15 });
    } else map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
  }, [map, points, center]);
  return null;
}

export default function LeafletMap({
  points,
  center,
  activeId,
  linkLabel,
  className = "",
}: {
  points: MapPoint[];
  center?: [number, number];
  activeId?: string;
  linkLabel: string;
  className?: string;
}) {
  return (
    <MapContainer
      center={center ?? [46.6, 2.4]}
      zoom={center ? 14 : 5}
      scrollWheelZoom={false}
      className={`z-0 h-full w-full ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} center={center} />
      {center && <Marker position={center} icon={userIcon} />}
      {points.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pin(p.id === activeId)}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.subtitle}
            <br />
            <a href={p.href}>{linkLabel} →</a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
