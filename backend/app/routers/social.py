from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.celebrity import CelebrityProfile
from app.models.social import CelebrityFollow, Comment, FanFollow, Post, PostLike
from app.models.user import User
from app.schemas.social import (
    CommentCreate,
    CommentRead,
    FollowStatus,
    LikeStatus,
    PostCreate,
    PostRead,
)

router = APIRouter(prefix="/social", tags=["social"])


def _to_post_read(session: Session, post: Post, user_id: int) -> PostRead:
    author = session.get(User, post.author_user_id)
    celebrity = session.get(CelebrityProfile, post.celebrity_id) if post.celebrity_id else None
    likes = session.exec(select(PostLike).where(PostLike.post_id == post.id)).all()
    comment_count = len(session.exec(select(Comment).where(Comment.post_id == post.id)).all())

    return PostRead(
        id=post.id,
        author_user_id=post.author_user_id,
        author_name=author.full_name if author else "Unknown",
        author_avatar_url=author.avatar_url if author else None,
        celebrity_id=post.celebrity_id,
        celebrity_stage_name=celebrity.stage_name if celebrity else None,
        content=post.content,
        image_url=post.image_url,
        created_at=post.created_at,
        like_count=len(likes),
        comment_count=comment_count,
        liked_by_me=any(like.user_id == user_id for like in likes),
    )


def _to_comment_read(session: Session, comment: Comment) -> CommentRead:
    author = session.get(User, comment.author_user_id)
    return CommentRead(
        id=comment.id,
        post_id=comment.post_id,
        author_user_id=comment.author_user_id,
        author_name=author.full_name if author else "Unknown",
        author_avatar_url=author.avatar_url if author else None,
        content=comment.content,
        created_at=comment.created_at,
    )


@router.post("/posts", response_model=PostRead)
def create_post(
    payload: PostCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if payload.celebrity_id is not None and not session.get(CelebrityProfile, payload.celebrity_id):
        raise HTTPException(status_code=404, detail="Celebrity not found")

    post = Post(
        author_user_id=user.id,
        celebrity_id=payload.celebrity_id,
        content=payload.content,
        image_url=payload.image_url,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return _to_post_read(session, post, user.id)


@router.get("/posts/general", response_model=list[PostRead])
def list_general_posts(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    posts = session.exec(
        select(Post).where(Post.celebrity_id.is_(None)).order_by(Post.created_at.desc())
    ).all()
    return [_to_post_read(session, p, user.id) for p in posts]


@router.get("/posts/celebrity/{celebrity_id}", response_model=list[PostRead])
def list_celebrity_posts(
    celebrity_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    posts = session.exec(
        select(Post).where(Post.celebrity_id == celebrity_id).order_by(Post.created_at.desc())
    ).all()
    return [_to_post_read(session, p, user.id) for p in posts]


@router.get("/feed", response_model=list[PostRead])
def personalized_feed(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    followed_celebrity_ids = {
        f.celebrity_id
        for f in session.exec(
            select(CelebrityFollow).where(CelebrityFollow.follower_user_id == user.id)
        ).all()
    }
    followed_user_ids = {
        f.followee_user_id
        for f in session.exec(select(FanFollow).where(FanFollow.follower_user_id == user.id)).all()
    }

    all_posts = session.exec(select(Post)).all()
    relevant = [
        p
        for p in all_posts
        if p.celebrity_id is None
        or p.celebrity_id in followed_celebrity_ids
        or p.author_user_id in followed_user_ids
    ]
    relevant.sort(key=lambda p: p.created_at, reverse=True)
    return [_to_post_read(session, p, user.id) for p in relevant]


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(
    post_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _to_post_read(session, post, user.id)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = session.get(Post, post_id)
    if not post or post.author_user_id != user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    for comment in session.exec(select(Comment).where(Comment.post_id == post_id)).all():
        session.delete(comment)
    for like in session.exec(select(PostLike).where(PostLike.post_id == post_id)).all():
        session.delete(like)
    session.delete(post)
    session.commit()


@router.get("/posts/{post_id}/comments", response_model=list[CommentRead])
def list_comments(
    post_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    comments = session.exec(
        select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at)
    ).all()
    return [_to_comment_read(session, c) for c in comments]


@router.post("/posts/{post_id}/comments", response_model=CommentRead)
def create_comment(
    post_id: int,
    payload: CommentCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not session.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, author_user_id=user.id, content=payload.content)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _to_comment_read(session, comment)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    comment = session.get(Comment, comment_id)
    if not comment or comment.author_user_id != user.id:
        raise HTTPException(status_code=404, detail="Comment not found")
    session.delete(comment)
    session.commit()


@router.post("/posts/{post_id}/like", response_model=LikeStatus)
def toggle_like(
    post_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not session.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    existing = session.exec(
        select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user.id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        liked = False
    else:
        session.add(PostLike(post_id=post_id, user_id=user.id))
        session.commit()
        liked = True

    like_count = len(session.exec(select(PostLike).where(PostLike.post_id == post_id)).all())
    return LikeStatus(liked=liked, like_count=like_count)


@router.post("/follow/celebrity/{celebrity_id}", response_model=FollowStatus)
def toggle_follow_celebrity(
    celebrity_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    celebrity = session.get(CelebrityProfile, celebrity_id)
    if not celebrity:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    if celebrity.user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot follow your own celebrity profile")

    existing = session.exec(
        select(CelebrityFollow).where(
            CelebrityFollow.follower_user_id == user.id,
            CelebrityFollow.celebrity_id == celebrity_id,
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return FollowStatus(following=False)

    session.add(CelebrityFollow(follower_user_id=user.id, celebrity_id=celebrity_id))
    session.commit()
    return FollowStatus(following=True)


@router.post("/follow/user/{followee_user_id}", response_model=FollowStatus)
def toggle_follow_user(
    followee_user_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if followee_user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    if not session.get(User, followee_user_id):
        raise HTTPException(status_code=404, detail="User not found")

    existing = session.exec(
        select(FanFollow).where(
            FanFollow.follower_user_id == user.id,
            FanFollow.followee_user_id == followee_user_id,
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return FollowStatus(following=False)

    session.add(FanFollow(follower_user_id=user.id, followee_user_id=followee_user_id))
    session.commit()
    return FollowStatus(following=True)


@router.get("/following/celebrities", response_model=list[int])
def following_celebrities(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return [
        f.celebrity_id
        for f in session.exec(
            select(CelebrityFollow).where(CelebrityFollow.follower_user_id == user.id)
        ).all()
    ]


@router.get("/following/users", response_model=list[int])
def following_users(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return [
        f.followee_user_id
        for f in session.exec(select(FanFollow).where(FanFollow.follower_user_id == user.id)).all()
    ]
