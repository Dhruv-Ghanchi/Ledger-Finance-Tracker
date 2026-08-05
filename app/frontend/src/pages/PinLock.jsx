import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";

const PIN_LEN = 4;

export default function PinLock() {
  const { pinSet, setup, verify } = useAuth();
  const [digits, setDigits] = useState(Array(PIN_LEN).fill(""));
  const [confirmDigits, setConfirmDigits] = useState(Array(PIN_LEN).fill(""));
  const [phase, setPhase] = useState("enter");
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);
  const refs2 = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setValueAt = (arr, setter, i, v) => {
    const next = [...arr];
    next[i] = v.slice(-1);
    setter(next);
  };

  const handleChange = (isConfirm, i, e) => {
    const val = e.target.value.replace(/\D/g, "");
    const arr = isConfirm ? confirmDigits : digits;
    const setter = isConfirm ? setConfirmDigits : setDigits;
    const rs = isConfirm ? refs2 : refs;
    if (!val) {
      setValueAt(arr, setter, i, "");
      return;
    }
    setValueAt(arr, setter, i, val);
    if (i < PIN_LEN - 1) rs.current[i + 1]?.focus();
  };

  const handleKey = (isConfirm, i, e) => {
    const arr = isConfirm ? confirmDigits : digits;
    const rs = isConfirm ? refs2 : refs;
    if (e.key === "Backspace" && !arr[i] && i > 0) {
      rs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") submit(isConfirm);
  };

  const submit = async (isConfirm) => {
    if (busy) return;
    const arr = isConfirm ? confirmDigits : digits;
    const pin = arr.join("");
    if (pin.length !== PIN_LEN) return;

    if (pinSet) {
      setBusy(true);
      try {
        await verify(pin);
        toast.success("Welcome back");
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Incorrect PIN");
        setDigits(Array(PIN_LEN).fill(""));
        refs.current[0]?.focus();
      } finally { setBusy(false); }
      return;
    }

    if (phase === "enter") {
      setPhase("confirm");
      setTimeout(() => refs2.current[0]?.focus(), 50);
      return;
    }
    if (digits.join("") !== confirmDigits.join("")) {
      toast.error("PINs do not match");
      setConfirmDigits(Array(PIN_LEN).fill(""));
      refs2.current[0]?.focus();
      return;
    }
    setBusy(true);
    try {
      await setup(digits.join(""));
      toast.success("PIN set. You're in.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to set PIN");
    } finally { setBusy(false); }
  };

  const activeArr = phase === "confirm" ? confirmDigits : digits;
  const activeRefs = phase === "confirm" ? refs2 : refs;
  const isConfirm = phase === "confirm";

  const titleTop = pinSet ? "Enter your PIN" : (phase === "enter" ? "Create a 4-digit PIN" : "Confirm your PIN");
  const subtitle = pinSet
    ? "This is your personal ledger. Unlock to continue."
    : (phase === "enter" ? "Choose 4 digits — remember them." : "Re-enter the same 4 digits to confirm.");

  return (
    <div className="min-h-screen w-full bg-background bg-grain flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2 mb-14">
          <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display text-sm font-bold">₹</span>
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Personal · Business</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="overline">Secure Access</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-2" data-testid="pin-title">
            {titleTop}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>

          <div className="flex gap-3 mb-8" data-testid="pin-input-row">
            {activeArr.map((v, i) => (
              <input
                key={`${isConfirm ? "c" : "p"}-${i}`}
                ref={(el) => (activeRefs.current[i] = el)}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                className="pin-cell"
                value={v}
                onChange={(e) => handleChange(isConfirm, i, e)}
                onKeyDown={(e) => handleKey(isConfirm, i, e)}
                data-testid={`pin-digit-${i}`}
                disabled={busy}
              />
            ))}
          </div>

          <button
            onClick={() => submit(isConfirm)}
            disabled={busy || activeArr.some((d) => !d)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background text-sm font-medium py-3 disabled:opacity-40 hover:bg-foreground/90 transition-colors"
            data-testid="pin-submit-btn"
          >
            {pinSet ? "Unlock" : (phase === "enter" ? "Continue" : "Set PIN")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}