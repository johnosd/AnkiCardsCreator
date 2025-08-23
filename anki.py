import pandas as pd, requests

import requests

ANKI_URL = "http://localhost:8765"

def _anki(action, **params):
    resp = requests.post(
        ANKI_URL,
        json={"action": action, "version": 6, "params": params},
        timeout=10
    ).json()
    if resp.get("error"):
        raise RuntimeError(f"AnkiConnect error: {resp['error']}")
    return resp.get("result")

# Utilitários para inspecionar modelos/campos
def anki_list_models():
    return _anki("modelNames")

def anki_list_model_fields(model_name: str):
    return _anki("modelFieldNames", modelName=model_name)

# Normalização de tags
def _normalize_tags(tags):
    if tags is None:
        return []
    if isinstance(tags, str):
        return [t.strip() for t in tags.replace(";", " ").split() if t.strip()]
    if isinstance(tags, (list, tuple, set)):
        return [str(t).strip() for t in tags if str(t).strip()]
    return [str(tags).strip()]

# (Opcional) garantir deck externamente
def ensure_deck(deck_name: str):
    return _anki("createDeck", deck=deck_name)

# Criação robusta de card (tenta mapear nomes de campos)
def anki_create_card(
    deck_name: str,
    model_name: str,
    front,
    back,
    tags=None,
    allowDuplicate: bool=False,
    duplicate_scope: str="collection",         # "collection" (padrão) ou "deck"
    duplicate_scope_options: dict | None=None  # ex.: {"deckName": deck_name, "checkChildren": False}
):
    fields_in_model = anki_list_model_fields(model_name)  # ex.: ["Frente","Verso"] ou ["Front","Back"]

    # Tenta mapeamentos comuns PT/EN; se não achar, usa os 2 primeiros campos
    candidates = [
        {"Front": str(front), "Back": str(back)},
        {"Frente": str(front), "Verso": str(back)},
    ]
    note_fields = None
    for cand in candidates:
        if all(k in fields_in_model for k in cand.keys()):
            note_fields = {k: cand[k] for k in cand}
            break
    if note_fields is None:
        if not fields_in_model:
            raise RuntimeError("Modelo sem campos.")
        note_fields = {fields_in_model[0]: str(front)}
        if len(fields_in_model) >= 2:
            note_fields[fields_in_model[1]] = str(back)

    # Validação de conteúdo não vazio
    if not any((v or "").strip() for v in note_fields.values()):
        raise RuntimeError("Campos vazios: forneça 'front' e/ou 'back' com conteúdo.")

    # Opções de duplicidade
    opts = {"allowDuplicate": bool(allowDuplicate), "duplicateScope": duplicate_scope}
    if duplicate_scope == "deck":
        opts["duplicateScopeOptions"] = duplicate_scope_options or {
            "deckName": deck_name,
            "checkChildren": False
        }

    note = {
        "deckName": deck_name,
        "modelName": model_name,
        "fields": note_fields,
        "options": opts,
        "tags": _normalize_tags(tags),
    }
    return _anki("addNote", note=note)

# Batch (reaproveitando a função de 1 card)
def anki_create_cards_batch(
    deck_name: str,
    model_name: str,
    cards,
    allowDuplicate: bool=False,
    duplicate_scope: str="collection",   # "collection" ou "deck"
    skip_duplicates: bool=False
):
    """
    cards: lista de dicts {"front": ..., "back": ..., "tags": ...}
    Retorna: lista de noteIds (None para os que não foram criados).
    """
    results = []
    for c in cards:
        try:
            nid = anki_create_card(
                deck_name=deck_name,
                model_name=model_name,
                front=c.get("front", ""),
                back=c.get("back", ""),
                tags=c.get("tags"),
                allowDuplicate=allowDuplicate,
                duplicate_scope=duplicate_scope,
                duplicate_scope_options={"deckName": deck_name, "checkChildren": False}
                    if duplicate_scope == "deck" else None,
            )
            results.append(nid)
        except RuntimeError as e:
            msg = str(e).lower()
            # Pula duplicados se solicitado
            if skip_duplicates and "duplicate" in msg:
                results.append(None)
                continue
            # Propaga outros erros
            raise
    return results

if __name__ == "__main__":
    deck = "MeuDeckExterno"
    ensure_deck(deck)  # se já existir, tudo bem

    cards = [
        {"front": "Capital de Portugal?", "back": "Lisboa", "tags": "geografia"},
        {"front": "Capital da Espanha?", "back": "Madri", "tags": "geografia"},
        {"front": "Maior planeta?", "back": "Júpiter", "tags": "astronomia"},
        {"front": "Pintor da Mona Lisa?", "back": "Leonardo da Vinci", "tags": "arte"},
        {"front": "7 x 8 = ?", "back": "56", "tags": "matematica"},
        {"front": "Autor de Dom Casmurro?", "back": "Machado de Assis", "tags": "literatura"},
        {"front": "Símbolo do ouro?", "back": "Au", "tags": "quimica"},
        {"front": "Independência do Brasil (ano)?", "back": "1822", "tags": "historia"},
        {"front": "Velocidade da luz (km/s)?", "back": "300000", "tags": "fisica"},
        {"front": "Planeta vermelho?", "back": "Marte", "tags": "astronomia"},
    ]

    note_ids = anki_create_cards_batch(
        deck_name=deck,
        model_name="Básico",      # ou "Basic" no Anki em inglês
        cards=cards,
        allowDuplicate=False,
        duplicate_scope="collection",  # ou "deck"
        skip_duplicates=True
    )
    print("IDs criados:", note_ids)