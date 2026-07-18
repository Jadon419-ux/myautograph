import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import FollowButton from "./FollowButton.jsx";

export default function PostCard({ post, followedUserIds = new Set(), onDeleted }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const isOwnPost = user && user.id === post.author_user_id;

  async function toggleLike() {
    try {
      const { data } = await client.post(`/social/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.like_count);
    } catch {
      // ignore
    }
  }

  async function deletePost() {
    await client.delete(`/social/posts/${post.id}`);
    onDeleted?.(post.id);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-gray">
            {post.author_avatar_url ? (
              <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                {post.author_name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </span>
          <div>
            <p className="text-sm font-medium text-brand-charcoal">{post.author_name}</p>
            <p className="text-xs text-gray-400">
              {post.celebrity_stage_name ? `${post.celebrity_stage_name}'s community` : "General"} ·{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {!isOwnPost && user && (
          <FollowButton
            key={followedUserIds.has(post.author_user_id).toString()}
            kind="user"
            targetId={post.author_user_id}
            initialFollowing={followedUserIds.has(post.author_user_id)}
            className="px-3 py-1 text-xs"
          />
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{post.content}</p>
      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-3 w-full rounded-md object-cover" />
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-brand-border pt-3 text-sm text-gray-500">
        <button onClick={toggleLike} className={liked ? "font-medium text-brand-greenDark" : "hover:text-brand-green"}>
          {liked ? "Liked" : "Like"} · {likeCount}
        </button>
        <Link to={`/community/posts/${post.id}`} className="hover:text-brand-green">
          Comments · {post.comment_count}
        </Link>
        {isOwnPost && (
          <button onClick={deletePost} className="ml-auto text-red-600 hover:underline">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
