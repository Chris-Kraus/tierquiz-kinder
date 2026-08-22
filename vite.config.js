import { defineConfig } from "vite";

// Minimale Vite-Konfiguration – die Defaults passen für dieses Projekt
// (statisches Multi-Page-Setup ist nicht nötig, ein einzelner Einstiegspunkt reicht).
// `base` ist auf den Subpfad des GitHub-Pages-Deployments gesetzt
// (https://chris-kraus.github.io/tierquiz-kinder/, kein eigener Domain-Root),
// damit die generierten Asset-Pfade im Produktions-Build korrekt auflösen.
export default defineConfig({
  base: "/tierquiz-kinder/",
});
