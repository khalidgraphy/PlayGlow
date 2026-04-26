#!/usr/bin/env python3
"""Fetch 100 kid-friendly photos from Wikipedia REST summary API.

Curated for South Asian + Gulf audience: animals, fruits, vegetables, food,
body parts, household objects, vehicles, nature. Universally recognisable,
no cultural sensitivity issues.

Output: public/words/{slug}.jpg, max 256px square (resized via sips).
Re-runnable: skips slugs that already have a file.
"""
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request

UA = "PlayGlow-WordImageBot/1.0 (kids learning PWA, https://github.com/khalidgraphy/PlayGlow)"
OUT_DIR = "public/words"

# slug -> Wikipedia article title
# Curated for South Asian (Pakistan/India) + Gulf (UAE/KSA) audiences.
# Each category 18-20 entries; total ~155.
WORDS = {
    # ---- Animals (24) ----
    "cat": "Cat", "dog": "Dog", "cow": "Cattle", "horse": "Horse",
    "sheep": "Sheep", "goat": "Goat", "lion": "Lion", "tiger": "Tiger",
    "elephant": "Elephant", "giraffe": "Giraffe", "zebra": "Zebra",
    "monkey": "Monkey", "rabbit": "Rabbit", "fish": "Fish", "bird": "Bird",
    "parrot": "Parrot", "owl": "Owl", "butterfly": "Butterfly",
    "bee": "Bee", "snake": "Snake", "peacock": "Peafowl",
    "camel": "Camel", "frog": "Frog", "duck": "Duck",

    # ---- Fruits (20) ----
    "apple": "Apple", "banana": "Banana", "orange": "Orange (fruit)",
    "grapes": "Grape", "mango": "Mango", "watermelon": "Watermelon",
    "strawberry": "Strawberry", "pineapple": "Pineapple",
    "kiwi": "Kiwifruit", "cherry": "Cherry", "pear": "Pear",
    "lemon": "Lemon", "peach": "Peach", "pomegranate": "Pomegranate",
    "dates": "Date palm", "papaya": "Papaya", "fig": "Fig",
    "coconut": "Coconut", "melon": "Melon", "guava": "Guava",

    # ---- Vegetables (18) — added regional staples ----
    "carrot": "Carrot", "potato": "Potato", "tomato": "Tomato",
    "onion": "Onion", "cucumber": "Cucumber", "broccoli": "Broccoli",
    "corn": "Maize", "lettuce": "Lettuce", "eggplant": "Eggplant",
    "garlic": "Garlic", "pepper": "Bell pepper", "mushroom": "Mushroom",
    "ginger": "Ginger", "spinach": "Spinach", "peas": "Pea",
    "okra": "Okra", "cabbage": "Cabbage", "radish": "Radish",

    # ---- Food / drink (18) — South Asian + Gulf staples ----
    "bread": "Bread", "rice": "Rice", "milk": "Milk", "water": "Water",
    "juice": "Juice", "egg": "Egg as food", "cheese": "Cheese",
    "cake": "Cake", "pizza": "Pizza", "chocolate": "Chocolate",
    "naan": "Naan", "paratha": "Paratha", "biryani": "Biryani",
    "samosa": "Samosa", "kebab": "Kebab", "hummus": "Hummus",
    "falafel": "Falafel", "yogurt": "Yogurt",

    # ---- Body parts (18) ----
    "eye": "Eye", "ear": "Ear", "nose": "Human nose",
    "hand": "Hand", "foot": "Foot", "tooth": "Tooth",
    "mouth": "Mouth", "lip": "Lip", "tongue": "Tongue",
    "hair": "Hair", "finger": "Finger", "toe": "Toe",
    "knee": "Knee", "elbow": "Elbow", "arm": "Arm",
    "leg": "Human leg", "head": "Head", "heart": "Heart",

    # ---- Household (20) ----
    "chair": "Chair", "table": "Table (furniture)", "bed": "Bed",
    "door": "Door", "window": "Window", "clock": "Clock",
    "phone": "Mobile phone", "book": "Book", "key": "Key (lock)",
    "lamp": "Lamp", "sofa": "Couch", "fan": "Ceiling fan",
    "kettle": "Kettle", "pillow": "Pillow", "towel": "Towel",
    "mirror": "Mirror", "basket": "Basket", "plate": "Plate (dishware)",
    "spoon": "Spoon", "cup": "Cup",

    # ---- Vehicles (18) — added regional vehicles ----
    "car": "Car", "bus": "Bus", "truck": "Truck", "bicycle": "Bicycle",
    "train": "Train", "airplane": "Airplane", "boat": "Boat",
    "ship": "Ship", "helicopter": "Helicopter", "taxi": "Taxi",
    "rickshaw": "Auto rickshaw", "motorcycle": "Motorcycle",
    "scooter": "Scooter", "tractor": "Tractor",
    "ambulance": "Ambulance", "firetruck": "Fire engine",
    "van": "Van", "ferry": "Ferry",

    # ---- Nature (18) ----
    "sun": "Sun", "moon": "Moon", "star": "Star", "tree": "Tree",
    "flower": "Flower", "mountain": "Mountain", "sea": "Sea",
    "cloud": "Cloud", "river": "River", "beach": "Beach",
    "sand": "Sand", "rock": "Rock (geology)", "grass": "Grass",
    "leaf": "Leaf", "fire": "Fire", "snow": "Snow",
    "rain": "Rain", "sky": "Sky",
}


def fetch_thumb_url(title):
    encoded = urllib.parse.quote(title.replace(" ", "_"), safe="")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"  ! summary fetch failed: {e}")
        return None
    thumb = (data.get("thumbnail") or {}).get("source")
    if not thumb:
        thumb = (data.get("originalimage") or {}).get("source")
    return thumb


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            with open(path, "wb") as f:
                shutil.copyfileobj(r, f)
        return os.path.getsize(path) > 0
    except Exception as e:
        print(f"  ! download failed: {e}")
        return False


def resize_to_jpg(src, dst):
    """Use macOS sips to resize and convert to JPEG. Returns True on success."""
    try:
        subprocess.run(
            ["sips", "-Z", "256", "-s", "format", "jpeg", src, "--out", dst],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return os.path.exists(dst) and os.path.getsize(dst) > 0
    except subprocess.CalledProcessError:
        return False


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    total = len(WORDS)
    got = skip = fail = 0
    print(f"Fetching {total} word images …")
    for slug, title in WORDS.items():
        out = os.path.join(OUT_DIR, f"{slug}.jpg")
        if os.path.exists(out):
            skip += 1
            continue
        thumb = fetch_thumb_url(title)
        if not thumb:
            print(f"✗ {slug}: no image (no Wikipedia thumbnail)")
            fail += 1
            time.sleep(0.2)
            continue
        ext = thumb.rsplit(".", 1)[-1].lower()
        # sips can't reliably handle SVG; keep raw extension for the temp file.
        tmp = os.path.join(OUT_DIR, f"{slug}.tmp.{ext}")
        if not download(thumb, tmp):
            print(f"✗ {slug}: download empty")
            fail += 1
            try: os.remove(tmp)
            except FileNotFoundError: pass
            time.sleep(0.2)
            continue
        if resize_to_jpg(tmp, out):
            got += 1
            print(f"✓ {slug}  ({thumb.split('/')[-1][:50]}…)")
        else:
            print(f"✗ {slug}: resize failed (likely SVG/unsupported)")
            fail += 1
            try: os.remove(out)
            except FileNotFoundError: pass
        try: os.remove(tmp)
        except FileNotFoundError: pass
        time.sleep(0.2)
    print(f"\nDone. total {total} · got {got} · skipped {skip} · failed {fail}")
    on_disk = len([f for f in os.listdir(OUT_DIR) if f.endswith(".jpg")])
    print(f"Manifest: {on_disk} images in {OUT_DIR}/")


if __name__ == "__main__":
    sys.exit(main())
