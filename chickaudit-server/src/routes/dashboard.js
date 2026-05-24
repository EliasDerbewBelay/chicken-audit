const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /dashboard
// Returns all data the dashboard page needs in a single round-trip
router.get("/", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";

    const isOwner = req.user.role === "owner";
    const userId = req.user.id;
    const limit = isOwner ? 10 : 7;

    const recentQuery = isOwner
      ? `
        select s.id, 'sale' as type,
               concat(s.quantity::int, ' ', s.type) as description,
               s.amount_etb as amount,
               u.full_name as recorded_by_name,
               s.sale_date as date,
               s.recorded_by
        from sales s join users u on u.id = s.recorded_by

        union all

        select e.id, 'expense' as type,
               e.category as description,
               e.amount_etb as amount,
               u.full_name as recorded_by_name,
               e.expense_date as date,
               e.recorded_by
        from expenses e join users u on u.id = e.recorded_by

        union all

        select dl.id, 'log' as type,
               concat(dl.eggs_collected, ' eggs collected') as description,
               null as amount,
               u.full_name as recorded_by_name,
               dl.log_date as date,
               dl.logged_by as recorded_by
        from daily_logs dl join users u on u.id = dl.logged_by

        union all

        select h.id, 'health' as type,
               concat(h.event_type, ': ', h.details) as description,
               null as amount,
               u.full_name as recorded_by_name,
               h.event_date as date,
               h.recorded_by
        from health_events h join users u on u.id = h.recorded_by

        order by date desc
        limit $1
      `
      : `
        select s.id, 'sale' as type,
               concat(s.quantity::int, ' ', s.type) as description,
               s.amount_etb as amount,
               u.full_name as recorded_by_name,
               s.sale_date as date,
               s.recorded_by
        from sales s join users u on u.id = s.recorded_by
        where s.recorded_by = $1

        union all

        select e.id, 'expense' as type,
               e.category as description,
               e.amount_etb as amount,
               u.full_name as recorded_by_name,
               e.expense_date as date,
               e.recorded_by
        from expenses e join users u on u.id = e.recorded_by
        where e.recorded_by = $1

        union all

        select dl.id, 'log' as type,
               concat(dl.eggs_collected, ' eggs collected') as description,
               null as amount,
               u.full_name as recorded_by_name,
               dl.log_date as date,
               dl.logged_by as recorded_by
        from daily_logs dl join users u on u.id = dl.logged_by
        where dl.logged_by = $1

        union all

        select h.id, 'health' as type,
               concat(h.event_type, ': ', h.details) as description,
               null as amount,
               u.full_name as recorded_by_name,
               h.event_date as date,
               h.recorded_by
        from health_events h join users u on u.id = h.recorded_by
        where h.recorded_by = $1

        order by date desc
        limit $2
      `;

    const recentParams = isOwner ? [limit] : [userId, limit];

    // Run all queries in parallel
    const [
      todayLog,
      yesterdayLog,
      revenueMonth,
      expensesMonth,
      deathsMonth,
      totalDeaths,
      last7Days,
      recentEntries,
      startingFlockSetting,
    ] = await Promise.all([
      // Eggs today
      pool.query(
        `select coalesce(sum(eggs_collected), 0) as eggs_collected, count(id) as count_logs from daily_logs where log_date = $1 ${isOwner ? '' : 'and logged_by = $2'}`,
        isOwner ? [today] : [today, userId]
      ),
      // Eggs yesterday
      pool.query(
        `select coalesce(sum(eggs_collected), 0) as eggs_collected from daily_logs where log_date = $1 ${isOwner ? '' : 'and logged_by = $2'}`,
        isOwner ? [yesterday] : [yesterday, userId]
      ),
      // Revenue this month
      pool.query(
        `select coalesce(sum(amount_etb), 0) as total from sales where sale_date >= $1 ${isOwner ? '' : 'and recorded_by = $2'}`,
        isOwner ? [monthStart] : [monthStart, userId]
      ),
      // Expenses this month
      pool.query(
        `select coalesce(sum(amount_etb), 0) as total from expenses where expense_date >= $1 ${isOwner ? '' : 'and recorded_by = $2'}`,
        isOwner ? [monthStart] : [monthStart, userId]
      ),
      // Deaths this month
      pool.query(
        `select coalesce(sum(deaths), 0) as total from daily_logs where log_date >= $1 ${isOwner ? '' : 'and logged_by = $2'}`,
        isOwner ? [monthStart] : [monthStart, userId]
      ),
      // All-time deaths (for flock count)
      pool.query(
        `select coalesce(sum(deaths), 0) as total from daily_logs ${isOwner ? '' : 'where logged_by = $1'}`,
        isOwner ? [] : [userId]
      ),
      // Last 7 days egg production
      pool.query(
        `
        select
          gs.day::date as date,
          coalesce(sum(dl.eggs_collected), 0) as count
        from generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        ) as gs(day)
        left join daily_logs dl on dl.log_date = gs.day::date ${isOwner ? "" : "and dl.logged_by = $1"}
        group by gs.day
        order by gs.day
      `,
        isOwner ? [] : [userId],
      ),
      pool.query(recentQuery, recentParams),
      pool.query("select value from settings where key = 'starting_flock'"),
    ]);

    const startingFlockVal = startingFlockSetting.rows[0]?.value;
    const fallbackFlock = Number(process.env.STARTING_FLOCK ?? 200);
    const startingFlock = startingFlockVal ? Number(startingFlockVal) : fallbackFlock;

    res.json({
      eggs_today: Number(todayLog.rows[0]?.eggs_collected ?? 0),
      eggs_yesterday: Number(yesterdayLog.rows[0]?.eggs_collected ?? 0),
      today_log_submitted: Number(todayLog.rows[0]?.count_logs ?? 0) > 0,
      revenue_month: Number(revenueMonth.rows[0].total),
      expenses_month: Number(expensesMonth.rows[0].total),
      deaths_month: Number(deathsMonth.rows[0].total),
      active_chickens: startingFlock - Number(totalDeaths.rows[0].total),
      last_7_days_eggs: last7Days.rows.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      recent_entries: recentEntries.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
