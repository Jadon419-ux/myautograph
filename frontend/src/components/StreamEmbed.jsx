function toEmbedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace("www.", "");

    if (host === "youtube.com" && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}`;
    }
    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "twitch.tv") {
      const channel = url.pathname.slice(1);
      return `https://player.twitch.tv/?channel=${channel}&parent=localhost`;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.slice(1);
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function StreamEmbed({ url, title }) {
  const embedUrl = toEmbedUrl(url);

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary"
      >
        Watch stream
      </a>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md border border-brand-border">
      <iframe
        src={embedUrl}
        title={title || "Live stream"}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
