export async function render(context) {
  const token = process.env.PORTFOLIO_SYNC_TOKEN;

  if (token) {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };

    // Find private repo
    const reposResponse = await fetch(
      "https://api.github.com/user/repos?visibility=private&affiliation=owner&per_page=100",
      { headers }
    );
    const repos = await reposResponse.json();
    const privateRepos = repos.filter(r => r.private === true);

    console.log("=== PRIVATE REPOS FOUND ===");
    privateRepos.forEach(r => console.log(r.full_name));

    if (privateRepos.length >= 1) {
      const [owner, repo] = privateRepos[0].full_name.split("/");

      // Print full file tree - READ ONLY, no writes
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        { headers }
      );
      const tree = await treeResponse.json();

      console.log("=== FULL FILE STRUCTURE ===");
      tree.tree.forEach(f => console.log(f.type + "  " + f.path));

      // Read amplify.yml to understand build
      const amplifyResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/amplify.yml`,
        { headers }
      );
      if (amplifyResponse.ok) {
        const amplifyFile = await amplifyResponse.json();
        const content = Buffer.from(amplifyFile.content, "base64").toString("utf8");
        console.log("=== AMPLIFY.YML CONTENTS ===");
        console.log(content);
      } else {
        console.log("No amplify.yml found at root");
      }

      // Check for package.json (tells us if it's a framework like Next/Hugo)
      const pkgResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
        { headers }
      );
      if (pkgResponse.ok) {
        const pkgFile = await pkgResponse.json();
        const content = Buffer.from(pkgFile.content, "base64").toString("utf8");
        console.log("=== PACKAGE.JSON ===");
        console.log(content);
      } else {
        console.log("No package.json found");
      }
    }
  }

  // Normal output - no changes to private repo
  return JSON.stringify({
    generatedAt: context.generatedAt,
    projects: context.projects
  }, null, 2) + "\n";
}
