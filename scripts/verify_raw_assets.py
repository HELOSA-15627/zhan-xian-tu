from pathlib import Path

import cv2
import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\不知道干啥的先放着\抠图输出\巢穴_透明.png")
OUTPUT = PROJECT_ROOT / "src" / "assets" / "custom" / "nest.png"


def main() -> None:
    source = np.array(Image.open(SOURCE).convert("RGBA"))
    output = np.array(Image.open(OUTPUT).convert("RGBA"))
    assert source.shape == output.shape

    source_alpha = source[..., 3]
    output_alpha = output[..., 3]
    binary = (source_alpha >= 24).astype(np.uint8) * 255
    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_NONE,
    )
    assert contours

    outer = np.zeros_like(binary)
    cv2.drawContours(
        outer,
        [max(contours, key=cv2.contourArea)],
        -1,
        255,
        cv2.FILLED,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    band = cv2.dilate(outer, kernel) - cv2.erode(outer, kernel)

    partial = (output_alpha > 0) & (output_alpha < 255)
    assert partial.sum() >= 80
    assert np.all((band > 0)[partial])

    changed_alpha = source_alpha != output_alpha
    assert np.all((band > 0)[changed_alpha])

    preserved = (band == 0) & (source_alpha > 0)
    assert np.array_equal(source[preserved], output[preserved])

    transparent = output_alpha == 0
    assert np.all(output[..., :3][transparent] == 0)

    print(
        {
            "partial_edge_pixels": int(partial.sum()),
            "smoothed_band_pixels": int(np.count_nonzero(changed_alpha)),
            "preserved_subject_pixels": int(np.count_nonzero(preserved)),
        }
    )


if __name__ == "__main__":
    main()
