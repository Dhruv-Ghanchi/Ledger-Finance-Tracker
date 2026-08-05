import React from "react";
import { formatINR, MONTH_LABELS_LONG } from "@/lib/format";
import { fyLabel, fyMonths } from "@/lib/fy";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

function Kpi({ label, value, sub, tone = "default", testId }) {
  const toneClass = tone === "personal" ? "text-personal" : tone === "business" ? "text-business" : "text-foreground";
  return (
    <div className="bg-card border border-border p-6 rounded-md hover-lift" data-testid={testId}>
      <div className="overline">{label}</div>
      <div className={`font-mono text-2xl sm:text-3xl font-semibold tracking-tight mt-3 ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-2 font-mono">{sub}</div>}
    </div>
  );
}

export default function OverviewSection({ monthly, yearly, year, month, fyStart }) {
  const totals = monthly?.totals || { income: 0, expense: 0, net: 0 };
  const personal = monthly?.personal || { income: 0, expense: 0, net: 0 };
  const business = monthly?.business || { income: 0, expense: 0, net: 0 };

  // Bar chart: FY monthly income vs expense
  const barData = (yearly?.rows || []).map((r) => ({
    label: `${MONTH_LABELS_LONG[r.month - 1].slice(0, 3)}`,
    income: r.total_income,
    expense: r.total_expense,
  }));

  // Pie: expense categories for the selected month
  const catMap = {};
  const pushCat = (obj) => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v.expense > 0) catMap[k] = (catMap[k] || 0) + v.expense;
    });
  };
  pushCat(monthly?.personal?.by_category);
  pushCat(monthly?.business?.by_category);
  const pieData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const PIE_COLORS = ["#0F52BA", "#059669", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

  // Line: FY net trend
  const lineData = (yearly?.rows || []).map((r) => ({
    label: MONTH_LABELS_LONG[r.month - 1].slice(0, 3),
    net: r.total_net,
  }));

  const yearlyTotals = yearly?.totals || { total_income: 0, total_expense: 0, total_net: 0, personal_net: 0, business_net: 0 };

  return (
    <section data-testid="overview-section">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Overview</div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
            {MONTH_LABELS_LONG[month - 1]} {year}
          </h2>
        </div>
        <div className="hidden sm:block text-xs text-muted-foreground font-mono text-right">
          <div>{fyLabel(fyStart)} · 12 months</div>
          <div className="text-[11px] text-muted-foreground/80 mt-0.5">FY Expense: {formatINR(yearlyTotals.total_expense)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Total Income"
          value={formatINR(totals.income)}
          sub={`Monthly · P ${formatINR(personal.income, { compact: true })} · B ${formatINR(business.income, { compact: true })}`}
          testId="kpi-income"
        />
        <Kpi
          label="Total Expense"
          value={formatINR(totals.expense)}
          sub={`Monthly · P ${formatINR(personal.expense, { compact: true })} · B ${formatINR(business.expense, { compact: true })}`}
          testId="kpi-expense"
        />
        <Kpi
          label="Net · Personal"
          value={formatINR(personal.net, { sign: true })}
          tone="personal"
          sub={`${personal.net >= 0 ? "Surplus" : "Deficit"} (FY: ${formatINR(yearlyTotals.personal_net, { compact: true, sign: true })})`}
          testId="kpi-net-personal"
        />
        <Kpi
          label="Net · Business"
          value={formatINR(business.net, { sign: true })}
          tone="business"
          sub={`${business.net >= 0 ? "Surplus" : "Deficit"} (FY: ${formatINR(yearlyTotals.business_net, { compact: true, sign: true })})`}
          testId="kpi-net-business"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline">Monthly Income vs Expense</div>
              <div className="font-display text-lg font-semibold tracking-tight mt-1">{fyLabel(fyStart)}</div>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="#71717A" />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="#71717A"
                  tickFormatter={(v) => (v >= 1e5 ? `${(v/1e5).toFixed(0)}L` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v)}
                />
                <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: "#F4F4F5" }} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "IBM Plex Sans" }} iconType="square" />
                <Bar dataKey="income" name="Income" fill="#059669" radius={[2,2,0,0]} maxBarSize={22} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[2,2,0,0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-6">
          <div className="overline">Expense by Category</div>
          <div className="font-display text-lg font-semibold tracking-tight mt-1 mb-2">
            {MONTH_LABELS_LONG[month - 1]} {year}
          </div>
          <div className="h-[240px]">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No expenses this month</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {pieData.length > 0 && (
            <div className="mt-3 space-y-1 max-h-28 overflow-auto">
              {pieData.slice(0, 5).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="font-mono">{formatINR(p.value, { compact: true })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-md p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="overline">Net Trend</div>
            <div className="font-display text-lg font-semibold tracking-tight mt-1">{fyLabel(fyStart)}</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono">
            {yearly?.totals?.total_net >= 0
              ? <span className="text-green-600 flex items-center"><ArrowUpRight className="w-3 h-3" /> {formatINR(yearly?.totals?.total_net || 0, { compact: true })}</span>
              : <span className="text-destructive flex items-center"><ArrowDownRight className="w-3 h-3" /> {formatINR(yearly?.totals?.total_net || 0, { compact: true })}</span>}
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="#71717A" />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                stroke="#71717A"
                tickFormatter={(v) => (Math.abs(v) >= 1e5 ? `${(v/1e5).toFixed(0)}L` : Math.abs(v) >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v)}
              />
              <Tooltip formatter={(v) => formatINR(v, { sign: true })} />
              <Line type="monotone" dataKey="net" stroke="#09090B" strokeWidth={2} dot={{ r: 3, fill: "#09090B" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}