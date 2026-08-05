import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Mail, Download, Calendar, FileSpreadsheet, FileText, ReceiptText } from "lucide-react";
import { format as formatDate, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export default function ExportModal({ open, onOpenChange, fyStart }) {
  const [format, setFormat] = useState("xlsx");
  const [scope, setScope] = useState("all");
  const [datePreset, setDatePreset] = useState("fy");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [emailDelivery, setEmailDelivery] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const presets = [
    { value: "fy", label: `Full FY (${fyStart}-${String(fyStart+1).slice(-2)})` },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7", label: "Last 7 Days" },
    { value: "last30", label: "Last 30 Days" },
    { value: "thisMonth", label: "This Month" },
    { value: "lastMonth", label: "Last Month" },
    { value: "thisYear", label: "This Year" },
    { value: "custom", label: "Custom Range" },
  ];

  useEffect(() => {
    if (open) {
      setCustomStart("");
      setCustomEnd("");
      setDatePreset("fy");
      setEmailDelivery(false);
      setEmail("");
    }
  }, [open]);

  const getDateRange = () => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { start: formatDate(startOfDay(now), "yyyy-MM-dd"), end: formatDate(endOfDay(now), "yyyy-MM-dd") };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: formatDate(startOfDay(yesterday), "yyyy-MM-dd"), end: formatDate(endOfDay(yesterday), "yyyy-MM-dd") };
      case "last7":
        return { start: formatDate(subDays(now, 6), "yyyy-MM-dd"), end: formatDate(endOfDay(now), "yyyy-MM-dd") };
      case "last30":
        return { start: formatDate(subDays(now, 29), "yyyy-MM-dd"), end: formatDate(endOfDay(now), "yyyy-MM-dd") };
      case "thisMonth":
        return { start: formatDate(startOfMonth(now), "yyyy-MM-dd"), end: formatDate(endOfMonth(now), "yyyy-MM-dd") };
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: formatDate(startOfMonth(lastMonth), "yyyy-MM-dd"), end: formatDate(endOfMonth(lastMonth), "yyyy-MM-dd") };
      case "thisYear":
        return { start: formatDate(startOfYear(now), "yyyy-MM-dd"), end: formatDate(endOfYear(now), "yyyy-MM-dd") };
      case "fy":
      default:
        return { start: `${fyStart}-04-01`, end: `${fyStart+1}-03-31` };
      case "custom":
        return { start: customStart, end: customEnd };
    }
  };

  const handleExport = async () => {
    const { start, end } = getDateRange();
    
    if (datePreset === "custom" && (!customStart || !customEnd)) {
      toast.error("Please select both start and end dates");
      return;
    }

    setBusy(true);
    try {
      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
      });
      if (scope !== "all") params.set("scope", scope);
      if (emailDelivery) params.set("email", email);

      const endpoint = emailDelivery ? `/export/email/${format}` : `/export/${format}`;
      const res = await api.get(`${endpoint}?${params.toString()}`, { responseType: "blob" });

      if (!emailDelivery) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        const scopeLabel = scope !== "all" ? `_${scope}` : "";
        const dateLabel = `${start}_to_${end}`;
        const ext = format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv";
        a.download = `finance_export${scopeLabel}_${dateLabel}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${format.toUpperCase()}`);
      } else {
        toast.success(`Report emailed to ${email}`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const formatIcons = {
    xlsx: <FileSpreadsheet className="w-4 h-4" />,
    csv: <FileText className="w-4 h-4" />,
    pdf: <ReceiptText className="w-4 h-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">Advanced Export</DialogTitle>
          <DialogDescription className="text-xs">
            Configure your export with date filters, format, and delivery options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Format Selection */}
          <div>
            <Label className="overline">Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-3 gap-2 mt-2">
              {["xlsx", "csv", "pdf"].map((f) => (
                <div key={f}>
                  <Label
                    htmlFor={`format-${f}`}
                    className={`flex flex-col items-center justify-center text-center gap-2 p-4 border-2 rounded-lg hover:border-foreground/40 transition-colors cursor-pointer ${format === f ? 'border-foreground bg-foreground/5' : 'border-border'}`}
                  >
                    <RadioGroupItem value={f} id={`format-${f}`} className="sr-only" disabled={emailDelivery && f === "csv"} />
                    {formatIcons[f]}
                    <span className="text-sm font-medium capitalize">{f}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {emailDelivery && format === "csv" && (
              <p className="text-xs text-destructive mt-1">CSV not available for email delivery. Please select Excel or PDF.</p>
            )}
          </div>

          <Separator />

          {/* Scope Selection */}
          <div>
            <Label className="overline">Scope</Label>
            <RadioGroup value={scope} onValueChange={setScope} className="grid grid-cols-3 gap-2 mt-2">
              {["all", "personal", "business"].map((s) => (
                <div key={s}>
                  <Label
                    htmlFor={`scope-${s}`}
                    className={`flex flex-col items-center justify-center text-center gap-2 p-4 h-full border-2 rounded-lg hover:border-foreground/40 transition-colors cursor-pointer ${scope === s ? 'border-foreground bg-foreground/5' : 'border-border'}`}
                  >
                    <RadioGroupItem value={s} id={`scope-${s}`} className="sr-only" />
                    <span className="text-sm font-medium capitalize">{s}</span>
                    <span className="text-xs text-muted-foreground">
                      {s === "all" ? "Both scopes" : s === "personal" ? "Personal only" : "Business only"}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Range Presets */}
          <div>
            <Label className="overline">Date Range</Label>
            <Select value={datePreset} onValueChange={setDatePreset} className="mt-2">
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="overline">Start Date</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 h-10"
                    max={customEnd || formatDate(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div>
                  <Label className="overline">End Date</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 h-10"
                    min={customStart}
                    max={formatDate(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Delivery Options */}
          <div>
            <Label className="overline">Delivery Method</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:border-foreground/40 cursor-pointer" 
                onClick={() => setEmailDelivery(false)}>
                <input
                  type="radio"
                  name="delivery"
                  checked={!emailDelivery}
                  onChange={() => setEmailDelivery(false)}
                  className="sr-only"
                />
                <Download className="w-5 h-5 text-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Download Instantly</div>
                  <div className="text-xs text-muted-foreground">File downloads directly to your device</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:border-foreground/40 cursor-pointer"
                onClick={() => setEmailDelivery(true)}>
                <input
                  type="radio"
                  name="delivery"
                  checked={emailDelivery}
                  onChange={() => setEmailDelivery(true)}
                  className="sr-only"
                />
                <Mail className="w-5 h-5 text-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Email Report</div>
                  <div className="text-xs text-muted-foreground">Send formatted report to your inbox</div>
                </div>
              </div>

              {emailDelivery && (
                <div className="mt-2">
                  <Label className="overline">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1 h-10"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={busy || (emailDelivery && format === "csv") || (emailDelivery && !email)}
            className="flex-1 bg-foreground text-background hover:bg-foreground/90"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <>{emailDelivery ? "Email Report" : "Download"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
