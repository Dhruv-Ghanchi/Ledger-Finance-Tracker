import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddDebtDialog({ open, onOpenChange, onSave, editingDebt = null }) {
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("to_pay");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      if (editingDebt) {
        setPersonName(editingDebt.person_name || "");
        setAmount(editingDebt.amount?.toString() || "");
        setType(editingDebt.type || "to_pay");
        setExpectedDate(editingDebt.expected_date || "");
        setNote(editingDebt.note || "");
      } else {
        setPersonName("");
        setAmount("");
        setType("to_pay");
        setExpectedDate(new Date().toISOString().split("T")[0]);
        setNote("");
      }
    }
  }, [open, editingDebt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!personName || !amount || !expectedDate) return;
    
    onSave({
      ...(editingDebt ? { id: editingDebt.id } : {}),
      person_name: personName,
      amount: parseFloat(amount),
      type,
      expected_date: expectedDate,
      note
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingDebt ? "Edit IOU" : "Add IOU"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Who?</Label>
              <Input
                placeholder="Person or Company Name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_pay">I Need To Pay</SelectItem>
                  <SelectItem value="to_collect">I Need To Collect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="Reason or additional details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDebt ? "Save Changes" : "Add IOU"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
