export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiUrl = (path) => `${API_BASE}${path}`;

export async function fetchDocumentBlob(doc, user) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/documents/${doc._id}/file`), {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error('Unable to open document. Please try again.');
  return URL.createObjectURL(await response.blob());
}

export async function openDocument(doc, user, download = false) {
  // Open synchronously so Safari does not block the preview after authentication.
  const preview = download ? null : window.open('', '_blank');
  if (preview) preview.opener = null;
  try {
    const url = await fetchDocumentBlob(doc, user);
    if (download) {
      const link = document.createElement('a');
      link.href = url; link.download = doc.name; link.click();
    } else if (preview) preview.location.href = url;
    else throw new Error('Please allow popups to preview documents.');
    setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (error) {
    preview?.close();
    window.alert(error.message);
  }
}
