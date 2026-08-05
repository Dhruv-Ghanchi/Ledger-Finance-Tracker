import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import useSWR, { mutate as swrMutate } from "swr";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, UploadCloud, LogOut, FileSpreadsheet, FileText, User, Settings, Home, CreditCard, ReceiptText, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { currentFYStart, recentFYs, fyLabel, fyMonths } from "@/lib/fy";
import { MONTH_LABELS_LONG, getSubscriptionExpiry } from "@/lib/format";
import AddEntryDialog from "@/components/AddEntryDialog";
import OverviewSection from "@/components/OverviewSection";
import DailyEntriesTab from "@/components/DailyEntriesTab";
import MonthlySummaryTab from "@/components/MonthlySummaryTab";
import YearlySummaryTab from "@/components/YearlySummaryTab";
import CategoriesManager from "@/components/CategoriesManager";
import ExportModal from "@/components/ExportModal";
import ImportModal from "@/components/ImportModal";
import BatchReviewModal from "@/components/BatchReviewModal";
import AIChatAssistant from "@/components/AIChatAssistant";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function Dashboard() {
  const { logout, dbUser, currentUser } = useAuth();
  const now = new Date();
  const [fyStart, setFyStart] = useState(currentFYStart());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catOpen, setCatOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewEntries, setReviewEntries] = useState([]);

  const fyOptions = useMemo(() => recentFYs(10), []);
  const monthsInFY = useMemo(() => fyMonths(fyStart), [fyStart]);

  const { data: categories = [] } = useSWR("/categories", fetcher);
  const { data: entries = [] } = useSWR(`/entries?fy_start=${fyStart}`, fetcher);
  const { data: monthly } = useSWR(`/summary/monthly?year=${year}&month=${month}`, fetcher);
  const { data: yearly } = useSWR(`/summary/yearly?fy_start=${fyStart}`, fetcher);

  useEffect(() => {
    const inFY = monthsInFY.some((m) => m.month === month && m.year === year);
    if (!inFY) {
      const activeRow = yearly?.rows?.find((r) => r.total_income > 0 || r.total_expense > 0);
      if (activeRow) {
        setMonth(activeRow.month);
        setYear(activeRow.year);
      } else {
        setMonth(monthsInFY[0].month);
        setYear(monthsInFY[0].year);
      }
    }
  }, [fyStart, yearly]); // eslint-disable-line

  const focusDate = useCallback((dateStr) => {
    if (!dateStr) return;
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const [y, m] = parts;
      const targetFY = m >= 4 ? y : y - 1;
      setFyStart(targetFY);
      setYear(y);
      setMonth(m);
    }
  }, []);

  const refreshAll = useCallback((entryData) => {
    if (entryData?.date) {
      focusDate(entryData.date);
    }
    swrMutate("/categories");
    swrMutate(`/entries?fy_start=${fyStart}`);
    swrMutate(`/summary/monthly?year=${year}&month=${month}`);
    swrMutate(`/summary/yearly?fy_start=${fyStart}`);
  }, [fyStart, year, month, focusDate]);

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

  const handleInvoiceDownload = async (scope = null) => {
    try {
      const params = new URLSearchParams({ fy_start: String(fyStart) });
      if (scope) params.set("scope", scope);
      const res = await api.get(`/invoices/download?${params.toString()}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      const scopeLabel = scope ? `_${scope}` : "_consolidated";
      a.download = `ledger_invoice_${fyLabel(fyStart).replace(/\s/g, "_")}${scopeLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error("Invoice download failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border" data-testid="sticky-header">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{fyLabel(fyStart)}</div>
            </div>
          </Link>

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

            <Button
              onClick={() => setImportOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-md border-border"
              data-testid="import-btn"
            >
              <UploadCloud className="w-4 h-4" /> Import
            </Button>

            <Button
              onClick={() => setExportOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-md border-border"
              data-testid="advanced-export-btn"
            >
              <Download className="w-4 h-4" /> Export
            </Button>

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
                <Button variant="ghost" className="relative h-auto py-1.5 px-2 flex items-center gap-2.5 rounded-xl ml-2 hover:bg-muted" data-testid="menu-btn">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={dbUser?.profile_picture || currentUser?.photoURL || currentUser?.providerData?.[0]?.photoURL} alt={dbUser?.name || currentUser?.displayName || currentUser?.providerData?.[0]?.displayName || "User"} referrerPolicy="no-referrer" />
                    <AvatarFallback>{(dbUser?.name || currentUser?.displayName || currentUser?.providerData?.[0]?.displayName) ? (dbUser?.name || currentUser?.displayName || currentUser?.providerData?.[0]?.displayName).charAt(0).toUpperCase() : <User className="w-4 h-4"/>}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold flex items-center gap-1">
                      {dbUser?.name || currentUser?.displayName || currentUser?.providerData?.[0]?.displayName || "User"} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium capitalize">
                      Plan: {dbUser?.plan || "free"}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{dbUser?.name || currentUser?.displayName || currentUser?.providerData?.[0]?.displayName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{dbUser?.email || currentUser?.email || currentUser?.providerData?.[0]?.email}</p>
                    <div className="mt-2 text-xs font-semibold capitalize text-foreground">
                      Plan: {dbUser?.plan || "free"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Expires: {getSubscriptionExpiry(dbUser, currentUser)}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-testid="profile-settings-btn">
                  <Link to="/profile">
                    <Settings className="w-4 h-4 mr-2" /> Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-testid="subscription-btn">
                  <Link to="/subscription">
                    <CreditCard className="w-4 h-4 mr-2" /> Manage Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCatOpen(true)} data-testid="manage-categories-btn">
                  <Plus className="w-4 h-4 mr-2" /> Manage Categories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="dashboard-main">
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
        onSaved={(savedData) => { setAddOpen(false); setEditing(null); refreshAll(savedData); }}
      />
      <CategoriesManager
        open={catOpen}
        onOpenChange={setCatOpen}
        categories={categories}
        onChanged={refreshAll}
      />
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        fyStart={fyStart}
      />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onParsed={(data) => {
          setReviewEntries(data);
          setReviewOpen(true);
        }}
      />
      <BatchReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        initialEntries={reviewEntries}
        categories={categories}
        onSaved={() => refreshAll()}
      />
      <AIChatAssistant />
    </div>
  );
}
