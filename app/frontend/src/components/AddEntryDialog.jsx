import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPremiumAccess } from "@/lib/premium";

export default function AddEntryDialog({ open, onOpenChange, categories, onSaved, editing }) {
  const { dbUser } = useAuth();
  const isFreeUser = !hasPremiumAccess(dbUser);
  const today = new Date().toISOString().slice(0, 10);
  const [scope, setScope] = useState("personal");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setScope(editing.scope);
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note || "");
    } else if (open) {
      setScope("personal");
      setType("expense");
      setAmount("");
      setCategory("");
      setDate(today);
      setNote("");
    }
    // eslint-disable-next-line
  }, [editing, open]);

  const filteredCats = useMemo(
    () => categories
      .filter((c) => c.type === type)
      .filter((c) => !isFreeUser || c.is_preset)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, type, isFreeUser]
  );

  useEffect(() => {
    if (category && !filteredCats.find((c) => c.name === category)) setCategory("");
  }, [type, filteredCats, isFreeUser]); // eslint-disable-line

  const save = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (!category) return toast.error("Choose a category");
    if (!date) return toast.error("Choose a date");
    setBusy(true);
    try {
      const payload = { date, amount: Number(amount), type, scope, category, note };
      let res;
      if (editing && editing.id) {
        res = await api.put(`/entries/${editing.id}`, payload);
        toast.success("Entry updated");
      } else {
        res = await api.post("/entries", payload);
        toast.success("Entry added");
      }
      onSaved?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-md" data-testid="add-entry-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            {editing ? "Edit Entry" : "New Entry"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Toggle Personal or Business, then choose income or expense.
          </DialogDescription>
        </DialogHeader>

        {/* Scope toggle */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => setScope("personal")}
            className={`h-11 rounded-md border text-sm font-medium transition-all ${scope === "personal" ? "bg-personal border-personal" : "bg-card border-border hover:border-foreground/40"}`}
            data-testid="scope-personal"
          >
            <span className={scope === "personal" ? "text-white" : "text-personal"}>Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setScope("business")}
            className={`h-11 rounded-md border text-sm font-medium transition-all ${scope === "business" ? "bg-business border-business" : "bg-card border-border hover:border-foreground/40"}`}
            data-testid="scope-business"
          >
            <span className={scope === "business" ? "text-white" : "text-business"}>Business</span>
          </button>
        </div>

        {/* Type toggle - Red for Expense, Green for Income */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`h-10 rounded-md border text-sm font-medium ${type === "expense" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-card border-border hover:border-foreground/40"}`}
            data-testid="type-expense"
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`h-10 rounded-md border text-sm font-medium ${type === "income" ? "bg-green-600 text-white border-green-600" : "bg-card border-border hover:border-foreground/40"}`}
            data-testid="type-income"
          >
            Income
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="overline">Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 font-mono h-10"
              data-testid="entry-amount"
            />
          </div>
          <div>
            <Label className="overline">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 font-mono h-10"
              data-testid="entry-date"
            />
          </div>
        </div>

        <div>
          <Label className="overline">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 h-10" data-testid="entry-category">
              <SelectValue placeholder={`Select ${type} category`} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredCats.map((c) => (
                <SelectItem key={c.id} value={c.name} data-testid={`cat-opt-${c.id}`}>
                  <div className="flex items-center justify-between w-full">
                    <span>{c.name}</span>
                    {isFreeUser && c.is_preset && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </SelectItem>
              ))}
              {isFreeUser && filteredCats.length > 0 && (
                <>
                  <SelectItem disabled className="border-t border-border my-1" />
                  <SelectItem 
                    onSelect={(e) => { e.preventDefault(); }}
                    className="text-center text-sm text-muted-foreground py-2"
                    disabled
                  >
                    Upgrade to Premium for custom categories
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {isFreeUser && (
            <p className="text-xs text-muted-foreground mt-1">Free plan: preset categories only</p>
          )}
        </div>

        <div>
          <Label className="overline">Note (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 min-h-[70px]"
            placeholder="Add a note…"
            data-testid="entry-note"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="entry-cancel">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            className="bg-foreground text-background hover:bg-foreground/90"
            data-testid="entry-save"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <>{editing ? "Save changes" : "Add entry"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}