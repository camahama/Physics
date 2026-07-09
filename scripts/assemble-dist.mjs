import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "dist");

const apps = [
  {
    name: "landing",
    source: join(root, "apps", "landing", "dist"),
    destination: output,
  },
  {
    name: "electricity",
    source: join(root, "apps", "electricity", "dist"),
    destination: join(output, "electricity"),
  },
  {
    name: "mechanics",
    source: join(root, "apps", "mechanics", "dist"),
    destination: join(output, "mechanics"),
  },
  {
    name: "rainbow",
    source: join(root, "apps", "rainbow", "src", "rainbow_web", "dist"),
    destination: join(output, "rainbow"),
  },
  {
    name: "stirling",
    source: join(root, "apps", "stirling", "dist"),
    destination: join(output, "stirling"),
  },
  {
    name: "sundial",
    source: join(root, "apps", "sundial", "dist"),
    destination: join(output, "sundial"),
  },
];

rmSync(output, { recursive: true, force: true });

for (const app of apps) {
  if (!existsSync(app.source)) {
    throw new Error(`Missing build output for ${app.name}: ${app.source}`);
  }

  cpSync(app.source, app.destination, { recursive: true });
}
