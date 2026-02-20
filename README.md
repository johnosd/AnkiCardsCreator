# AnkiCardsCreator

Ferramentas para criar baralhos de vocabulario no Anki com pipeline automatizado:

1. enriquecer palavras com IA;
2. gerar midia (audio + imagem) em lote;
3. enviar cards para o Anki via AnkiConnect;
4. capturar frases/palavras e perguntas de extensoes de navegador.

## Funcionalidades

### 1) Enriquecimento de vocabulario (`app/src/vocab_enricher.py`)
- Recebe lista de palavras em ingles.
- Gera para cada item: `word`, `ipa`, `pos`, `meaning`, `example`, `tags`, `notes`.
- Usa OpenAI com configuracao de nivel (`C1` por padrao), dialeto e tamanho maximo de lote.
- Retorna JSON pronto para o fluxo de midia/importacao.

### 2) Geracao de midia (`app/src/bulki_anki_media.py`)
- Le `AnkiMedia/cards.json`.
- Gera TTS com `edge_tts` para:
  - pronuncia da palavra (`word_*.mp3`);
  - significado (`meaning_*.mp3`);
  - exemplo (`example_*.mp3`).
- Gera imagem placeholder (`img_*.jpg`) com Pillow.
- Cria pasta datada em `AnkiMedia/<timestamp>/` e copia:
  - todos os arquivos de midia;
  - backup de `cards.json`;
  - backup de `50_words_c1.tsv` (se existir).

### 3) Integracao com Anki (`app/src/anki.py`)
- Wrapper para API do AnkiConnect (`http://localhost:8765`).
- Lista modelos e campos do modelo.
- Cria deck (`ensure_deck`).
- Cria card unico (`anki_create_card`) com tentativa automatica de mapear campos `Front/Back` e `Frente/Verso`.
- Cria cards em lote (`anki_create_cards_batch`) com opcao para ignorar duplicados.

### 4) Transcricao de audio (`app/src/transcribe_meaning.py`)
- Converte MP3 para WAV (`pydub`).
- Transcreve com Google Speech Recognition (`speech_recognition`).
- Util para validar audio gerado.

### 5) Extensao Chrome: Word & Phrase Catcher (`app/Utils/extensoes_chrome/word_catcher`)
- Captura selecao de texto:
  - duplo clique;
  - atalho `Ctrl+Shift+Y`.
- Salva localmente na extensao.
- Exporta lista para TXT.
- Permite limpar lista capturada.

### 6) Extensao Chrome: Udemy QA Scraper (`app/Utils/extensoes_chrome/udemy_scraper_QA_extension`)
- Extrai perguntas/respostas corretas de simulados da Udemy.
- Funciona em modo sidebar e pagina de revisao.
- Mostra painel com status, contadores e log.
- Exporta JSON para uso posterior no pipeline de cards.

## Estrutura principal

- `app/src/`: scripts Python principais.
- `app/tests/`: teste/exemplo simples do enriquecimento.
- `app/Utils/extensoes_chrome/word_catcher/`: extensao para capturar palavras/frases.
- `app/Utils/extensoes_chrome/udemy_scraper_QA_extension/`: extensao para extrair QA da Udemy.
- `AnkiMedia/`: entrada e saida de dados de cards/midia.
- `app/Sample/`: exemplos de JSON/TSV e templates de card.

## Requisitos

- Python 3.10+ recomendado.
- Dependencias Python:
  - `openai`
  - `edge-tts`
  - `Pillow`
  - `requests`
  - `speechrecognition`
  - `pydub`
  - `pandas` (atualmente nao essencial)
- `ffmpeg` instalado (necessario para `pydub` converter MP3 -> WAV).
- Anki Desktop com addon AnkiConnect ativo.
- Para enriquecimento com IA: variavel `OPENAI_API_KEY`.

## Setup rapido

```bash
python -m venv .venv
.venv\Scripts\activate
pip install openai edge-tts Pillow requests speechrecognition pydub pandas
```

Configure a chave da OpenAI no terminal (PowerShell):

```powershell
$env:OPENAI_API_KEY="sua_chave_aqui"
```

## Fluxo recomendado (fim a fim)

1. Gerar/enriquecer vocabulario em JSON com `app/src/vocab_enricher.py`.
2. Salvar o resultado em `AnkiMedia/cards.json`.
3. Gerar midia com `app/src/bulki_anki_media.py`.
4. Importar cards para Anki com funcoes de `app/src/anki.py` (ou via TSV/JSON no seu fluxo).

## Exemplos de execucao

```bash
python app/src/vocab_enricher.py
python app/src/bulki_anki_media.py
python app/src/transcribe_meaning.py
python app/src/anki.py
```

## Como usar a extensao `word_catcher` (Chrome)

### 1) Adicionar no Chrome (modo desenvolvedor)

1. Abra `chrome://extensions/`.
2. Ative `Developer mode` (canto superior direito).
3. Clique em `Load unpacked`.
4. Selecione a pasta `app/Utils/extensoes_chrome/word_catcher`.
5. A extensao `Word & Phrase Catcher` vai aparecer na lista.

### 2) Capturar palavras/frases

1. Abra qualquer pagina no Chrome.
2. Selecione um texto com o mouse (ao soltar, a extensao captura).
3. Opcional: use `Ctrl+Shift+Y` para capturar a selecao atual.
4. Clique no icone da extensao para abrir o painel flutuante.
5. No painel, voce pode:
   - revisar a lista capturada;
   - `Exportar TXT`;
   - `Limpar`.

### 3) Exportar os dados

1. No painel da extensao, clique em `Exportar TXT`.
2. O Chrome baixa o arquivo `captured_words_phrases.txt` (uma linha por item).

### 4) Salvar em `AnkiMedia/words.tsv`

No PowerShell, a partir da raiz do projeto:

```powershell
# ajuste o caminho de Downloads se necessario
Copy-Item "$env:USERPROFILE\Downloads\captured_words_phrases.txt" "app\src\AnkiMedia\words.tsv" -Force
```

Opcional (remover linhas vazias e duplicadas, mantendo 1 item por linha):

```powershell
Get-Content "app\src\AnkiMedia\words.tsv" |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -ne "" } |
  Sort-Object -Unique |
  Set-Content "app\src\AnkiMedia\words.tsv"
```

## Observacoes importantes

- Os scripts usam caminhos relativos em alguns pontos; execute a partir da raiz do projeto para evitar erro de caminho.
- O teste em `app/tests/test_vocab_enricher.py` esta mais proximo de um exemplo de uso do que de um teste unitario completo.
- O projeto contem muitos artefatos de midia gerados; considere versionar apenas exemplos e ignorar saidas grandes no Git.
