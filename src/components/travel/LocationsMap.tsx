"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type LeafletMapType from "./LeafletMap";

// La carte ne s'affiche que dans le navigateur (Leaflet a besoin de "window").
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-cream-200" />,
});

export function LocationsMap(props: ComponentProps<typeof LeafletMapType>) {
  return <LeafletMap {...props} />;
}
