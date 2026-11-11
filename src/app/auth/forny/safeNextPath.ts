// Godtar bare en relativ sti inne i appen, så fornyingsruten ikke kan sende brukeren ut.
export function safeNextPath(value: string | null): string {
  if (!value) return "/";
  // Nettleseren fjerner tab og linjeskift i adresser, så "/\t/annen.no" ville blitt "//annen.no".
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  if (value.startsWith("/auth/forny")) return "/";
  return value;
}
