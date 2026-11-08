// Réglages visuels de la vitrine : photos, villes, réseaux sociaux.
// Modifiez librement ce fichier pour changer les photos ou ajouter vos réseaux.

/** Photo Unsplash redimensionnée. Remplacez l'identifiant (photo-…) pour changer d'image. */
const unsplash = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const IMAGES = {
  // Hero : voyageur en ville (derrière la maquette de téléphone)
  heroTraveler: unsplash("photo-1488646953014-85cb44e25828", 900),
  // Étapes « Comment ça marche »
  stepBook: unsplash("photo-1512941937669-90a1b58e7e9c"), // réservation sur téléphone
  stepDrop: unsplash("photo-1554118811-1e0d58224f24"), // comptoir d'un café
  stepPick: unsplash("photo-1469854523086-cc02fe5d8800"), // voyageur qui repart
  // Bloc commerçants
  partner: unsplash("photo-1556742049-0cfed4f6a45d"),
};

/** Laissez vide ("") pour masquer un réseau dans le pied de page. */
export const SOCIALS = {
  instagram: "",
  tiktok: "",
  linkedin: "",
  facebook: "",
};

export const CONTACT_EMAIL = "contact@boomly.fr";

/** Villes proposées dans le pied de page (lien vers la recherche autour de ce point). */
export const CITIES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Lyon", lat: 45.764, lng: 4.8357 },
  { name: "Marseille", lat: 43.2965, lng: 5.3698 },
  { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
  { name: "Nice", lat: 43.7102, lng: 7.262 },
  { name: "Rouen", lat: 49.4431, lng: 1.0993 },
  { name: "Lille", lat: 50.6292, lng: 3.0573 },
];
