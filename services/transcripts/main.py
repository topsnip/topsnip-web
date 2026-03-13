"""
Topsnip Transcript Service
FastAPI microservice — fetches YouTube transcripts via youtube-transcript-api
Deploy on Railway (Hobby $5/month is sufficient)
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from typing import Dict, List
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Topsnip Transcript Service", version="1.0.0")

# Shared secret for authenticating requests from the Next.js app
TRANSCRIPT_SERVICE_SECRET = os.environ.get("TRANSCRIPT_SERVICE_SECRET", "")

# Initialize the transcript API client
ytt = YouTubeTranscriptApi()


def verify_auth(request: Request):
    """Verify the shared secret if one is configured."""
    if not TRANSCRIPT_SERVICE_SECRET:
        return  # No secret configured — allow all (dev mode)
    auth = request.headers.get("authorization", "")
    if auth != f"Bearer {TRANSCRIPT_SERVICE_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class TranscriptRequest(BaseModel):
    video_ids: List[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug/{video_id}")
def debug_transcript(video_id: str, request: Request):
    """Debug endpoint — test a single video and return detailed error info."""
    verify_auth(request)
    try:
        transcript = ytt.fetch(video_id, languages=["en", "en-US", "en-GB"])
        snippet_count = len(transcript.snippets)
        full_text = " ".join(s.text.strip() for s in transcript.snippets if s.text.strip())
        return {"status": "ok", "snippets": snippet_count, "chars": len(full_text), "preview": full_text[:200]}
    except Exception as e:
        return {"status": "error", "error_type": type(e).__name__, "error": str(e)}


@app.post("/transcripts")
def get_transcripts(req: TranscriptRequest, request: Request) -> Dict[str, str]:
    """
    Accepts a list of YouTube video IDs.
    Returns a dict of {video_id: transcript_text} for videos that have transcripts.
    Videos without transcripts are silently skipped.
    """
    verify_auth(request)
    if not req.video_ids:
        return {}

    if len(req.video_ids) > 20:
        raise HTTPException(status_code=400, detail="Max 20 video IDs per request")

    results: Dict[str, str] = {}
    errors: Dict[str, str] = {}

    for video_id in req.video_ids:
        try:
            transcript = ytt.fetch(
                video_id,
                languages=["en", "en-US", "en-GB"],
            )
            # Join all text snippets into a single string
            full_text = " ".join(
                snippet.text.strip()
                for snippet in transcript.snippets
                if snippet.text.strip()
            )
            if full_text:
                results[video_id] = full_text
                logger.info(f"Fetched transcript for {video_id} ({len(full_text)} chars)")
            else:
                errors[video_id] = "empty_transcript"
                logger.info(f"Empty transcript for {video_id}")
        except (TranscriptsDisabled, NoTranscriptFound) as e:
            errors[video_id] = type(e).__name__
            logger.info(f"No transcript available for {video_id} — {type(e).__name__}")
        except Exception as e:
            errors[video_id] = f"{type(e).__name__}: {e}"
            logger.warning(f"Error fetching transcript for {video_id}: {type(e).__name__}: {e}")

    logger.info(f"Results: {len(results)} transcripts, {len(errors)} errors out of {len(req.video_ids)} videos")
    if errors:
        logger.info(f"Error details: {errors}")

    return results
