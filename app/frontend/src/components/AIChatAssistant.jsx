import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { MessageSquare, X, Send, Loader2, Sparkles, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedRobot from "./AnimatedRobot";
import RobotFaceIcon from "./RobotFaceIcon";
import AdvisorCard from "./AdvisorCard";

function stripMarkdown(text) {
  return (text || "")
    .replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)_([^\s_][^_]*?)_(?=\s|$)/g, "$1$2")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function AmountInputWidget({ items, onSubmit }) {
  const [values, setValues] = useState({});

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Only submit if all fields are filled
      const allFilled = items.every(item => values[item] && Number(values[item]) > 0);
      if (allFilled) {
        const text = items.map(item => `${item}: ₹${values[item]}`).join(", ");
        onSubmit(text);
      }
    }
  };

  return (
    <div className="mt-3 bg-card border border-border rounded-lg p-3 shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Enter Amounts</div>
      {items.map(item => (
        <div key={item} className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium capitalize flex-1">{item}</label>
          <div className="relative w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <input
              type="number"
              className="w-full bg-background border border-border rounded-md pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="0"
              value={values[item] || ""}
              onChange={(e) => setValues({ ...values, [item]: e.target.value })}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      ))}
      <div className="text-[10px] text-muted-foreground text-center mt-1">Press Enter to submit</div>
    </div>
  );
}

function ScopeToggleWidget({ onSubmit }) {
  return (
    <div className="mt-3 bg-card border border-border rounded-lg p-3 shadow-sm flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 text-center">Select Type</div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 border-border"
          onClick={() => onSubmit("It is a personal expense.")}
        >
          Personal
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 border-border"
          onClick={() => onSubmit("It is a business expense.")}
        >
          Business
        </Button>
      </div>
    </div>
  );
}

export default function AIChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Koin, your AI financial co-pilot. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  const submitMessage = async (text) => {
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.post("/chat", { messages: newMessages });
      setMessages([...newMessages, { role: "assistant", content: res.data.response }]);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setMessages(messages);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please check if the LLM API key is configured properly in the backend." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    await submitMessage(text);
  };

  const renderMessageContent = (msg, isLatest) => {
    let content = msg.content;
    
    const amountMatch = content.match(/\[AMOUNT_INPUT:(.+?)\]/);
    let amountItems = [];
    if (amountMatch) {
      amountItems = amountMatch[1].split(',').map(s => s.trim());
      content = content.replace(amountMatch[0], "");
    }

    const hasScopeToggle = content.includes("[SCOPE_TOGGLE]");
    if (hasScopeToggle) {
      content = content.replace("[SCOPE_TOGGLE]", "");
    }

    content = stripMarkdown(content);

    const parts = content.split("[GHANCHI_INVESTMENTS_CARD]");
    
    return (
      <div className="flex flex-col">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part.trim() && <div className="whitespace-pre-wrap">{part.trim()}</div>}
            {i < parts.length - 1 && <div className="mt-2"><AdvisorCard /></div>}
          </React.Fragment>
        ))}
        
        {isLatest && amountItems.length > 0 && (
          <AmountInputWidget items={amountItems} onSubmit={submitMessage} />
        )}
        
        {isLatest && hasScopeToggle && (
          <ScopeToggleWidget onSubmit={submitMessage} />
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`fixed bottom-2 right-2 z-50 ${open ? 'hidden' : 'flex'} flex-col items-center animate-in slide-in-from-bottom-5`}>
        <button
          onClick={() => setOpen(true)}
          className="relative h-36 w-36 hover:scale-105 transition-transform duration-300 click-press group focus:outline-none"
        >
          <AnimatedRobot className="w-full h-full drop-shadow-2xl" />
        </button>
      </div>

      {open && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 w-auto sm:w-[380px] h-[600px] max-h-[80vh] bg-background border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-card text-foreground px-5 py-4 flex items-center justify-between border-b border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-[#0F52BA]/5 border border-[#0F52BA]/10 rounded-full w-9 h-9 flex items-center justify-center shadow-inner">
                <RobotFaceIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-semibold text-[16px] leading-tight">KOIN AI</span>
                <span className="overline mt-0.5">Financial Co-Pilot</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-colors" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((msg, idx) => {
              const isLatest = idx === messages.length - 1;
              if (msg.role === "user") {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed bg-background border border-border text-foreground shadow-sm rounded-tl-sm">
                    {renderMessageContent(msg, isLatest)}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-background border border-border shadow-sm rounded-tl-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-background border-t border-border">
            <form onSubmit={sendMessage} className="relative flex items-center">
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-muted/50 border border-transparent focus:border-border rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost" 
                className="absolute right-1 h-10 w-10 text-primary hover:bg-transparent disabled:opacity-50"
                disabled={!input.trim() || loading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
