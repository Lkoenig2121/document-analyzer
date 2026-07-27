export function getFileTypeLabel(filename: string): string {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  switch (extension) {
    case '.pdf':
      return 'PDF';
    case '.docx':
      return 'DOCX';
    case '.txt':
      return 'TXT';
    default:
      return extension.replace('.', '').toUpperCase() || 'FILE';
  }
}

export function formatUploadedDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}
