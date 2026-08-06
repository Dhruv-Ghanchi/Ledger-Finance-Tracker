import React from "react";
import { formatINR, MONTH_LABELS_SHORT } from "@/lib/format";
import { fyLabel } from "@/lib/fy";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function YearlySummaryTab({ yearly, fyStart }) {
  const rows = yearly?.rows || [];
  const totals = yearly?.totals || {};

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100 fill-mode-both">
      <div className="overline mb-1">Yearly Summary</div>
      <h3 className="font-display text-2xl font-semibold tracking-tight mb-5">{fyLabel(fyStart)}</h3>

      <div className="bg-card border border-border rounded-md overflow-hidden hover-lift overflow-x-auto w-full scrollbar-none" data-testid="yearly-summary">
        <Table className="data-table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Month</TableHead>
              <TableHead className="text-right text-personal">Personal Income</TableHead>
              <TableHead className="text-right text-personal">Personal Expense</TableHead>
              <TableHead className="text-right text-personal">Personal Net</TableHead>
              <TableHead className="text-right text-business">Business Income</TableHead>
              <TableHead className="text-right text-business">Business Expense</TableHead>
              <TableHead className="text-right text-business">Business Net</TableHead>
              <TableHead className="text-right">Total Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.year}-${r.month}`} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs">
                  {MONTH_LABELS_SHORT[r.month - 1]} {String(r.year).slice(-2)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-green-600">
                  {r.personal_income ? formatINR(r.personal_income) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive">
                  {r.personal_expense ? formatINR(r.personal_expense) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">
                  {r.personal_income || r.personal_expense ? formatINR(r.personal_net, { sign: true }) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-green-600">
                  {r.business_income ? formatINR(r.business_income) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive">
                  {r.business_expense ? formatINR(r.business_expense) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">
                  {r.business_income || r.business_expense ? formatINR(r.business_net, { sign: true }) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                  {r.total_income || r.total_expense ? formatINR(r.total_net, { sign: true }) : "—"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell className="font-display font-semibold text-sm">FY Total</TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-green-600">
                {formatINR(totals.personal_income || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-destructive">
                {formatINR(totals.personal_expense || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                {formatINR(totals.personal_net || 0, { sign: true })}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-green-600">
                {formatINR(totals.business_income || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-destructive">
                {formatINR(totals.business_expense || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                {formatINR(totals.business_net || 0, { sign: true })}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                {formatINR(totals.total_net || 0, { sign: true })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}