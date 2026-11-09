"""
IBM watsonx AI Service
Primary model  : ibm/granite-4-h-small  (text chat)
Vision model   : meta-llama/llama-4-maverick-17b-128e-instruct-fp8  (image + text chat)
Auth           : IBM IAM token exchange (API key → Bearer token, cached 50 min)
"""
import json
import re
import time
import asyncio
import base64
from typing import Any, Dict, List, Optional

import requests

from app.config import settings

# ─── Configuration ────────────────────────────────────────────────────────────
IBM_API_KEY   = "aXB8S0VhsI2v_bwaJ5NHks2ndgReCdtWjLiyBTAHyCPR"
IBM_PROJECT   = "858f90ab-a928-4103-8fff-9f4da13b9e29"
CHAT_MODEL    = "ibm/granite-4-h-small"
VISION_MODEL  = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8"
CHAT_URL      = "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29"
IAM_URL       = "https://iam.cloud.ibm.com/identity/token"

SYSTEM_PROMPT = (
    "You are NagrikAI, an intelligent assistant that helps Indian citizens discover "
    "government schemes, check eligibility, understand application procedures, and "
    "navigate official government portals. You provide accurate, helpful, step-by-step "
    "guidance about Indian government services including but not limited to: Driving Licence, "
    "Passport, Aadhaar, PAN Card, Voter ID, Ration Card, scholarships, farmer schemes, "
    "health schemes, housing schemes, employment schemes, and certificates. "
    "Always cite official government portal URLs. "
    "Never fabricate scheme names, deadlines, or eligibility criteria. "
    "If unsure, say so and direct users to the official portal."
)


# ─── IAM Token Cache ──────────────────────────────────────────────────────────
_iam_cache: Dict[str, Any] = {"token": None, "expires_at": 0.0}

def _get_iam_token() -> str:
    """Return a valid IBM IAM Bearer token, refreshing if within 5 min of expiry."""
    now = time.time()
    if _iam_cache["token"] and now < _iam_cache["expires_at"] - 300:
        return _iam_cache["token"]

    resp = requests.post(
        IAM_URL,
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": IBM_API_KEY,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    _iam_cache["token"] = data["access_token"]
    _iam_cache["expires_at"] = now + data.get("expires_in", 3600)
    return _iam_cache["token"]


def _count_tokens(text: str) -> int:
    return max(len(text) // 4, 1)


def _estimate_cost(input_tok: int, output_tok: int) -> float:
    # granite-4-h-small pricing approximation
    return (input_tok / 1_000_000) * 0.10 + (output_tok / 1_000_000) * 0.40


# ─── Core sync caller (run in executor for async compat) ─────────────────────
def _call_watsonx_chat(
    messages: List[Dict],
    model: str = CHAT_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    """Synchronous watsonx chat call. Returns standardised result dict."""
    token = _get_iam_token()
    payload = {
        "model_id": model,
        "messages": messages,
        "parameters": {"max_new_tokens": max_tokens, "temperature": temperature},
        "project_id": IBM_PROJECT,
    }
    resp = requests.post(
        CHAT_URL,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    if resp.status_code != 200:
        error_msg = resp.json().get("errors", [{}])[0].get("message", resp.text[:200])
        return {"success": False, "error": error_msg, "text": "", "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0, "model": model}

    data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    input_tok  = usage.get("prompt_tokens", _count_tokens(str(messages)))
    output_tok = usage.get("completion_tokens", _count_tokens(text))
    return {
        "success": True,
        "text": text,
        "input_tokens": input_tok,
        "output_tokens": output_tok,
        "estimated_cost": _estimate_cost(input_tok, output_tok),
        "model": model,
    }


# ─── WatsonxService ───────────────────────────────────────────────────────────
class WatsonxService:
    """Wraps IBM watsonx; exposes the same interface the agents expect."""

    def __init__(self):
        self.model_name = CHAT_MODEL
        self._demo = False  # always live – no demo mode

    # ── Internal helpers ──────────────────────────────────────────────────────
    def _build_messages(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> List[Dict]:
        sys = system_instruction or SYSTEM_PROMPT
        return [
            {"role": "system", "content": sys},
            {"role": "user",   "content": prompt},
        ]

    async def _async_call(self, *args, **kwargs) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: _call_watsonx_chat(*args, **kwargs))

    # ── Public API used by agents ──────────────────────────────────────────────
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        response_format: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a text response from IBM watsonx Granite."""
        if response_format == "json":
            prompt = prompt + "\n\nIMPORTANT: Reply with ONLY valid JSON. No markdown, no code fences."
        messages = self._build_messages(prompt, system_instruction)
        return await self._async_call(messages, model=CHAT_MODEL, max_tokens=max_tokens, temperature=temperature)

    async def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate and parse a JSON response."""
        result = await self.generate(prompt, system_instruction, response_format="json")
        if not result["success"]:
            return result

        text = result["text"].strip()
        # Strip markdown code fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()

        # Find first JSON object or array
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
        if match:
            text = match.group(1)

        try:
            result["parsed"] = json.loads(text)
        except json.JSONDecodeError:
            result["parsed"] = {"raw": text}

        return result

    async def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        question: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """Analyse an uploaded image using the vision-capable Llama model."""
        img_b64 = base64.b64encode(image_bytes).decode("utf-8")
        lang_note = ""
        if language == "kn":
            lang_note = " Please respond in Kannada."
        elif language == "hi":
            lang_note = " Please respond in Hindi."

        messages = [
            {
                "role": "system",
                "content": (
                    "You are NagrikAI, an assistant that helps Indian citizens with government "
                    "services. When shown an image of a government document, form, notice, or "
                    "issue, analyse it carefully and provide accurate, actionable guidance."
                    + lang_note
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text",      "text": question or "Analyse this image and provide relevant government service guidance."},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{img_b64}"}},
                ],
            },
        ]
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: _call_watsonx_chat(messages, model=VISION_MODEL, max_tokens=1024, temperature=0.3),
        )

    async def chat(
        self,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """Multi-turn chat with a pre-built message list."""
        if not any(m.get("role") == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: _call_watsonx_chat(messages, model=CHAT_MODEL, max_tokens=max_tokens, temperature=temperature),
        )


# ─── Singleton ────────────────────────────────────────────────────────────────
watsonx_service = WatsonxService()
gemini_service = watsonx_service  # backward-compat alias
