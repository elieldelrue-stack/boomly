import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien reçu par e-mail (confirmation d'inscription) : ouvre la session puis redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/fr/partenaire";
  // Uniquement des redirections internes au site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/fr/partenaire";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const locale = next.startsWith("/en") ? "en" : "fr";
  return NextResponse.redirect(`${origin}/${locale}/partenaire/connexion?error=callback`);
}
