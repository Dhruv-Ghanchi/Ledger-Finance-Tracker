import React, { useMemo, useState } from "react";
import { formatINR, formatLongDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DailyEntriesTab({ entries, categories, onEdit, onDeleted }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("all");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (scope !== "all" && e.scope !== scope) return false;
      if (type !== "all" && e.type !== type) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!e.category.toLowerCase().includes(s) && !(e.note || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [entries, q, scope, type]);

  const del = async (id) => {
    try {
      await api.delete(`/entries/${id}`);
      toast.success("Entry deleted");
      onDeleted?.();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-[380px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search category or note…"
            className="pl-9 h-9"
            data-testid="entries-search"
          />
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="h-9 w-[140px]" data-testid="filter-scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px]" data-testid="filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs font-mono text-muted-foreground">
          {filtered.length} of {entries.length}
        </div>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <Table className="data-table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="entries-tbody">
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  No entries. Add one from the top-right.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id} className="hover:bg-muted/40" data-testid={`entry-row-${e.id}`}>
                <TableCell className="font-mono text-xs">{formatLongDate(e.date)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${
                      e.scope === "personal" ? "bg-personal-soft" : "bg-business-soft"
                    }`}
                  >
                    {e.scope}
                  </span>
                </TableCell>
                <TableCell className="text-xs uppercase tracking-widest">
                  {e.type === "income" ? (
                    <span className="text-business">▲ Income</span>
                  ) : (
                    <span className="text-personal">▼ Expense</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{e.category}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                  {e.note}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${
                    e.type === "income" ? "text-business" : "text-foreground"
                  }`}
                >
                  {e.type === "expense" ? "-" : "+"}
                  {formatINR(e.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEdit(e)}
                      data-testid={`edit-${e.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          data-testid={`delete-${e.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {formatLongDate(e.date)} · {e.category} · {formatINR(e.amount)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => del(e.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`confirm-delete-${e.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}