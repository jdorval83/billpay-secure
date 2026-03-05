"use client";

import { useEffect } from "react";

export default function Favicon() {
  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((data) => {
        const logoUrl: string | null = data?.business?.logo_url ?? null;
        if (!logoUrl) return;

        const setFavicon = (href: string) => {
          let link =
            document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
            document.createElement("link");
          link.rel = "icon";
          link.href = href;
          if (!link.parentNode) {
            document.head.appendChild(link);
          }
        };

        setFavicon(logoUrl);
      })
      .catch(() => {
        // ignore; keep default browser icon
      });
  }, []);

  return null;
}
