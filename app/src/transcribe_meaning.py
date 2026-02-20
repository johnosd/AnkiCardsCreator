import speech_recognition as sr
from pydub import AudioSegment
import os

def transcribe_audio(audio_path):
    recognizer = sr.Recognizer()
    # Convert mp3 to wav
    wav_path = audio_path.replace('.mp3', '.wav')
    if not os.path.exists(wav_path):
        sound = AudioSegment.from_mp3(audio_path)
        sound.export(wav_path, format="wav")
    with sr.AudioFile(wav_path) as source:
        audio = recognizer.record(source)
    try:
        text = recognizer.recognize_google(audio)
        return text
    except Exception as e:
        return f"Erro: {e}"

if __name__ == "__main__":
    audio_files = [
        "generated_media/meaning_artificial_inteligence.mp3",
        "generated_media/meaning_large_language_model.mp3"
    ]
    for audio_file in audio_files:
        print(f"Arquivo: {audio_file}")
        print("Transcrição:", transcribe_audio(audio_file))
