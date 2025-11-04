"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaSave, FaFilePdf, FaMusic, FaCheck } from "react-icons/fa";

interface SaveConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savePdf: boolean, saveAudio: boolean) => Promise<void>;
  hasPdf: boolean;
  hasAudio: boolean;
}

export default function SaveConversationDialog({
  isOpen,
  onClose,
  onSave,
  hasPdf,
  hasAudio
}: SaveConversationDialogProps) {
  const [savePdf, setSavePdf] = useState(hasPdf);
  const [saveAudio, setSaveAudio] = useState(hasAudio);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!savePdf && !saveAudio) {
      alert("Please select at least one item to save (PDF or Audio)");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(savePdf, saveAudio);
      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
        setSavePdf(hasPdf);
        setSaveAudio(hasAudio);
      }, 1500);
    } catch (error) {
      console.error("Error saving conversation:", error);
      alert("Failed to save conversation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FaSave className="text-primary" />
          Save Conversation
        </h2>
        
        <p className="text-muted-foreground mb-6">
          Choose what you want to save to your account:
        </p>

        <div className="space-y-4 mb-6">
          {/* PDF Option */}
          <div
            onClick={() => hasPdf && setSavePdf(!savePdf)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${savePdf 
                ? 'border-primary bg-primary/10' 
                : 'border-muted hover:border-primary/50'
              }
              ${!hasPdf ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded border-2 flex items-center justify-center
                ${savePdf ? 'border-primary bg-primary' : 'border-muted-foreground'}
              `}>
                {savePdf && <FaCheck className="text-white text-xs" />}
              </div>
              <FaFilePdf className="text-red-500 text-xl" />
              <div className="flex-1">
                <h3 className="font-medium">Save PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Save the original PDF document
                </p>
              </div>
            </div>
          </div>

          {/* Audio Option */}
          <div
            onClick={() => hasAudio && setSaveAudio(!saveAudio)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${saveAudio 
                ? 'border-primary bg-primary/10' 
                : 'border-muted hover:border-primary/50'
              }
              ${!hasAudio ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded border-2 flex items-center justify-center
                ${saveAudio ? 'border-primary bg-primary' : 'border-muted-foreground'}
              `}>
                {saveAudio && <FaCheck className="text-white text-xs" />}
              </div>
              <FaMusic className="text-blue-500 text-xl" />
              <div className="flex-1">
                <h3 className="font-medium">Save Audio</h3>
                <p className="text-sm text-muted-foreground">
                  Save the generated audio file
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSaving || isSaved}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving || isSaved || (!savePdf && !saveAudio)}
          >
            {isSaving ? (
              "Saving..."
            ) : isSaved ? (
              <>
                <FaCheck className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

