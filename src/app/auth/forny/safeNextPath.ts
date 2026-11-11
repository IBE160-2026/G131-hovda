// Godtar bare en relativ sti inne i appen, så fornyingsruten ikke kan sende brukeren ut.
export function safeNextPath(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  if (value.startsWith("/auth/forny")) return "/";
  return value;
}
