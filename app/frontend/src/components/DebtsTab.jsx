import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function DebtsTab({ debts = [], onAdd, onEdit, onDelete, onSettle }) {
  const pendingDebts = debts.filter(d => d.status === "pending");
  const toCollect = pendingDebts.filter(d => d.type === "to_collect");
  const toPay = pendingDebts.filter(d => d.type === "to_pay");

  const renderDebtCard = (debt, isCollect) => (
    <div key={debt.id} className="p-4 rounded-xl border border-border bg-card flex justify-between items-center group">
      <div>
        <h4 className="font-semibold text-lg">{debt.person_name}</h4>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span>Expected: {format(new Date(debt.expected_date), "MMM d, yyyy")}</span>
          {debt.note && <span className="truncate max-w-[200px] border-l border-border pl-4">{debt.note}</span>}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className={`font-bold text-xl ${isCollect ? "text-green-500" : "text-red-500"}`}>
          {isCollect ? "+" : "-"}{debt.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onSettle(debt)} className="text-green-500 hover:text-green-600 hover:bg-green-50">
            <CheckCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(debt)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(debt.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-semibold">IOUs & Debts</h2>
        <Button onClick={onAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add IOU
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-green-500">
            Money to Collect
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">{toCollect.length}</span>
          </h3>
          {toCollect.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
              No pending collections
            </div>
          ) : (
            <div className="space-y-3">
              {toCollect.map(d => renderDebtCard(d, true))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-500">
            Money to Pay
            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full">{toPay.length}</span>
          </h3>
          {toPay.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
              No pending payments
            </div>
          ) : (
            <div className="space-y-3">
              {toPay.map(d => renderDebtCard(d, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
