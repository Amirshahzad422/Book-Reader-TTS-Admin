"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FaUpload, FaFilePdf, FaCrown } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toaster";

interface PDFUploaderProps {
  onFileUpload: (file: File) => void;
  onLoginRequired?: () => void; 
}

export default function PDFUploader({
  onFileUpload,
  onLoginRequired,
}: PDFUploaderProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const user = session?.user;
  const subscriptionPlan = user?.subscriptionPlan || "free";
  const conversions = user?.conversions ?? 0;

  // Determine max file size based on plan
  const maxFileSize =
    subscriptionPlan === "paid" ? 30 * 1024 * 1024 : 5 * 1024 * 1024; // 30MB or 5MB
  const maxFileSizeMB = subscriptionPlan === "paid" ? 30 : 5;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Check if user has conversions left
      if (session ? conversions <= 0 : false) {
        toast.error(
          "No conversions remaining!",
          "Please upgrade your plan to continue converting PDFs.",
          6000
        );
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Validate file type
        if (file.type !== "application/pdf") {
          toast.error("Invalid file type", "Please upload a PDF file only.");
          return;
        }

        // Validate file size based on plan
        if (file.size > maxFileSize) {
          toast.error(
            "File too large!",
            `Maximum size for ${subscriptionPlan} plan is ${maxFileSizeMB}MB. Your file is ${(
              file.size /
              (1024 * 1024)
            ).toFixed(2)}MB.`
          );
          return;
        }

        toast.success(
          "PDF uploaded successfully!",
          `Processing ${file.name}...`
        );
        onFileUpload(file);
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.error(
            "File too large!",
            `Maximum size for ${subscriptionPlan} plan is ${maxFileSizeMB}MB.`
          );
        }
      }
    },
    [
      onFileUpload,
      conversions,
      maxFileSize,
      subscriptionPlan,
      maxFileSizeMB,
      toast,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: maxFileSize,
    disabled: session ? conversions <= 0 : false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Subscription Info Banner */}
      {session && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <FaCrown
              className={
                subscriptionPlan === "paid"
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              }
            />
            <span className="font-medium capitalize">
              {subscriptionPlan} Plan
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Conversions:{" "}
              <strong
                className={
                  conversions <= 2 ? "text-red-500" : "text-foreground"
                }
              >
                {conversions}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Max File Size: <strong>{maxFileSizeMB}MB</strong>
            </span>
            {subscriptionPlan && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/pricing")}
                className="text-xs"
              >
                {subscriptionPlan === "free" ? "Upgrade" : "Degrade"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${
            session
              ? conversions <= 0
              : false
              ? "opacity-50 cursor-not-allowed"
              : ""
          }
          ${
            isDragActive
              ? "border-primary bg-primary/5 scale-105"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <FaUpload className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? "Drop your PDF here" : "Upload Your PDF Document"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {session
                ? conversions <= 0
                : false
                ? "No conversions remaining - Please upgrade your plan"
                : "Drag and drop your PDF file here, or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: {maxFileSizeMB}MB • Supported format: PDF
            </p>
          </div>

          {session ? (
            <Button
              variant="outline"
              className="mt-4"
              disabled={session ? conversions <= 0 : false}
            >
              <FaFilePdf className="mr-2" />
              Choose PDF File
            </Button>
          ) : (
            <Button
              variant="outline"
              className="bg-primary text-primary-foreground px-10 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-all text-lg shadow-md hover:shadow-lg min-w-[240px]"
              onClick={(e) => {
                e.stopPropagation();
                onLoginRequired?.();
              }}
            >
              🔐 Login to Upload
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your PDF will be processed and text extracted</li>
          <li>• AI will convert the text to natural, human-like speech</li>
          <li>
            • You&apos;ll get high-quality audio with emotional expression
          </li>
          <li>• Play, pause, and download your generated audiobook</li>
        </ul>
      </div>
    </div>
  );
}
