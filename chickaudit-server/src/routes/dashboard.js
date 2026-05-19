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
    const startingFlock = Number(process.env.STARTING_FLOCK ?? 200);

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
    ] = await Promise.all([
      // Eggs today
      pool.query(
        "select eggs_collected from daily_logs where log_date = $1",
        [today]
      ),
      // Eggs yesterday
      pool.query(
        "select eggs_collected from daily_logs where log_date = $1",
        [yesterday]
      ),
      // Revenue this month
      pool.query(
        "select coalesce(sum(amount_etb), 0) as total from sales where sale_date >= $1",
        [monthStart]
      ),
      // Expenses this month
      pool.query(
        "select coalesce(sum(amount_etb), 0) as total from expenses where expense_date >= $1",
        [monthStart]
      ),
      // Deaths this month
      pool.query(
        "select coalesce(sum(deaths), 0) as total from daily_logs where log_date >= $1",
        [monthStart]
      ),
      // All-time deaths (for flock count)
      pool.query(
        "select coalesce(sum(deaths), 0) as total from daily_logs"
      ),
      // Last 7 days egg production
      pool.query(`
        select
          gs.day::date as date,
          coalesce(dl.eggs_collected, 0) as count
        from generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        ) as gs(day)
        left join daily_logs dl on dl.log_date = gs.day::date
        order by gs.day
      `),
      // Recent 10 entries across all tables (union)
      pool.query(`
        select id, 'sale' as type,
               concat(quantity::int, ' ', type) as description,
               amount_etb as amount,
               u.full_name as recorded_by_name,
               sale_date as date
        from sales s join users u on u.id = s.recorded_by

        union all

        select id, 'expense' as type,
               category as description,
               amount_etb as amount,
               u.full_name as recorded_by_name,
               expense_date as date
        from expenses e join users u on u.id = e.recorded_by

        union all

        select id, 'log' as type,
               concat(eggs_collected, ' eggs collected') as description,
               null as amount,
               u.full_name as recorded_by_name,
               log_date as date
        from daily_logs dl join users u on u.id = dl.logged_by

        union all

        select id, 'health' as type,
               concat(event_type, ': ', details) as description,
               null as amount,
               u.full_name as recorded_by_name,
               event_date as date
        from health_events h join users u on u.id = h.recorded_by

        order by date desc
        limit 10
      `),
    ]);

    res.json({
      eggs_today: todayLog.rows[0]?.eggs_collected ?? 0,
      eggs_yesterday: yesterdayLog.rows[0]?.eggs_collected ?? 0,
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
