"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import DashboardDocumentsSection from "@/app/components/dashboard/DashboardDocumentsSection";
import UploadDropzone from "@/app/components/UploadDropzone";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import { documentKeys } from "@/lib/queries/keys";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Upload, search, and review AI analysis for your documents.
          </p>
        </div>
        <Button type="button" onClick={() => setUploadOpen(true)}>
          + Upload Document
        </Button>
      </header>

      <section id="documents" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Recent Documents
          </h2>
        </div>
        <DashboardDocumentsSection
          onRequestUpload={() => {
            setUploadOpen(true);
          }}
        />
      </section>

      <Modal open={uploadOpen} title="Upload Document" onClose={closeUpload}>
        <UploadDropzone
          title="Drop a file or browse"
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: documentKeys.all });
            void queryClient.invalidateQueries({
              queryKey: documentKeys.topics(),
            });
            setUploadOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
