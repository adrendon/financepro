export const DEFAULT_PANEL_IMAGE =
  "https://images.unsplash.com/photo-1518186233392-c232efbf2373?auto=format&fit=crop&w=1200&q=80";

export function isValidImageUrl(value: string) {
  const url = value.trim();
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
