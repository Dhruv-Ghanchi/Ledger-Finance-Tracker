import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPremiumAccess } from "@/lib/premium";

export default function BatchReviewModal({ open, onOpenChange, initialEntries, categories, onSaved }) {
  const { dbUser } = useAuth();
  const isFreeUser = !hasPremiumAccess(dbUser);
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialEntries) {
      setEntries(initialEntries);
    }
  }, [open, initialEntries]);

  const expenseCategories = useMemo(() => {
    const uniqueNames = new Set();
    return (categories || [])
      .filter((c) => c.type === "expense")
      .filter((c) => !isFreeUser || c.is_preset)
      .filter((c) => {
        if (uniqueNames.has(c.name)) return false;
        uniqueNames.add(c.name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, isFreeUser]);

  const incomeCategories = useMemo(() => {
    const uniqueNames = new Set();
    return (categories || [])
      .filter((c) => c.type === "income")
      .filter((c) => !isFreeUser || c.is_preset)
      .filter((c) => {
        if (uniqueNames.has(c.name)) return false;
        uniqueNames.add(c.name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, isFreeUser]);

  const updateEntry = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    // Auto-clear category if type changes
    if (field === "type") {
      newEntries[index].category = "";
    }
    
    setEntries(newEntries);
  };

  const removeEntry = (index) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
    if (newEntries.length === 0) {
      onOpenChange(false);
    }
  };

  const handleSaveAll = async () => {
    // Validate all entries have category and valid amount
    const invalid = entries.findIndex(e => !e.category || !e.amount || e.amount <= 0);
    if (invalid !== -1) {
      toast.error(`Entry ${invalid + 1} is missing a category or amount.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/entries/import/confirm", { entries });
      toast.success(`Successfully imported ${res.data.inserted_count} entries!`);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save entries.");
    } finally {
      setLoading(false);
    }
  };

  if (!entries || entries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!loading) onOpenChange(val); }}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-[1000px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Imported Entries</DialogTitle>
            <DialogDescription>
              We found {entries.length} transaction(s). Please review and categorize them before saving.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-muted/20">
          <div className="space-y-4">
            {entries.map((entry, idx) => {
              const cats = entry.type === "expense" ? expenseCategories : incomeCategories;
              
              return (
                <div key={entry.id || idx} className="bg-card border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  
                  {/* Date & Amount (Staticish) */}
                  <div className="w-full sm:w-32 flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Date</p>
                    <Input 
                      type="date" 
                      value={entry.date} 
                      onChange={(e) => updateEntry(idx, "date", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  
                  <div className="w-full sm:w-28 flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Amount</p>
                    <Input 
                      type="number" 
                      value={entry.amount} 
                      onChange={(e) => updateEntry(idx, "amount", parseFloat(e.target.value) || 0)}
                      className="h-9 font-semibold"
                    />
                  </div>

                  {/* Type */}
                  <div className="w-full sm:w-28 flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Type</p>
                    <Select value={entry.type} onValueChange={(val) => updateEntry(idx, "type", val)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="w-full sm:w-48 flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Category</p>
                    <Select value={entry.category} onValueChange={(val) => updateEntry(idx, "category", val)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Note */}
                  <div className="w-full flex-1 min-w-[200px]">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Note / Merchant</p>
                    <Input 
                      value={entry.note} 
                      onChange={(e) => updateEntry(idx, "note", e.target.value)}
                      placeholder="e.g. Coffee"
                      className="h-9"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="pt-5 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive h-9 w-9"
                      onClick={() => removeEntry(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-card flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {entries.length} entry{entries.length !== 1 && 's'} ready to import.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll} disabled={loading} className="min-w-[120px]">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
