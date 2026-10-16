import type { Settings } from "./defaults";
import { telegramUrl } from "./format";

export type SocialKind = "instagram" | "facebook" | "youtube" | "tiktok" | "telegram" | "twitter";

export type SocialLink = { key: SocialKind; label: string; url: string };

/** Redes sociales configuradas en Ajustes (solo las que tienen enlace). */
export function socialLinks(s: Settings): SocialLink[] {
  const list: SocialLink[] = [
    { key: "instagram", label: "Instagram", url: s.instagram },
    { key: "facebook", label: "Facebook", url: s.facebook },
    { key: "youtube", label: "YouTube", url: s.youtube },
    { key: "tiktok", label: "TikTok", url: s.tiktok },
    { key: "telegram", label: "Telegram", url: telegramUrl(s.telegram) },
    { key: "twitter", label: "X", url: s.twitter },
  ];
  return list.filter((l) => l.url.trim() !== "");
}
