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

export async function getMetadata(url: string, html: string) {
  const metadata = await scraper({ html, url });
  return metadata;
}
