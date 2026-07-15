import { useState } from "react";
import { CLOUDINARY_CONFIGURED, uploadImage } from "../lib/cloudinary.js";

export default function ImageUploadField({ label, value, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUploaded(url);
    } catch (err) {
      setError(err.message || "Could not upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!CLOUDINARY_CONFIGURED) {
    return <p className="text-xs text-gray-400">Image uploads aren't configured yet.</p>;
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      {value && (
        <img src={value} alt="Preview" className="mb-2 h-32 w-full rounded-md object-cover" />
      )}
      <label className="btn-secondary inline-block cursor-pointer">
        {uploading ? "Uploading..." : value ? "Change photo" : "Upload photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
