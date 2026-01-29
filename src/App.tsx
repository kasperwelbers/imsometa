import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APITester } from "./APITester";
import "./index.css";

export function App() {
  const loc = window.location;
  console.log(loc);

  return (
    <div className="container mx-auto p-0 md:p-8 relative z-10 w-screen max-w-4xl ">
      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-3xl font-bold">
            Get URL meta data
          </CardTitle>
          <CardDescription className="text-left text-gray-900">
            <p className="mb-2">
              Retrieve the metadata for a webpage by sending a GET request with
              the URL as parameter <br />
              (does not need to be escaped)
            </p>
            <code className="rounded px-[0.3rem] py-1 font-mono bg-primary/20">
              {loc.origin}
              /meta?url=
              <strong>https://website.com/page</strong>
            </code>{" "}
            <p className="mt-6 mb-2">
              By default the scraper:
              <ul className="list-disc ml-5 mt-1 mb-2">
                <li>
                  First tries to get the metadata with a fast, simple{" "}
                  <strong>fetch</strong> request
                </li>
                <li>
                  If fetch failed, it uses <strong>playwright</strong> to visit
                  the page with a headless browser
                </li>
              </ul>
              You can also use only fetch (lightweight) or only playwright
              (might get more data) by setting the 'method' URL parameter. Note
              that this parameter <b>has to go BEFORE</b> the <code>url=</code>{" "}
              parameter.
            </p>
            <code className="rounded  bg-primary/20 px-[0.3rem] py-[0.2rem] font-mono">
              {loc.origin}
              /meta?
              <strong>method=playwright</strong>
              &url=https://website.com/page
            </code>{" "}
            <p className="mt-6 mb-2">
              The retrieved metadata is automatically <b>cached</b>. You can set
              cache to <b>refresh</b> to force the scraper to get the latest
              data, or set it to <b>false</b> to turn it of entirely.
            </p>
            <code className="rounded  bg-primary/20 px-[0.3rem] py-[0.2rem] font-mono">
              {loc.origin}
              /meta?
              <strong>cache=refresh</strong>
              &url=https://website.com/page
            </code>{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <APITester />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
