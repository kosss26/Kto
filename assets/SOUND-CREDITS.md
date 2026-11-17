# Звуки

Звуки животных — записи из Wikimedia Commons и xeno-canto, обрезаны до ~2 с,
очищены от шума и выровнены по громкости (`tools/cut-sound.py`).

| Звук | Источник | Автор | Лицензия |
|---|---|---|---|
| голубь | xeno-canto XC541143 | Marie-Lan Taÿ Pamart | CC BY-SA 4.0 |
| воробей | xeno-canto XC86749 | Jonathon Jongsma | CC BY-SA 3.0 |
| индюк | xeno-canto XC320490 | Jonathon Jongsma | CC BY-SA 3.0 |
| кукушка | xeno-canto XC542432 | Benoît Van Hecke | CC BY-SA 4.0 |
| соловей | xeno-canto XC546043 | Benoît Van Hecke | CC BY-SA 4.0 |
| малиновка | xeno-canto XC542566 | Benoît Van Hecke | CC BY-SA 4.0 |
| дятел | Wikimedia Commons, File:Great_Spotted_Woodpecker_drum.ogg | см. страницу файла | CC BY-SA 3.0 |
| чайка | xeno-canto XC707075 | см. страницу записи | CC0 |

Остальные звуки животных взяты из Wikimedia Commons в первой версии игры.

## Голос

Фразы «Где …?», «Это …!», «Молодец!», «Попробуй ещё!» синтезированы
Vosk TTS, модель `vosk-model-tts-ru-0.7-multi` (Apache-2.0), женский голос F02
(обучен на голосе «Наташа» из датасета SOVA), скриптом `tools/make-voice.py`.
Добавили животное в `content.ts` — запустите скрипт с флагом only-missing,
он озвучит только новое.
