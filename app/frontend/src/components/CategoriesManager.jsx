import React, { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Lock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function CategoriesManager({ open, onOpenChange, categories, onChanged }) {
  const { dbUser } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [busy, setBusy] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isFreeUser = dbUser?.plan === "free" || dbUser?.plan === "trial";

  const grouped = useMemo(() => {
    const g = { expense: [], income: [] };
    categories.forEach((c) => g[c.type].push(c));
    g.expense.sort((a, b) => a.name.localeCompare(b.name));
    g.income.sort((a, b) => a.name.localeCompare(b.name));
    return g;
  }, [categories]);

  const add = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    
    if (isFreeUser) {
      setShowUpgradeModal(true);
      return;
    }
    
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

  const handleUpgradeClick = () => {
    setShowUpgradeModal(false);
    onOpenChange(false);
    window.location.href = "/pricing?auto_upgrade=monthly";
  };

  return (
    <>
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
                disabled={isFreeUser}
                data-testid="new-category-name"
              />
              {isFreeUser && (
                <p className="text-xs text-muted-foreground mt-1">Upgrade to Premium to create custom categories</p>
              )}
            </div>
            <Select value={type} onValueChange={setType} disabled={isFreeUser}>
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
              disabled={busy || isFreeUser}
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
                        <span className={c.is_preset && isFreeUser ? "text-muted-foreground" : ""}>{c.name}</span>
                      </div>
                      {!c.is_preset && !isFreeUser && (
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
                      {c.is_preset && isFreeUser && (
                        <span className="text-xs text-muted-foreground mr-2">Locked</span>
                      )}
                    </div>
                  ))}
                </div>
                {isFreeUser && grouped[key].length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={() => setShowUpgradeModal(true)}
                    data-testid={`upgrade-${key}`}
                  >
                    <Plus className="w-4 h-4" /> Add Custom Category
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
            <DialogTitle className="font-display text-2xl tracking-tight text-center">
              Premium Feature
            </DialogTitle>
            <DialogDescription className="text-center">
              Custom categories are available only for Premium subscribers.
              Upgrade to unlock unlimited custom categories and more features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2">
            <Button
              onClick={handleUpgradeClick}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              Upgrade to Premium
            </Button>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)} className="w-full">
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}