import metascraper from "metascraper";

// 1. Vendor Specific Rules (Priority)
import amazon from "metascraper-amazon";
import bluesky from "metascraper-bluesky";
import instagram from "metascraper-instagram";
import soundcloud from "metascraper-soundcloud";
import spotify from "metascraper-spotify";
import telegram from "metascraper-telegram";
import tiktok from "metascraper-tiktok";
import uol from "metascraper-uol";
import x from "metascraper-x";
import youtube from "metascraper-youtube";

// 2. Core/Generic Rules
import audio from "metascraper-audio";
import author from "metascraper-author";
import date from "metascraper-date";
import description from "metascraper-description";
import feed from "metascraper-feed";
import image from "metascraper-image";
import lang from "metascraper-lang";
import logoFavicon from "metascraper-logo-favicon";
import logo from "metascraper-logo";
import manifest from "metascraper-manifest";
import publisher from "metascraper-publisher";
import title from "metascraper-title";
import urlRule from "metascraper-url";
import video from "metascraper-video";
import type { Data } from "./types";
import { ca } from "zod/v4/locales";
import { normUrl } from "./cache";

// Initialize the scraper with all rules
const scraper = metascraper([
  // Vendors first
  amazon(),
  bluesky(),
  instagram(),
  soundcloud(),
  spotify(),
  telegram(),
  tiktok(),
  uol(),
  x(),
  youtube(),

  // Generic fallbacks
  audio(),
  author(),
  date(),
  description(),
  feed(),
  image(),
  lang(),
  logoFavicon(),
  logo(),
  manifest(),
  publisher(),
  title(),
  urlRule(),
  video(),
]);

export function getCanonicalFromHTML(html: string): string | null {
  let canonical: string | null = null;

  new HTMLRewriter()
    .on('link[rel="canonical"]', {
      element(el) {
        canonical = el.getAttribute("href");
      },
    })
    .transform(new Response(html));

  return canonical;
}

export async function parseHTML(url: string, html: string): Promise<Data> {
  const metadata = await scraper({ html, url });
  const data: Data = metadata;

  const { canonical_url, oembed_url } = extractDiscoveryLinks(html);
  if (canonical_url) data.canonical_url = canonical_url;
  if (oembed_url) data.oembed_url = oembed_url;

  if (oembed_url) {
    try {
      const oRes = await fetch(oembed_url);
      data.oembed = await oRes.json();
    } catch (e) {}
  }

  return data;
}

function extractDiscoveryLinks(html: string) {
  let canonical_url: string | undefined;
  let oembed_url: string | undefined;

  new HTMLRewriter()
    .on('link[rel="canonical"]', {
      element(el) {
        canonical_url = el.getAttribute("href") ?? undefined;
      },
    })
    .on('link[type="application/json+oembed"]', {
      element(el) {
        oembed_url = el.getAttribute("href") ?? undefined;
      },
    })
    .transform(new Response(html));

  return { canonical_url, oembed_url };
}
