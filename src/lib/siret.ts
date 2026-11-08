/** Nettoie un SIRET saisi (espaces, points) et vérifie sa validité (clé de Luhn). */
export function normalizeSiret(input: string): string {
  return input.replace(/[\s.\-]/g, "");
}

export function isValidSiret(input: string): boolean {
  const siret = normalizeSiret(input);
  if (!/^\d{14}$/.test(siret)) return false;

  // Exception La Poste : la somme des chiffres doit être un multiple de 5.
  if (siret.startsWith("356000000")) {
    const sum = [...siret].reduce((s, d) => s + Number(d), 0);
    return sum % 5 === 0;
  }

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(siret[13 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
