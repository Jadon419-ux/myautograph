import { useEffect, useState } from "react";
import client from "../api/client.js";
import ImageUploadField from "../components/ImageUploadField.jsx";
import PostCard from "../components/PostCard.jsx";

export default function Community() {
  const [tab, setTab] = useState("general");
  const [generalPosts, setGeneralPosts] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [followedUserIds, setFollowedUserIds] = useState(new Set());
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadAll() {
    client.get("/social/posts/general").then(({ data }) => setGeneralPosts(data));
    client.get("/social/feed").then(({ data }) => setFeedPosts(data));
    client.get("/social/following/users").then(({ data }) => setFollowedUserIds(new Set(data)));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function submitPost(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/social/posts", { celebrity_id: null, content, image_url: imageUrl });
      setContent("");
      setImageUrl("");
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create post.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleted(postId) {
    setGeneralPosts((posts) => posts.filter((p) => p.id !== postId));
    setFeedPosts((posts) => posts.filter((p) => p.id !== postId));
  }

  const posts = tab === "general" ? generalPosts : feedPosts;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Community</h1>
      <p className="mt-1 text-sm text-gray-500">
        Talk with fans of every celebrity, or follow celebrities and fans to build your own feed.
      </p>

      <div className="mt-6 flex gap-2 border-b border-brand-border">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === "general" ? "border-b-2 border-brand-green text-brand-green" : "text-gray-500"}`}
          onClick={() => setTab("general")}
        >
          General
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === "feed" ? "border-b-2 border-brand-green text-brand-green" : "text-gray-500"}`}
          onClick={() => setTab("feed")}
        >
          For you
        </button>
      </div>

      <form onSubmit={submitPost} className="card mt-6 space-y-3">
        <textarea
          className="input-field"
          rows={3}
          required
          placeholder="Share something with the community..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <ImageUploadField value={imageUrl} onUploaded={setImageUrl} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Posting..." : "Post"}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} followedUserIds={followedUserIds} onDeleted={handleDeleted} />
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-gray-500">
            {tab === "general" ? "No posts yet." : "Follow celebrities and fans to see their posts here."}
          </p>
        )}
      </div>
    </div>
  );
}
