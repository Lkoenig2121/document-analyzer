export const DEFAULT_ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const;
export const DEFAULT_MAX_SIZE_BYTES = 20 * 1024 * 1024;

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex === -1 ? '' : filename.slice(dotIndex).toLowerCase();
}

export function validateUploadFile(
  file: File | null | undefined,
  options?: {
    acceptedExtensions?: readonly string[];
    maxSizeBytes?: number;
  },
): string | true {
  const acceptedExtensions = options?.acceptedExtensions ?? DEFAULT_ACCEPTED_EXTENSIONS;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  if (!file) {
    return 'Choose a file to upload.';
  }

  const extension = getFileExtension(file.name);

  if (!acceptedExtensions.includes(extension)) {
    return 'Only PDF, DOCX, and TXT files are allowed.';
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMb = Math.round(maxSizeBytes / (1024 * 1024));
    return `File must be ${maxSizeMb}MB or smaller.`;
  }

  return true;
}
