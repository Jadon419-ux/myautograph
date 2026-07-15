import { useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { CLOUDINARY_CONFIGURED, uploadImage } from "../lib/cloudinary.js";

export default function AvatarUploader() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await client.patch("/auth/me/avatar", { avatar_url: url });
      await refreshUser();
    } catch (err) {
      setError(err.message || "Could not upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-gray">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-400">
            {user?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>

      <div>
        {CLOUDINARY_CONFIGURED ? (
          <>
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </>
        ) : (
          <p className="text-xs text-gray-400">Profile picture uploads aren't configured yet.</p>
        )}
      </div>
    </div>
  );
}
