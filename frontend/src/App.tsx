import { useState } from "react";
import { Editor } from "./editor/Editor";
import { Home } from "./home/Home";

type View = "home" | "studio";

export default function App() {
  const [view, setView] = useState<View>("home");

  if (view === "studio") {
    return <Editor />;
  }

  return <Home onPlanRoom={() => setView("studio")} />;
}
