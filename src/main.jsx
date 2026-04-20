import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AICompanionApp from "../ai_companion_prototype.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AICompanionApp />
  </StrictMode>
);
