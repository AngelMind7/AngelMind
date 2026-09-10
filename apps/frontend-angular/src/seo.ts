import { useEffect } from "react";

export type SeoMetadata = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
};

const siteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || "https://angelmind.app").replace(/\/$/, "");

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

export function applySeoMetadata(metadata: SeoMetadata) {
  if (typeof document === "undefined") return;
  const canonical = `${siteUrl}${metadata.path === "/" ? "/" : metadata.path}`;
  document.title = metadata.title;
  upsertMeta("name", "description", metadata.description);
  upsertMeta("name", "robots", "index,follow,max-image-preview:large");
  upsertMeta("property", "og:type", metadata.type ?? "website");
  upsertMeta("property", "og:site_name", "AngelMind");
  upsertMeta("property", "og:title", metadata.title);
  upsertMeta("property", "og:description", metadata.description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:locale", "id_ID");
  upsertMeta("name", "twitter:card", "summary");
  upsertMeta("name", "twitter:title", metadata.title);
  upsertMeta("name", "twitter:description", metadata.description);
  upsertCanonical(canonical);
}

export function useSeoMetadata(metadata: SeoMetadata) {
  useEffect(() => {
    applySeoMetadata(metadata);
  }, [metadata.description, metadata.path, metadata.title, metadata.type]);
}
