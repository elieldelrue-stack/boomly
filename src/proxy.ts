import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const intl = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intl(request);
  return updateSession(request, response);
}

export const config = {
  // Toutes les pages sauf l'API, les fichiers internes de Next.js et les fichiers statiques.
  matcher: "/((?!api|auth|_next|_vercel|.*\\..*).*)",
};
