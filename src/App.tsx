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
  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-3xl font-bold">
            Get URL meta data
          </CardTitle>
          <CardDescription>
            Or send a POST request with an array of urls to
            <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
              /api/meta
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
