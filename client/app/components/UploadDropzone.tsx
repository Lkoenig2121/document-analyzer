"use client";

import { useId, useState, type DragEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import LoadingSpinner from "./LoadingSpinner";
import Button from "./ui/Button";
import ErrorMessage from "./ui/ErrorMessage";
import {
  type DocumentRecord,
  getUploadErrorMessage,
  uploadDocument,
} from "@/lib/api";
import {
  DEFAULT_ACCEPTED_EXTENSIONS,
  DEFAULT_MAX_SIZE_BYTES,
  validateUploadFile,
} from "@/lib/upload-validation";

interface UploadFormValues {
  file: File | null;
}

export interface UploadDropzoneProps {
  title?: string;
  endpoint?: string;
  fieldName?: string;
  accept?: string;
  acceptedExtensions?: readonly string[];
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
  onSuccess?: (document: DocumentRecord) => void;
  onError?: (message: string) => void;
}

export default function UploadDropzone({
  title = "Upload Document",
  endpoint = "/documents",
  fieldName = "file",
  accept = ".pdf,.docx,.txt",
  acceptedExtensions = DEFAULT_ACCEPTED_EXTENSIONS,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: UploadDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<UploadFormValues>({
    defaultValues: {
      file: null,
    },
  });

  const selectedFile = useWatch({ control, name: "file" });
  const isBusy = disabled || isSubmitting;

  function openFilePicker() {
    if (isBusy) {
      return;
    }

    document.getElementById(inputId)?.click();
  }

  function assignFile(file: File | null) {
    setValue("file", file, { shouldValidate: true, shouldDirty: true });
    setSubmitError(null);
    setSuccessMessage(null);
    setUploadProgress(0);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (disabled || isSubmitting) {
      return;
    }

    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (disabled || isSubmitting) {
      return;
    }

    assignFile(event.dataTransfer.files[0] ?? null);
  }

  async function onSubmit(values: UploadFormValues) {
    if (!values.file) {
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    try {
      const document = await uploadDocument({
        file: values.file,
        endpoint,
        fieldName,
        onUploadProgress: setUploadProgress,
      });

      setSuccessMessage(`Uploaded: ${document.originalName}`);
      reset({ file: null });

      onSuccess?.(document);
    } catch (error) {
      const message = getUploadErrorMessage(error);
      setSubmitError(message);
      onError?.(message);
    } finally {
      setUploadProgress(0);
    }
  }

  const fileError = errors.file?.message;
  const displayError = fileError ?? submitError;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`flex w-full max-w-md flex-col gap-4 ${className}`}
      noValidate
    >
      <h1 className="text-xl font-semibold">{title}</h1>

      <Controller
        name="file"
        control={control}
        rules={{
          validate: (file) =>
            validateUploadFile(file, { acceptedExtensions, maxSizeBytes }),
        }}
        render={({ field }) => (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFilePicker}
              className={`flex h-40 cursor-pointer items-center justify-center rounded border border-dashed transition-colors ${
                isDragging
                  ? "border-black bg-zinc-100"
                  : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              } ${isBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              <p className="text-zinc-600">Drag Here</p>
            </div>

            <input
              id={inputId}
              type="file"
              accept={accept}
              className="hidden"
              disabled={isBusy}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                field.onChange(nextFile);
                assignFile(nextFile);
              }}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          </>
        )}
      />

      <Button
        type="button"
        variant="outline"
        onClick={openFilePicker}
        disabled={isBusy}
      >
        Browse
      </Button>

      {selectedFile ? (
        <p className="text-sm text-zinc-600">{selectedFile.name}</p>
      ) : null}

      {isSubmitting ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <LoadingSpinner />
            <span>Uploading...</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-black transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{uploadProgress}%</p>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isBusy || !selectedFile}
        isLoading={isSubmitting}
        loadingText="Uploading"
      >
        Upload
      </Button>

      {displayError ? <ErrorMessage message={displayError} /> : null}

      {successMessage ? (
        <p role="status" className="text-sm text-green-700">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
