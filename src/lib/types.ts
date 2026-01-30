import type createMetascraper from "metascraper";

export type Method = "fetch" | "playwright" | "both";
export type Cache = "true" | "false" | "refresh";
export type Data = createMetascraper.Metadata & {
  canonical_url?: string;
  oembed_url?: string;
  oembed?: Record<string, unknown>;
};

export interface Result {
  data: Data | null;
  method: Method;
  cache: boolean;
}
