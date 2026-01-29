import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState, type FormEvent } from "react";
import { Switch } from "./components/ui/switch";
import type { Cache, Method } from "./lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

interface Payload {
  url: string;
  cache: Cache;
  method: Method;
}

export function APITester() {
  const [payload, setPayload] = useState<Payload>({
    url: "https://www.nytimes.com/2026/01/28/us/politics/minneapolis-ice-states.html",
    cache: "true",
    method: "both",
  });

  const getUrl = buildUrl(payload);
  const fullUrl = window.location.origin + getUrl;
  const responseInputRef = useRef<HTMLTextAreaElement>(null);

  const onSend = async function (e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    try {
      const res = await fetch(getUrl);
      const data = await res.json();
      responseInputRef.current!.value = JSON.stringify(data, null, 2);
    } catch (error) {
      responseInputRef.current!.value = String(error);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full ">
      <h4 className="mt-4 font-bold pb-0">Try it out here!</h4>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2 w-full">
          <Label htmlFor="endpoint" className="sr-only">
            Endpoint
          </Label>
          <Input
            id="url"
            name="url"
            className="overflow-auto text-nowrap w-full"
            value={payload.url}
            onChange={(e) => setPayload({ ...payload, url: e.target.value })}
          />
          <Button variant="default" onClick={(e) => onSend(e)}>
            Send
          </Button>
        </div>
        <div className="flex items-center gap-3 justify-start">
          <Select
            value={payload.method}
            onValueChange={(value) => setPayload({ ...payload, method: value })}
          >
            <SelectTrigger className="bg-primary/20 border-none">
              method = {payload.method}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fetch">Fetch</SelectItem>
              <SelectItem value="playwright">Playwright</SelectItem>
              <SelectItem value="both">Fetch or Playwright</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={payload.cache}
            onValueChange={(value) => setPayload({ ...payload, cache: value })}
          >
            <SelectTrigger className="bg-primary/20 border-none w-40">
              cache = {payload.cache}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
              <SelectItem value="refresh">Refresh</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="px-1">
        <a
          className="text-blue-800 break-all"
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {fullUrl}
        </a>
      </div>
      <Label htmlFor="response" className="sr-only">
        Response
      </Label>
      <Textarea
        ref={responseInputRef}
        id="response"
        readOnly
        placeholder="Response will appear here..."
        className="min-h-[140px] font-mono resize-y mt-4"
      />
    </div>
  );
}

function buildUrl(p: Payload) {
  const params: string[] = [];

  if (p.cache !== "true") params.push("cache=" + p.cache);
  if (p.method !== "both") params.push("method=" + p.method);
  if (p.url) params.push("url=" + p.url);

  return "/meta?" + params.join("&");
}
