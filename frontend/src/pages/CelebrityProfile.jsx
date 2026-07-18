import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StreamEmbed from "../components/StreamEmbed.jsx";
import ImageUploadField from "../components/ImageUploadField.jsx";
import PostCard from "../components/PostCard.jsx";
import FollowButton from "../components/FollowButton.jsx";
import ReviewSection from "../components/ReviewSection.jsx";

export default function CelebrityProfile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [celebrity, setCelebrity] = useState(null);
  const [autographs, setAutographs] = useState([]);
  const [streams, setStreams] = useState([]);
  const [message, setMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [posts, setPosts] = useState([]);
  const [followedUserIds, setFollowedUserIds] = useState(new Set());
  const [followedCelebrityIds, setFollowedCelebrityIds] = useState(new Set());
  const [postContent, setPostContent] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postError, setPostError] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);

  function loadCommunity() {
    if (!user) return;
    client.get(`/social/posts/celebrity/${id}`).then(({ data }) => setPosts(data));
    client.get("/social/following/users").then(({ data }) => setFollowedUserIds(new Set(data)));
    client.get("/social/following/celebrities").then(({ data }) => setFollowedCelebrityIds(new Set(data)));
  }

  useEffect(() => {
    client.get(`/celebrities/${id}`).then(({ data }) => setCelebrity(data));
    client.get(`/autographs/celebrity/${id}`).then(({ data }) => setAutographs(data));
    client.get(`/streams/celebrity/${id}`).then(({ data }) => setStreams(data));
    loadCommunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitPost(e) {
    e.preventDefault();
    setPostError("");
    setPostSubmitting(true);
    try {
      await client.post("/social/posts", {
        celebrity_id: Number(id),
        content: postContent,
        image_url: postImageUrl,
      });
      setPostContent("");
      setPostImageUrl("");
      loadCommunity();
    } catch (err) {
      setPostError(err.response?.data?.detail || "Could not create post.");
    } finally {
      setPostSubmitting(false);
    }
  }

  function handlePostDeleted(postId) {
    setPosts((ps) => ps.filter((p) => p.id !== postId));
  }

  const liveStream = streams.find((s) => s.is_live);
  const nextStream = [...streams]
    .filter((s) => !s.is_live)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  async function submitRequest(e) {
    e.preventDefault();
    setRequestStatus("");
    try {
      await client.post("/autographs/requests", {
        celebrity_id: Number(id),
        message,
      });
      setMessage("");
      setRequestStatus("Your request has been sent!");
    } catch (err) {
      setRequestStatus(err.response?.data?.detail || "Could not send request.");
    }
  }

  if (!celebrity) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-gray">
              {celebrity.avatar_url || celebrity.profile_image_url ? (
                <img
                  src={celebrity.avatar_url || celebrity.profile_image_url}
                  alt={celebrity.stage_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                  {celebrity.stage_name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </span>
            <h1 className="text-2xl font-semibold text-brand-charcoal">{celebrity.stage_name}</h1>
          </div>
          {user && user.id !== celebrity.user_id && (
            <FollowButton
              key={followedCelebrityIds.has(Number(id)).toString()}
              kind="celebrity"
              targetId={Number(id)}
              initialFollowing={followedCelebrityIds.has(Number(id))}
            />
          )}
        </div>
        {celebrity.category && (
          <span className="mt-2 inline-block rounded-full bg-brand-greenLight px-2 py-0.5 text-xs font-medium text-brand-greenDark">
            {celebrity.category}
          </span>
        )}
        <p className="mt-3 text-sm text-gray-600">{celebrity.bio || "No bio yet."}</p>
      </div>

      {(liveStream || nextStream) && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            {liveStream ? "Live now" : "Upcoming stream"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{(liveStream || nextStream).title}</p>
          <div className="mt-4">
            <StreamEmbed url={(liveStream || nextStream).embed_url} title={(liveStream || nextStream).title} />
          </div>
        </div>
      )}

      {user?.role === "fan" && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-brand-charcoal">Request an autograph</h2>
          <form onSubmit={submitRequest} className="mt-3 space-y-3">
            <textarea
              className="input-field"
              rows={3}
              placeholder="Say a few words..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Send request
            </button>
            {requestStatus && <p className="text-sm text-gray-600">{requestStatus}</p>}
          </form>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-brand-charcoal">Autographs shared</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {autographs.map((a) => (
            <div key={a.id} className="card">
              <img src={a.content_url} alt={a.caption} className="w-full rounded-md object-cover" />
              {a.caption && <p className="mt-2 text-sm text-gray-600">{a.caption}</p>}
            </div>
          ))}
        </div>
        {autographs.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">No autographs shared yet.</p>
        )}
      </div>

      {user && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-brand-charcoal">Fan community</h2>

          <form onSubmit={submitPost} className="card mt-3 space-y-3">
            <textarea
              className="input-field"
              rows={3}
              required
              placeholder={`Post something in ${celebrity.stage_name}'s community...`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
            <ImageUploadField value={postImageUrl} onUploaded={setPostImageUrl} />
            {postError && <p className="text-sm text-red-600">{postError}</p>}
            <button type="submit" disabled={postSubmitting} className="btn-primary">
              {postSubmitting ? "Posting..." : "Post"}
            </button>
          </form>

          <div className="mt-4 space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} followedUserIds={followedUserIds} onDeleted={handlePostDeleted} />
            ))}
            {posts.length === 0 && <p className="text-sm text-gray-500">No posts in this community yet.</p>}
          </div>
        </div>
      )}

      <ReviewSection targetType="celebrity" targetId={id} />
    </div>
  );
}
