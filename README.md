# Anki Cards Creator

Este projeto é um conjunto de ferramentas para automatizar a criação, enriquecimento e geração de mídia para flashcards do Anki, especialmente para vocabulário em inglês. Ele integra APIs de IA (OpenAI), TTS (text-to-speech), manipulação de imagens e a API AnkiConnect para facilitar a criação de decks ricos e multimídia.

## Funcionalidades

### 1. Enriquecimento de Vocabulário (`vocab_enricher.py`)
- Recebe uma lista de palavras em inglês e utiliza a API da OpenAI para gerar:
  - Transcrição fonética (IPA)
  - Classe gramatical (substantivo, verbo, etc.)
  - Definição curta e simples
  - Exemplo de uso profissional
  - Tags temáticas e de nível
  - Notas de uso
- Salva o resultado em JSON estruturado, pronto para pipeline de mídia e importação no Anki.

### 2. Geração de Mídia em Lote (`bulki_anki_media.py`)
- Lê um arquivo JSON com cards enriquecidos.
- Gera arquivos de áudio (palavra, significado, exemplo) usando TTS (edge_tts).
- Cria imagens placeholder para cada palavra.
- Organiza todos os arquivos de mídia em pastas datadas, prontos para serem usados no Anki.

### 3. Transcrição de Áudio (`transcribe_meaning.py`)
- Converte arquivos MP3 para WAV e transcreve o áudio usando a API do Google Speech Recognition.
- Útil para validar ou gerar textos a partir de áudios dos cards.

### 4. Integração com Anki (`anki.py` e notebook)
- Funções para criar decks, adicionar cards individualmente ou em lote via AnkiConnect.
- Suporte a modelos de card em português e inglês.
- Normalização de tags e tratamento de duplicatas.

### 5. Exemplo de Uso e Testes
- `anki_cartds_creator.ipynb`: Notebook com exemplos de uso das funções principais.
- `test_vocab_enricher.py`: Exemplo de teste do enriquecimento de vocabulário.

## Como Usar

1. **Enriquecer vocabulário:**
   - Edite/execute `vocab_enricher.py` com sua lista de palavras.
   - Salve o JSON gerado.
2. **Gerar mídia:**
   - Execute `bulki_anki_media.py` para criar áudios e imagens.
   - Os arquivos serão salvos em `generated_media/` e copiados para a pasta de mídia do Anki.
3. **Importar para o Anki:**
   - Use as funções de `anki.py` ou o notebook para criar decks e importar cards.
4. **Transcrever áudios (opcional):**
   - Use `transcribe_meaning.py` para obter texto a partir de arquivos de áudio.

## Requisitos
- Python 3.8+
- Pacotes: `openai`, `edge_tts`, `Pillow`, `speech_recognition`, `pydub`, `requests`, `pandas`
- Anki com o plugin [AnkiConnect](https://ankiweb.net/shared/info/2055492159) instalado e rodando

## Estrutura de Pastas
- `AnkiMedia/`: Pasta de mídia e arquivos de cards
- `generated_media/`: Arquivos de mídia gerados
- `Sample/`: Exemplos de arquivos e templates

## Observações
- Configure sua chave da OpenAI em `vocab_enricher.py`.
- Ajuste o caminho da pasta de mídia do Anki em `bulki_anki_media.py`.
- Os scripts são modulares e podem ser usados separadamente ou em pipeline.

---

Este projeto facilita a criação de decks de Anki ricos em conteúdo e mídia, acelerando o aprendizado de vocabulário com apoio de IA e automação.
