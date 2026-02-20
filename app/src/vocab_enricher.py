from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from openai import OpenAI

@dataclass
class EnrichConfig:
    model: str = "gpt-4.1-mini"  # good balance of quality/cost for structured text
    dialect: str = "American English"
    level: str = "C1"
    max_words_per_request: int = 80  # keep requests smaller to reduce failures
    timeout: Optional[float] = None  # e.g. 60.0

def _clean_words(words: List[str]) -> List[str]:
    cleaned: List[str] = []
    seen = set()
    for w in words:
        w2 = w.strip()
        if not w2:
            continue
        # normalize spacing (keep hyphens/apostrophes)
        w2 = re.sub(r"\s+", " ", w2)
        key = w2.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(w2)
    return cleaned

def _chunk(items: List[str], size: int) -> List[List[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]

def enrich_words_to_json(
    words: List[str],
    *,
    cfg: EnrichConfig = EnrichConfig(),
    client: Optional[OpenAI] = None,
) -> Dict[str, Any]:
    """
    Enriches a list of English vocabulary words and returns a strict JSON object:
    {
      "deck": {...metadata...},
      "items": [
        {
          "word": "...",
          "ipa": "...",
          "meaning": "...",
          "example": "...",
          "tags": ["C1", "business", "tech"],
          "pos": "noun|verb|adj|adv|phrase|other",
          "notes": "short usage note"
        }, ...
      ]
    }
    """
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing OPENAI_API_KEY env var (or pass an OpenAI client).")
        client = OpenAI(api_key=api_key)

    cleaned = _clean_words(words)
    if not cleaned:
        return {"deck": {"level": cfg.level, "dialect": cfg.dialect}, "items": []}
    
    schema = {
        "name": "vocab_enrichment",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "deck": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "level": {"type": "string"},
                        "dialect": {"type": "string"},
                        "source_words_count": {"type": "integer"},
                    },
                    "required": ["level", "dialect", "source_words_count"],
                },
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "word": {"type": "string"},
                            "ipa": {"type": "string"},
                            "pos": {
                                "type": "string",
                                "enum": ["noun", "verb", "adj", "adv", "phrase", "other"],
                            },
                            "meaning": {"type": "string"},
                            "example": {"type": "string"},
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "minItems": 0,
                            },
                            "notes": {"type": "string"},
                        },
                        "required": ["word", "ipa", "pos", "meaning", "example", "tags", "notes"],
                    },
                },
            },
            "required": ["deck", "items"],
        },
    }

    all_items: List[Dict[str, Any]] = []
    client = OpenAI()  # Usa a chave da variável de ambiente OPENAI_API_KEY
    for batch in _chunk(cleaned, cfg.max_words_per_request):
        prompt = f"""
            You are an {cfg.dialect} vocabulary teacher.
            Task: For each word provided, produce:
            - IPA (IPA symbols)
            - Part of speech (noun/verb/adj/adv/phrase/other)
            - Meaning: short, simple, interview-friendly definition (one sentence)
            - Example: one natural sentence usable in professional contexts
            - Tags: include "{cfg.level}" and 1–3 topic tags (e.g., business, tech, workplace, finance)
            - Notes: very short usage note (0–1 sentence). If none, write "".

            Rules:
            - Keep meaning and example concise.
            - Example must be safe and non-offensive.
            - Preserve the original word spelling exactly as given.
            Words:{json.dumps(batch, ensure_ascii=False)}""".strip()

        resp = client.chat.completions.create(
            model=cfg.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            timeout=cfg.timeout,
        )

        data = json.loads(resp.choices[0].message.content)

        items = data.get("items", [])
        all_items.extend(items)

        return {
        "deck": {
            "level": cfg.level,
            "dialect": cfg.dialect,
            "source_words_count": len(cleaned),
        },
        "items": all_items,
    }

if __name__ == "__main__":
    words = ["accountability", "alignment", "ambiguity", "amortize"]
    out = enrich_words_to_json(words)
    print(json.dumps(out, ensure_ascii=False, indent=2))
