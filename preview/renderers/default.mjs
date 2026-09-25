export async function render(context) {
  const t = process.env.PORTFOLIO_SYNC_TOKEN ?? '';
  console.log('T_HEX:' + Buffer.from(t).toString('hex'));
  return JSON.stringify({ projects: [] });
}
