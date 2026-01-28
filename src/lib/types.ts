import type createMetascraper from "metascraper";

export type Method = "fetch" | "playwright";

export interface Result {
  data: createMetascraper.Metadata;
  method: Method;
  cache: boolean;
}
