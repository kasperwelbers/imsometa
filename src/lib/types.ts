import type createMetascraper from "metascraper";

export type Method = "fetch" | "playwright" | "both";
export type Cache = "true" | "false" | "refresh";

export interface Result {
  data: createMetascraper.Metadata;
  method: Method;
  cache: boolean;
}
