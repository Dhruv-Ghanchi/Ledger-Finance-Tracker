import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import useSWR, { mutate as swrMutate } from "swr";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, LogOut, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { currentFYStart, recentFYs, fyLabel, fyMonths } from "@/lib/fy";
import { MONTH_LABELS_LONG } from "@/lib/format";
import AddEntryDialog from "@/components/AddEntryDialog";
import OverviewSection from "@/components/OverviewSection";
import DailyEntriesTab from "@/components/DailyEntriesTab";
import MonthlySummaryTab from "@/components/MonthlySummaryTab";
import YearlySummaryTab from "@/components/YearlySummaryTab";
import CategoriesManager from "@/components/CategoriesManager";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function Dashboard() {
  const { logout } = useAuth();
  const now = new Date();
  const [fyStart, setFyStart] = useState(currentFYStart());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catOpen, setCatOpen] = useState(false);

  const fyOptions = useMemo(() => recentFYs(6), []);

  const monthsInFY = useMemo(() => fyMonths(fyStart), [fyStart]);
  useEffect(() => {
    const inFY = monthsInFY.some((m) => m.month === month && m.year === year);
    if (!inFY) {
      setMonth(monthsInFY[0].month);
      setYear(monthsInFY[0].year);
    }
  }, [fyStart]); // eslint-disable-line

  const { data: categories = [] } = useSWR("/categories", fetcher);
  const { data: entries = [] } = useSWR(`/entries?fy_start=${fyStart}`, fetcher);
  const { data: monthly } = useSWR(`/summary/monthly?year=${year}&month=${month}`, fetcher);
  const { data: yearly } = useSWR(`/summary/yearly?fy_start=${fyStart}`, fetcher);

  const refreshAll = useCallback(() => {
    swrMutate("/categories");
    swrMutate(`/entries?fy_start=${fyStart}`);
    swrMutate(`/summary/monthly?year=${year}&month=${month}`);
    swrMutate(`/summary/yearly?fy_start=${fyStart}`);
  }, [fyStart, year, month]);

  const handleExport = async (format, scope = null) => {
    try {
      const params = new URLSearchParams({ fy_start: String(fyStart) });
      if (scope) params.set("scope", scope);
      const res = await api.get(`/export/${format}?${params.toString()}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance_${fyLabel(fyStart).replace(/\s/g, "_")}${scope ? `_${scope}` : ""}.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border" data-testid="sticky-header">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{fyLabel(fyStart)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Select value={String(fyStart)} onValueChange={(v) => setFyStart(Number(v))}>
              <SelectTrigger className="h-9 w-[140px] rounded-md" data-testid="fy-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map((f) => (
                  <SelectItem key={f} value={String(f)}>{fyLabel(f)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${year}-${month}`}
              onValueChange={(v) => {
                const [y, m] = v.split("-").map(Number);
                setYear(y); setMonth(m);
              }}
            >
              <SelectTrigger className="h-9 w-[170px] rounded-md" data-testid="month-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthsInFY.map((m) => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {MONTH_LABELS_LONG[m.month - 1]} {m.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-md" data-testid="export-btn">
                  <Download className="w-4 h-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Export {fyLabel(fyStart)}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("xlsx")} data-testid="export-xlsx-all">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel — All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="export-csv-all">
                  <FileText className="w-4 h-4 mr-2" /> CSV — All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("xlsx", "personal")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-personal" /> Excel — Personal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx", "business")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-business" /> Excel — Business
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => { setEditing(null); setAddOpen(true); }}
              size="sm"
              className="h-9 gap-2 rounded-md bg-foreground text-background hover:bg-foreground/90"
              data-testid="add-entry-btn"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-md" data-testid="menu-btn">
                  <span className="text-xs font-mono">···</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCatOpen(true)} data-testid="manage-categories-btn">
                  Manage Categories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" /> Lock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8" data-testid="dashboard-main">
        <OverviewSection
          monthly={monthly}
          yearly={yearly}
          year={year}
          month={month}
          fyStart={fyStart}
        />

        <div className="mt-10">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="bg-transparent p-0 h-auto border-b border-border rounded-none w-full justify-start gap-8">
              <TabsTrigger
                value="daily"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 font-display text-base tracking-tight"
                data-testid="tab-daily"
              >
                Daily Entries
              </TabsTrigger>
              <TabsTrigger
                value="monthly"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 font-display text-base tracking-tight"
                data-testid="tab-monthly"
              >
                Monthly Summary
              </TabsTrigger>
              <TabsTrigger
                value="yearly"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 font-display text-base tracking-tight"
                data-testid="tab-yearly"
              >
                Yearly Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              <DailyEntriesTab
                entries={entries}
                categories={categories}
                onEdit={(e) => { setEditing(e); setAddOpen(true); }}
                onDeleted={refreshAll}
              />
            </TabsContent>
            <TabsContent value="monthly" className="mt-6">
              <MonthlySummaryTab monthly={monthly} year={year} month={month} />
            </TabsContent>
            <TabsContent value="yearly" className="mt-6">
              <YearlySummaryTab yearly={yearly} fyStart={fyStart} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        editing={editing}
        onSaved={() => { setAddOpen(false); setEditing(null); refreshAll(); }}
      />
      <CategoriesManager
        open={catOpen}
        onOpenChange={setCatOpen}
        categories={categories}
        onChanged={refreshAll}
      />

      <footer className="max-w-[1400px] mx-auto px-6 py-8 text-[11px] uppercase tracking-widest text-muted-foreground">
        Ledger · single-user · v1
      </footer>
    </div>
  );
}