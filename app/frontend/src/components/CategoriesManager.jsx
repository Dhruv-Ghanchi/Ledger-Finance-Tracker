import React, { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CategoriesManager({ open, onOpenChange, categories, onChanged }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const g = { expense: [], income: [] };
    categories.forEach((c) => g[c.type].push(c));
    g.expense.sort((a, b) => a.name.localeCompare(b.name));
    g.income.sort((a, b) => a.name.localeCompare(b.name));
    return g;
  }, [categories]);

  const add = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    setBusy(true);
    try {
      await api.post("/categories", { name: name.trim(), type });
      setName("");
      toast.success("Category added");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Deleted");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[440px]" data-testid="categories-sheet">
        <SheetHeader>
          <SheetTitle className="font-display tracking-tight text-2xl">Categories</SheetTitle>
          <SheetDescription>Preset categories are locked. Add custom ones below.</SheetDescription>
        </SheetHeader>

        <div className="flex items-end gap-2 mt-6">
          <div className="flex-1">
            <label className="overline">New Category</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coffee"
              className="mt-1 h-9"
              data-testid="new-category-name"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[120px] h-9" data-testid="new-category-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={add}
            disabled={busy}
            size="sm"
            className="h-9 bg-foreground text-background hover:bg-foreground/90"
            data-testid="add-category"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-8 space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
          {[
            ["expense", "Expense Categories"],
            ["income", "Income Categories"],
          ].map(([key, label]) => (
            <div key={key}>
              <div className="overline mb-2">
                {label} · {grouped[key].length}
              </div>
              <div className="border border-border rounded-md divide-y divide-border">
                {grouped[key].map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {c.is_preset && <Lock className="w-3 h-3 text-muted-foreground" />}
                      <span>{c.name}</span>
                    </div>
                    {!c.is_preset && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => del(c.id)}
                        data-testid={`del-cat-${c.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}