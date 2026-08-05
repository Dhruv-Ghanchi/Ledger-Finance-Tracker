import React from "react";
import { formatINR, MONTH_LABELS_LONG } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function ScopePanel({ title, tone, data }) {
  const income = data?.income || 0;
  const expense = data?.expense || 0;
  const net = income - expense;
  const byCat = Object.entries(data?.by_category || {})
    .map(([name, v]) => ({
      name,
      income: v.income || 0,
      expense: v.expense || 0,
      net: (v.income || 0) - (v.expense || 0),
    }))
    .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

  const accent = tone === "personal" ? "border-l-[3px] border-personal" : "border-l-[3px] border-business";
  const label = tone === "personal" ? "text-personal" : "text-business";

  return (
    <div className={`bg-card border border-border rounded-md hover-lift animate-in fade-in slide-in-from-bottom-2 duration-300 ${accent}`}>
      <div className="p-6 pb-4">
        <div className={`overline ${label}`}>{title}</div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Income</div>
            <div className="font-mono text-lg font-semibold text-green-600 mt-1">{formatINR(income)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Expense</div>
            <div className="font-mono text-lg font-semibold text-destructive mt-1">{formatINR(expense)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Net</div>
            <div className="font-mono text-lg font-semibold text-foreground mt-1">
              {formatINR(net, { sign: true })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        {byCat.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No entries.</div>
        ) : (
          <Table className="data-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCat.map((c) => (
                <TableRow key={c.name} className="hover:bg-muted/40">
                  <TableCell className="text-sm">{c.name}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-green-600">
                    {c.income ? formatINR(c.income) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">
                    {c.expense ? formatINR(c.expense) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">
                    {formatINR(c.net, { sign: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default function MonthlySummaryTab({ monthly, year, month }) {
  return (
    <div>
      <div className="overline mb-1">Monthly Summary</div>
      <h3 className="font-display text-2xl font-semibold tracking-tight mb-5">
        {MONTH_LABELS_LONG[month - 1]} {year}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="monthly-summary">
        <ScopePanel title="Personal" tone="personal" data={monthly?.personal} />
        <ScopePanel title="Business" tone="business" data={monthly?.business} />
      </div>
    </div>
  );
}