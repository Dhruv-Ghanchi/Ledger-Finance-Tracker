import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileType, Loader2, File, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ImportModal({ open, onOpenChange, onParsed }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setError(null);
    const allowedExtensions = [".jpeg", ".jpg", ".png", ".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    const ext = "." + selectedFile.name.split(".").pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setError("Invalid file type. Please upload an image, PDF, Word, or Excel document.");
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await api.post("/entries/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      onOpenChange(false);
      setFile(null);
      // Pass the extracted data to parent to auto-fill the Add Entry form
      if (onParsed) {
        onParsed(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to parse file. Ensure it's readable and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!loading) { onOpenChange(val); setFile(null); setError(null); } }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Import Receipt or Statement</DialogTitle>
          <DialogDescription>
            Upload a receipt, invoice, or statement. Our AI will automatically extract the transaction details.
          </DialogDescription>
        </DialogHeader>

        <div 
          className={cn(
            "mt-4 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors relative",
            dragActive ? "border-foreground bg-muted/50" : "border-border",
            file ? "bg-muted/30 border-primary/50" : "hover:bg-muted/20"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleChange}
            disabled={loading}
          />
          
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {!loading && (
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-8 mt-2 text-muted-foreground">
                  Remove File
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Drag & drop your file here</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Supports JPG, PNG, PDF, DOC, XLS
              </p>
              <Button onClick={() => inputRef.current?.click()} variant="outline" size="sm" className="bg-background shadow-sm hover:bg-muted">
                Browse Files
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-start gap-2 border border-destructive/20">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting AI Data...
              </>
            ) : (
              "Extract Data"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
