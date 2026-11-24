"""Export two swap regions from transparent Blender renders for the website."""
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


FRAME = (680, 1060)
SPLIT = 750
FEATHER = 40
OUTFITS = ("hoodie", "hoodie-beret", "coat", "coat-beret", "sneakers")
FRAME_MARGIN = 4
SEAM_TOLERANCE = 2


def pack(source, destination):
    destination.mkdir(exist_ok=True, parents=True)

    def load(name):
        with Image.open(source / (name + ".png")) as image:
            if image.size != FRAME or image.mode != "RGBA":
                raise ValueError(f"{name}: expected transparent {FRAME} render")
            alpha = image.getchannel("A")
            bounds = alpha.point(lambda value: 255 if value > 16 else 0).getbbox()
            if bounds is None:
                raise ValueError(f"{name}: empty render")
            left, top, right, bottom = bounds
            if min(left, top, FRAME[0]-right, FRAME[1]-bottom) < FRAME_MARGIN:
                raise ValueError(f"{name}: figure touches the camera frame")
            return image.copy()

    def save(image, name):
        image.save(destination / (name + ".webp"), quality=93, method=6)

    width, height = FRAME
    renders = {name: load(name) for name in OUTFITS}
    base = renders["hoodie"]
    legs = renders["sneakers"]
    if base.crop((0, 0, width, SPLIT)).getbbox() is None or legs.crop((0, SPLIT, width, height)).getbbox() is None:
        raise ValueError("The shared camera must capture both the body and the feet")

    # The same denim crosses the join in all outfits. Allow antialiasing
    # around its borders without letting a displaced leg through.
    def silhouette(image):
        return image.getchannel("A").crop((0, SPLIT-7, width, SPLIT+7)).point(
            lambda value: 255 if value > 190 else 0
        )

    edge_buffer = ImageFilter.MaxFilter(2*SEAM_TOLERANCE+1)
    reference = silhouette(base)
    if reference.getbbox() is None:
        raise ValueError("The denim must cross the layer join")
    expected = reference.filter(edge_buffer)
    for name, image in renders.items():
        current = silhouette(image)
        if (ImageChops.subtract(current, expected).getbbox()
                or ImageChops.subtract(reference, current.filter(edge_buffer)).getbbox()):
            raise ValueError(f"{name}: denim silhouette shifts at the layer join")

    # All renders share the same denim where the two regions meet. Normalize
    # the studio lighting across those rows, including the alpha at both edges.
    feather = Image.linear_gradient("L").resize((width, FEATHER))
    upper_strip = (0, SPLIT-FEATHER, width, SPLIT)
    lower_strip = (0, SPLIT, width, SPLIT+FEATHER)
    for name in OUTFITS[:-1]:
        upper = renders[name].copy()
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
