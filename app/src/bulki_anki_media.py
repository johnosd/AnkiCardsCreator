import asyncio
import json
import os
import re
import shutil
from pathlib import Path

import edge_tts
from PIL import Image, ImageDraw, ImageFont

# ---------- CONFIG ----------
# Set this to your Anki media folder (Windows default paths shown below).
# Find it in Anki: Tools -> Check Media -> "View Files" (or open the media folder).
ANKI_MEDIA_DIR = r"C:\Users\johns\Documents\Projetos\AnkiCardsCreator\app\src\AnkiMedia\cards.json"  # Exemplo: "C:\\Users\\YourName\\Documents\\Anki\\User 1\\collection.media"

# Voice choices (pick one and keep consistent)
VOICE_WORD = "en-US-AriaNeural"
VOICE_TEXT = "en-US-GuyNeural"

# Speech rate (optional): "+0%", "+10%", "-10%"
RATE = "-10%"

# Image settings
IMG_W, IMG_H = 900, 600
# ---------------------------


def safe_slug(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


async def tts_to_mp3(text: str, out_path: Path, voice: str):
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=RATE)
    await communicate.save(str(out_path))


def make_placeholder_image(word: str, out_path: Path):
    img = Image.new("RGB", (IMG_W, IMG_H), "white")
    draw = ImageDraw.Draw(img)

    # Try a common font; fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", 80)
        font_small = ImageFont.truetype("arial.ttf", 28)
    except:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Center the word
    bbox = draw.textbbox((0, 0), word, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (IMG_W - text_w) // 2
    y = (IMG_H - text_h) // 2 - 30

    draw.text((x, y), word, fill="black", font=font)

    # Small hint line
    hint = "Visual cue placeholder (replace later if you want)."
    draw.text((30, IMG_H - 60), hint, fill="black", font=font_small)

    img.save(out_path, "JPEG", quality=92)


async def main():
    anki_media_base = Path(ANKI_MEDIA_DIR).expanduser().parent
    # Cria subpasta nova com data/hora
    from datetime import datetime
    now_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    anki_media = anki_media_base / now_str
    anki_media.mkdir(exist_ok=True)

    cards_path = Path("app/src/AnkiMedia/cards.json")
    if not cards_path.exists():
        raise SystemExit("Missing AnkiMedia/cards.json. Save the AI 'JSON PACK' as cards.json in AnkiMedia.")

    cards = json.loads(cards_path.read_text(encoding="utf-8"))

    out_dir = Path("generated_media")
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(exist_ok=True)

    tasks = []
    for c in cards:
        word = c["Word"].strip()
        meaning = c["Meaning"].strip()
        example = c["Example"].strip()
        slug = c.get("slug") or safe_slug(word)

        word_mp3 = out_dir / f"word_{slug}.mp3"
        meaning_mp3 = out_dir / f"meaning_{slug}.mp3"
        example_mp3 = out_dir / f"example_{slug}.mp3"
        img_jpg = out_dir / f"img_{slug}.jpg"

        # Audio text content: keep it exactly aligned with your Anki back format
        meaning_text = meaning
        example_text = example

        # Queue TTS jobs
        tasks.append(tts_to_mp3(word, word_mp3, VOICE_WORD))
        tasks.append(tts_to_mp3(meaning_text, meaning_mp3, VOICE_TEXT))
        tasks.append(tts_to_mp3(example_text, example_mp3, VOICE_TEXT))

        # Image (sync)
        make_placeholder_image(word, img_jpg)

    # Run TTS concurrently
    await asyncio.gather(*tasks)

    # Copia para subpasta nova
    for f in out_dir.iterdir():
        dest = anki_media / f.name
        shutil.copy2(f, dest)

    # Salva backup do cards.json
    backup_json = anki_media / "cards.json"
    shutil.copy2(cards_path, backup_json)

    # Salva backup do arquivo .tsv correspondente, se existir
    tsv_path = Path("AnkiMedia/50_words_c1.tsv")
    if tsv_path.exists():
        backup_tsv = anki_media / tsv_path.name
        shutil.copy2(tsv_path, backup_tsv)

    print("Done.")
    print(f"Copied {len(list(out_dir.iterdir()))} media files, cards.json and .tsv into: {anki_media}")


if __name__ == "__main__":
    asyncio.run(main())
