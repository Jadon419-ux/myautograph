import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PostCard from "../components/PostCard.jsx";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [followedUserIds, setFollowedUserIds] = useState(new Set());
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadAll() {
    client.get(`/social/posts/${id}`).then(({ data }) => setPost(data));
    client.get(`/social/posts/${id}/comments`).then(({ data }) => setComments(data));
    client.get("/social/following/users").then(({ data }) => setFollowedUserIds(new Set(data)));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitComment(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post(`/social/posts/${id}/comments`, { content });
      setContent("");
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId) {
    await client.delete(`/social/comments/${commentId}`);
    setComments((cs) => cs.filter((c) => c.id !== commentId));
  }

  if (!post) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <PostCard post={post} followedUserIds={followedUserIds} onDeleted={() => navigate("/community")} />

      <div className="card mt-6">
        <h2 className="text-sm font-semibold text-brand-charcoal">Comments</h2>
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 border-t border-brand-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-start gap-2.5">
                <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-brand-gray">
                  {c.author_avatar_url ? (
                    <img src={c.author_avatar_url} alt={c.author_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                      {c.author_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">{c.author_name}</p>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              </div>
              {user && user.id === c.author_user_id && (
                <button onClick={() => deleteComment(c.id)} className="shrink-0 text-xs text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
        </div>

        <form onSubmit={submitComment} className="mt-4 flex gap-2 border-t border-brand-border pt-4">
          <input
            className="input-field"
            required
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="btn-primary shrink-0">
            Comment
          </button>
        </form>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
