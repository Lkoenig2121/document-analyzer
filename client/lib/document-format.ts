export function getFileTypeLabel(filename: string, mimeType?: string): string {
  if (mimeType?.startsWith('image/')) {
    const subtype = mimeType.slice('image/'.length).toUpperCase();
    return subtype || 'IMAGE';
  }

  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  switch (extension) {
    case '.pdf':
      return 'PDF';
    case '.docx':
      return 'DOCX';
    case '.txt':
      return 'TXT';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.gif':
      return extension.replace('.', '').toUpperCase();
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
