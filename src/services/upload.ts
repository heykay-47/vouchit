const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Image uploads are not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Image must be under 3MB');
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('file', file);

  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    throw new Error('Image upload failed. Please try again.');
  }
  const data = await res.json();
  return data.secure_url as string;
}

export function isUploadConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}
