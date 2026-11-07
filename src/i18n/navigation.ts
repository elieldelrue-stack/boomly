import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Liens et redirections qui conservent automatiquement la langue (/fr ou /en).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
