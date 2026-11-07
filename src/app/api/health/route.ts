import { NextResponse } from "next/server";

// Page de contrôle : /api/health indique si le site arrive à joindre Supabase.
// N'affiche jamais de clé, seulement "ok" ou le problème.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { app: "ok", supabase: "non configuré : variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ app: "ok", supabase: `erreur ${res.status} (clé ou URL incorrecte ?)` }, { status: 503 });
    }
    return NextResponse.json({ app: "ok", supabase: "ok" });
  } catch {
    return NextResponse.json({ app: "ok", supabase: "injoignable (URL incorrecte ?)" }, { status: 503 });
  }
}
