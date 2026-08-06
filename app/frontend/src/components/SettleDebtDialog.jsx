import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

export default function SettleDebtDialog({ open, onOpenChange, debt, onConfirm, categories = [] }) {
  const { dbUser } = useAuth();
  const isFreeUser = !dbUser || dbUser.plan === "free";
  const [scope, setScope] = useState("personal");
  const [category, setCategory] = useState("");

  const relevantCategories = useMemo(() => {
    const type = debt?.type === "to_pay" ? "expense" : "income";
    const uniqueNames = new Set();
    return categories
      .filter((c) => c.type === type)
      .filter((c) => !isFreeUser || c.is_preset)
      .filter((c) => {
        if (uniqueNames.has(c.name)) return false;
        uniqueNames.add(c.name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, isFreeUser, debt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category) return;
    onConfirm(debt.id, { scope, category });
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settle IOU</DialogTitle>
          <DialogDescription>
            This will mark the IOU as settled and automatically create an {debt.type === "to_pay" ? "Expense" : "Income"} entry for {debt.amount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {relevantCategories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!category}>
              Confirm Settle
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
