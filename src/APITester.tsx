import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRef, type FormEvent } from "react";

export function APITester() {
  const responseInputRef = useRef<HTMLTextAreaElement>(null);

  const testEndpoint = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      console.log("send");
      const form = e.currentTarget;
      const formData = new FormData(form);
      const urls = (formData.get("urls") as string).split("\n");
      const res = await fetch("/api/meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      console.log(data);
      responseInputRef.current!.value = JSON.stringify(data, null, 2);
    } catch (error) {
      console.log(error);
      responseInputRef.current!.value = String(error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={testEndpoint} className="flex items-center gap-2">
        <Label htmlFor="endpoint" className="sr-only">
          Endpoint
        </Label>
        <Textarea
          id="urls"
          name="urls"
          className="max-w-xl overflow-auto text-nowrap"
          defaultValue={
            "https://www.nytimes.com/2026/01/28/us/politics/minneapolis-ice-states.html\nhttps://www.tiktok.com/@nu.nl/video/7594477140406488353"
          }
          placeholder="https://www.nytimes.com/2026/01/28/us/politics/minneapolis-ice-states.html&#10;https://www.tiktok.com/@nu.nl/video/7594477140406488353"
        />
        <Button type="submit" variant="secondary">
          Send
        </Button>
      </form>
      <Label htmlFor="response" className="sr-only">
        Response
      </Label>
      <Textarea
        ref={responseInputRef}
        id="response"
        readOnly
        placeholder="Response will appear here..."
        className="min-h-[140px] font-mono resize-y"
      />
    </div>
  );
}
