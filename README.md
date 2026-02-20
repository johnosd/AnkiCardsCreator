# AnkiCardsCreator

Ferramentas para criar baralhos de vocabulario no Anki com pipeline automatizado.

## Indice

1. [Uso das extensoes (primeiro)](#uso-das-extensoes-primeiro)
2. [Scripts Python](#scripts-python)
3. [Fluxo recomendado](#fluxo-recomendado)
4. [Estrutura do projeto](#estrutura-do-projeto)
5. [Requisitos e setup](#requisitos-e-setup)
6. [Exemplos de execucao](#exemplos-de-execucao)
7. [Observacoes](#observacoes)

## Uso das extensoes (primeiro)

### 1) Extensao `word_catcher` (Word & Phrase Catcher)

Pasta da extensao: `app/Utils/extensoes_chrome/word_catcher`

Uso ideal: para quem esta lendo artigos/sites e encontra palavras ou frases desconhecidas.  
Com o `word_catcher`, voce seleciona essas palavras/frases para gerar cards do Anki depois.

#### Como adicionar no Chrome

1. Abra `chrome://extensions/`.
2. Ative `Developer mode`.
3. Clique em `Load unpacked`.
4. Selecione `app/Utils/extensoes_chrome/word_catcher`.

#### Como usar e exportar

1. Abra qualquer pagina e selecione um texto com o mouse.
2. A extensao captura automaticamente a selecao (tambem aceita `Ctrl+Shift+Y`).
3. Clique no icone da extensao para abrir o painel flutuante.
4. Revise a lista e clique em `Exportar TXT`.
5. O arquivo baixado sera `captured_words_phrases.txt`.

#### Como salvar em `AnkiMedia/words.tsv` e gerar midia

1. Crie um AgenteGPT usando o prompt `prompts/prompt_anki_deck_generator.md`.
2. Cole no AgenteGPT a lista de palavras/frases (do TXT exportado).
3. Aguarde a saida no formato `.tsv`.
4. Copie a saida e cole em `app/src/AnkiMedia/words.tsv`.
5. Rode:

```powershell
python app/src/bulki_anki_media.py
```

### 2) Extensao `udemy_scraper_QA_extension`

Pasta da extensao: `app/Utils/extensoes_chrome/udemy_scraper_QA_extension`

A extensao `udemy_scraper_QA_extension` serve para extrair perguntas e respostas corretas de simulados (quizzes) da Udemy diretamente do navegador. Ela adiciona um painel flutuante na pagina do simulado e permite:

1. Iniciar a coleta automatica das perguntas respondidas e das respostas corretas.
2. Coletar tanto no modo sidebar (durante o simulado) quanto na pagina de revisao (apos terminar).
3. Visualizar o progresso da coleta (quantidade de perguntas e respostas extraidas).
4. Baixar os dados coletados em JSON para uso posterior (ex.: criar flashcards no Anki).
5. Parar a coleta a qualquer momento.

Detalhe tecnico do comportamento:

1. A extensao identifica automaticamente o contexto da pagina (simulado ativo ou revisao).
2. Percorre as perguntas respondidas.
3. Extrai texto da pergunta, respostas corretas, explicacoes e tags (quando disponiveis).
4. Armazena localmente ate o usuario baixar o JSON.

## Scripts Python

### 1) Enriquecimento de vocabulario (`app/src/vocab_enricher.py`)
- Recebe lista de palavras em ingles.
- Gera para cada item: `word`, `ipa`, `pos`, `meaning`, `example`, `tags`, `notes`.
- Usa OpenAI com configuracao de nivel (`C1` por padrao), dialeto e tamanho maximo de lote.
- Retorna JSON pronto para o fluxo de midia/importacao.

### 2) Geracao de midia (`app/src/bulki_anki_media.py`)
- Le `app/src/AnkiMedia/cards.json`.
- Gera TTS para `word`, `meaning` e `example`.
- Gera imagem placeholder (`img_*.jpg`) com Pillow.
- Cria pasta datada em `app/src/AnkiMedia/<timestamp>/` com backup de saidas.

### 3) Integracao com Anki (`app/src/anki.py`)
- Wrapper para API do AnkiConnect (`http://localhost:8765`).
- Lista modelos e campos.
- Cria deck e cards (unitario e em lote), com suporte a mapeamento de campos.

### 4) Transcricao de audio (`app/src/transcribe_meaning.py`)
- Converte MP3 para WAV (`pydub`).
- Transcreve com Google Speech Recognition (`speech_recognition`).

## Fluxo recomendado

1. Capturar palavras/frases com `word_catcher`.
2. Gerar o `.tsv` via AgenteGPT usando `prompts/prompt_anki_deck_generator.md`.
3. Salvar em `app/src/AnkiMedia/words.tsv`.
4. Preparar `app/src/AnkiMedia/cards.json` para o pipeline de midia.
5. Rodar `python app/src/bulki_anki_media.py`.
6. Importar no Anki com funcoes de `app/src/anki.py`.

## Estrutura do projeto

- `app/src/`: scripts Python principais.
- `app/tests/`: testes/exemplos.
- `app/Utils/extensoes_chrome/word_catcher/`: extensao de captura de palavras/frases.
- `app/Utils/extensoes_chrome/udemy_scraper_QA_extension/`: extensao de extracao QA da Udemy.
- `app/src/AnkiMedia/`: entrada e saida de dados de cards/midia.
- `app/Sample/`: exemplos de JSON/TSV e templates de card.

## Requisitos e setup

- Python 3.10+ recomendado.
- Dependencias Python:
  - `openai`
  - `edge-tts`
  - `Pillow`
  - `requests`
  - `speechrecognition`
  - `pydub`
  - `pandas`
- `ffmpeg` instalado (para conversao MP3 -> WAV com `pydub`).
- Anki Desktop com addon AnkiConnect ativo.
- Para enriquecimento com IA: `OPENAI_API_KEY`.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install openai edge-tts Pillow requests speechrecognition pydub pandas
```

PowerShell:

```powershell
$env:OPENAI_API_KEY="sua_chave_aqui"
```

## Exemplos de execucao

```bash
python app/src/vocab_enricher.py
python app/src/bulki_anki_media.py
python app/src/transcribe_meaning.py
python app/src/anki.py
```

## Observacoes

- Execute os scripts a partir da raiz do projeto para evitar erros de caminho.
- `app/tests/test_vocab_enricher.py` esta mais proximo de exemplo de uso do que de teste unitario completo.
- O projeto contem muitos artefatos de midia gerados; considere ignorar saidas grandes no Git.
