import "./styles.css";
import { MechanicsApp } from "./app/MechanicsApp";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found.");
}

const app = new MechanicsApp(root);
app.mount();
