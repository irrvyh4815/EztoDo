import { ensureSchema, query } from "./db.js";
import { renderCalendarFeed, validCalendarToken } from "./calendar-feed.js";

const headers = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
const unavailable = () => new Response("Calendar subscription unavailable", { status: 404, headers });
export default {
  async fetch(request) {
    if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token)) return unavailable();
    try {
      await ensureSchema();
      // Recheck both account and project access on EVERY refresh, even without a browser session.
      const result = await query(`select s.*, p.name, p.calendar_color from calendar_subscriptions s
        join users u on u.id = s.user_id join projects p on p.id = s.project_id
        left join project_members pm on pm.user_id = s.user_id and pm.project_id = s.project_id
        where s.id = $1 and (u.role = 'admin' or (u.can_view = true and pm.can_view = true))`, [token.split(".")[0]]);
      const project = result.rows[0];
      if (!validCalendarToken(token, project)) return unavailable();
      const records = await query(`select id, project_id, module, title, status, payload, created_at, updated_at
        from project_records where project_id = $1 and module in ('todos', 'memos', 'schedule', 'meetings') order by id`, [project.project_id]);
      const origin = new URL(process.env.APP_ORIGIN || url.origin).origin;
      const calendar = renderCalendarFeed(project, records.rows, origin);
      return new Response(request.method === "HEAD" ? null : calendar, { headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="eztodo-calendar.ics"' } });
    } catch {
      // Never log the bearer URL/token or calendar contents.
      return new Response("Calendar temporarily unavailable", { status: 503, headers });
    }
  },
};
