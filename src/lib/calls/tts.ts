import textToSpeech from "@google-cloud/text-to-speech";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { config } from "@/config";

const ttsClient = new textToSpeech.TextToSpeechClient();

export async function synthesizeSpeech(
  text: string,
  filename: string
): Promise<string> {
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: config.googleTts.languageCode,
      ssmlGender: "NEUTRAL",
      name: "uz-UZ-Standard-A",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.95,
      pitch: 0,
    },
  });

  const audioContent = response.audioContent as Buffer;
  const dir = join(config.storage.uploadDir, "tts");
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, `${filename}.mp3`);
  await writeFile(filePath, audioContent);

  return `${config.app.url}/uploads/tts/${filename}.mp3`;
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const response = await fetch(config.whisper.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: audioUrl }),
  });

  if (!response.ok) throw new Error("Whisper transcription failed");

  const data = await response.json() as { text: string };
  return data.text || "";
}
