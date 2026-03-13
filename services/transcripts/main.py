"""
Topsnip Transcript Service
FastAPI microservice — fetches YouTube transcripts via youtube-transcript-api
Deploy on Railway (Hobby $5/month is sufficient)
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from typing import Dict, List
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Topsnip Transcript Service", version="1.0.0")

# Shared secret for authenticating requests from the Next.js app
TRANSCRIPT_SERVICE_SECRET = os.environ.get("TRANSCRIPT_SERVICE_SECRET", "")


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

    for video_id in req.video_ids:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=["en", "en-US", "en-GB"],
            )
            # Join all text segments into a single string
            full_text = " ".join(
                segment["text"].strip()
                for segment in transcript_list
                if segment.get("text", "").strip()
            )
            if full_text:
                results[video_id] = full_text
                logger.info(f"Fetched transcript for {video_id} ({len(full_text)} chars)")
        except (TranscriptsDisabled, NoTranscriptFound):
            logger.info(f"No transcript available for {video_id} — skipping")
        except Exception as e:
            logger.warning(f"Error fetching transcript for {video_id}: {e}")

    return results
