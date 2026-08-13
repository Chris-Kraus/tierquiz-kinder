import "./styles/global.css";
import { renderStartScreen } from "./screens/start.js";

// App-Einstiegspunkt: rendert den Start-Bildschirm (siehe src/screens/start.js).
// Weitere Bildschirme (Frage/Ergebnis) folgen in den jeweiligen Stories.

const app = document.querySelector("#app");

renderStartScreen(app);
