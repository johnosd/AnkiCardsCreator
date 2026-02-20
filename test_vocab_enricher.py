from vocab_enricher import enrich_words_to_json

words = ["accountability", "alignment", "ambiguity"]
data = enrich_words_to_json(words)

# Save JSON for your TTS pipeline
import json
with open("vocab.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)