#!/usr/bin/env python3
"""Scan messages/, images/real/, images/real/icons/ and images/fake/ and
regenerate data.json. Run this again after adding/removing people or fakes."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESSAGES_DIR = os.path.join(ROOT, "messages")
REAL_DIR = os.path.join(ROOT, "images", "real")
ICONS_DIR = os.path.join(REAL_DIR, "icons")
FAKE_DIR = os.path.join(ROOT, "images", "fake")

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")
SMALL_WORDS = {"y", "i", "de", "del", "la", "el", "els", "les"}


def display_name(stem):
    words = stem.split(" ")
    out = []
    for idx, w in enumerate(words):
        if idx > 0 and w.lower() in SMALL_WORDS:
            out.append(w.lower())
        else:
            out.append(w[:1].upper() + w[1:] if w else w)
    return " ".join(out)


def find_with_ext(directory, stem):
    for ext in IMAGE_EXTS:
        path = os.path.join(directory, stem + ext)
        if os.path.exists(path):
            return os.path.basename(path)
    return None


def build_people():
    people = []
    for fname in sorted(os.listdir(MESSAGES_DIR)):
        if not fname.endswith(".txt"):
            continue
        stem = fname[:-4]
        image = find_with_ext(REAL_DIR, stem)
        icon = find_with_ext(ICONS_DIR, stem)
        if not image:
            print(f"WARNING: no image in images/real for '{stem}', skipping")
            continue
        if not icon:
            print(f"WARNING: no icon in images/real/icons for '{stem}', skipping")
            continue
        people.append({
            "id": stem,
            "name": display_name(stem),
            "message": f"messages/{fname}",
            "image": f"images/real/{image}",
            "icon": f"images/real/icons/{icon}",
        })
    return people


def build_fakes():
    fakes = []
    for fname in sorted(os.listdir(FAKE_DIR)):
        if not fname.lower().endswith(IMAGE_EXTS):
            continue
        stem = os.path.splitext(fname)[0]
        fakes.append({
            "name": display_name(stem),
            "icon": f"images/fake/{fname}",
        })
    return fakes


def main():
    data = {
        "people": build_people(),
        "fakes": build_fakes(),
    }
    out_path = os.path.join(ROOT, "data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}: {len(data['people'])} people, {len(data['fakes'])} fakes")


if __name__ == "__main__":
    main()
