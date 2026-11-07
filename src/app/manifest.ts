import type { MetadataRoute } from "next";

// Rend le site "installable" sur mobile (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boomly",
    short_name: "Boomly",
    description: "Consigne à bagages chez les commerçants partenaires",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
