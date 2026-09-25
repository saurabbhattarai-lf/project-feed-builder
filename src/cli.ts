import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadProjects } from "./parser.js";
import { renderFeed } from "./renderer.js";

const input = process.argv[2] ?? "examples/projects";
const output = process.argv[3] ?? "dist/projects.json";
const feed = renderFeed(await loadProjects(input));
await mkdir(path.dirname(output), { recursive: true });;
await writeFile(output, `${JSON.stringify(feed, null, 2)}\n`);
console.log(`wrote ${feed.projects.length} projects to ${output}`);;;
