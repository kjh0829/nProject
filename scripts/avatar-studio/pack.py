"""Export two swap regions from transparent Blender renders for the website."""
import argparse
from pathlib import Path

from PIL import Image


FRAME = (680, 1060)
SPLIT = 750
FEATHER = 40


def pack(source, destination):
    destination.mkdir(exist_ok=True, parents=True)

    def load(name):
        with Image.open(source / (name + ".png")) as image:
            if image.size != FRAME or image.mode != "RGBA":
                raise ValueError(f"{name}: expected transparent {FRAME} render")
            return image.copy()

    def save(image, name):
        image.save(destination / (name + ".webp"), quality=93, method=6)

    width, height = FRAME
    base = load("hoodie")
    legs = load("sneakers")
    if base.crop((0, 0, width, SPLIT)).getbbox() is None or legs.crop((0, SPLIT, width, height)).getbbox() is None:
        raise ValueError("The shared camera must capture both the body and the feet")

    # All renders share the same denim where the two regions meet. Normalize
    # the studio lighting across those rows, including the alpha at both edges.
    feather = Image.linear_gradient("L").resize((width, FEATHER))
    upper_strip = (0, SPLIT-FEATHER, width, SPLIT)
    lower_strip = (0, SPLIT, width, SPLIT+FEATHER)
    for name in ("hoodie", "hoodie-beret", "coat", "coat-beret"):
        upper = base.copy() if name == "hoodie" else load(name)
        seam = Image.composite(base.crop(upper_strip), upper.crop(upper_strip), feather)
        upper.paste(seam, upper_strip)
        save(upper.crop((0, 0, width, SPLIT)), name)

    save(base.crop((0, SPLIT, width, height)), "boots")
    seam = Image.composite(legs.crop(lower_strip), base.crop(lower_strip), feather)
    legs.paste(seam, lower_strip)
    save(legs.crop((0, SPLIT, width, height)), "sneakers")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    pack(args.source, args.destination)
