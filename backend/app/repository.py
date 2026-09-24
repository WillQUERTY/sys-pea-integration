import json
import os
from typing import List, Dict
from .models import Group

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "groups.json")

# Ensure data directory exists
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

# Load existing data or start empty
if os.path.exists(DATA_FILE):
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        _store: List[Dict] = json.load(f)
else:
    _store: List[Dict] = []

def _save_store():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(_store, f, ensure_ascii=False, indent=2)

def list_groups() -> List[Group]:
    return [Group(**item) for item in _store]

def get_group(group_id: int) -> Group:
    for item in _store:
        if item["id"] == group_id:
            return Group(**item)
    raise KeyError(f"Group {group_id} not found")

def create_group(group: Group) -> Group:
    # Simple auto‑increment id
    next_id = max([g["id"] for g in _store], default=0) + 1
    data = group.dict()
    data["id"] = next_id
    _store.append(data)
    _save_store()
    return Group(**data)
