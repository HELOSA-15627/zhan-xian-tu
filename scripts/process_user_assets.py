from pathlib import Path

import cv2
import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
UNIT_OUTPUT = PROJECT_ROOT / "src" / "assets" / "units"
CUSTOM_OUTPUT = PROJECT_ROOT / "src" / "assets" / "custom"
FLAG_OUTPUT = PROJECT_ROOT / "src" / "assets" / "flags"

TINTS = {
    "friendly": (0x92, 0xCF, 0x00),
    "hostile": (0x9B, 0x35, 0x1F),
    "objective": (0x00, 0xD9, 0xE0),
}

BADGES = {
    "friendly-fighter-clean": Path(
        r"D:\不知道干啥的先放着\抠图输出_飞行器红叉\绿色飞行器_透明.png"
    ),
    "hostile-destroyed": Path(
        r"D:\不知道干啥的先放着\抠图输出_飞行器红叉\红叉_透明.png"
    ),
}

RAW_BADGES = {
    "nest": Path(r"D:\不知道干啥的先放着\抠图输出\巢穴_透明.png"),
}

MAP_SOURCE = Path(
    r"C:\Users\13743\Downloads\5DDF5E72B6D9FF810BD12AA79626908E.jpg"
)
FLAG_COLUMNS = [
    [
        ("adamas", "Adamas", "阿达马斯"),
        ("amber", "Amber", "安伯"),
        ("aurelia", "Aurelia", "奥雷利亚"),
        ("belka", "Belka", "贝尔卡"),
        ("brasilium", "Brasilium", "巴西利姆"),
    ],
    [
        ("carranza", "Carranza", "卡兰萨"),
        ("cayenne", "Cayenne", "卡宴"),
        ("central-sotoa", "Central Sotoa", "中索托阿"),
        ("comona", "Comona", "科莫纳"),
        ("east-clavis", "East Clavis", "东克拉维斯"),
    ],
    [
        ("emmeria", "Emmeria", "埃梅里亚"),
        ("erusea", "Erusea", "埃鲁塞亚"),
        ("estovakia", "Estovakia", "埃斯托瓦基亚"),
        ("fato", "Fato", "法托"),
        ("central-usea", "Federation of Central Usea", "中尤西亚联邦"),
    ],
    [
        ("gebet", "Gebet", "盖贝特"),
        ("islamic-european-union", "Islamic European Union", "伊斯兰欧洲联盟"),
        ("indus", "Indus", "因杜斯"),
        ("kaluga", "Kaluga", "卡卢加"),
        ("karabastan", "Karabastan", "卡拉巴斯坦"),
    ],
    [
        ("leasath", "Leasath", "利萨思"),
        ("levant", "Levant", "黎凡特"),
        ("nordennavic", "Nordennavic", "诺登纳维克"),
        ("nordland", "Nordland", "诺德兰"),
        ("north-point", "North Point", "北角"),
    ],
    [
        ("osea", "Osea", "欧西亚"),
        ("perfanesia", "Perfanesia", "佩尔法尼西亚"),
        ("rasheedi-tamudia", "Rasheedi Tamudia", "拉希德塔穆迪亚"),
        ("ratio", "Ratio", "拉提奥"),
        ("recta", "Recta", "雷克塔"),
    ],
    [
        ("romny", "Romny", "罗姆尼"),
        ("san-martin", "San Martin", "圣马丁"),
        ("san-salvacion", "San Salvacion", "圣萨尔瓦西翁"),
        ("sapin", "Sapin", "萨平"),
        ("serica", "Serica", "塞里卡"),
    ],
    [
        ("sotoa", "Sotoa", "索托阿"),
        ("south-sotoa", "South Sotoa", "南索托阿"),
        ("ugellas", "Ugellas", "乌格拉斯"),
        ("ustio", "Ustio", "乌斯提奥"),
        ("valga", "Valga", "瓦尔加"),
    ],
    [
        ("valverde", "Valverde", "巴尔韦德"),
        ("vedia", "Vedia", "维迪亚"),
        ("verusa", "Verusa", "维鲁萨"),
        ("wellow", "Wellow", "韦洛"),
        ("west-clavis", "West Clavis", "西克拉维斯"),
    ],
    [
        ("wielvakia", "Wielvakia", "维尔瓦基亚"),
        ("yuktobania", "Yuktobania", "尤克托巴尼亚"),
    ],
]
FLAG_X = [73, 391, 709, 1027, 1345, 1663, 1981, 2299, 2617, 2935]
FLAG_Y = [3197, 3265, 3332, 3400, 3467]
FLAG_WIDTH = 109
FLAG_HEIGHT = 60


def completed_alpha(source: Image.Image) -> np.ndarray:
    alpha = np.array(source.getchannel("A"), dtype=np.uint8)
    mask = np.where(alpha >= 20, 255, 0).astype(np.uint8)
    kernel = np.ones((3, 3), dtype=np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(
        mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    completed = np.zeros_like(mask)
    for contour in contours:
        if cv2.contourArea(contour) >= 12:
            cv2.drawContours(completed, [contour], -1, 255, thickness=cv2.FILLED)
    completed = cv2.GaussianBlur(completed, (3, 3), 0.55)
    completed[completed < 10] = 0
    return completed


def write_badge_variants() -> None:
    UNIT_OUTPUT.mkdir(parents=True, exist_ok=True)
    for artwork_id, source_path in BADGES.items():
        source = Image.open(source_path).convert("RGBA")
        alpha = completed_alpha(source)
        for tint, rgb in TINTS.items():
            pixels = np.zeros((source.height, source.width, 4), dtype=np.uint8)
            pixels[..., 0] = rgb[0]
            pixels[..., 1] = rgb[1]
            pixels[..., 2] = rgb[2]
            pixels[..., 3] = alpha
            target = UNIT_OUTPUT / f"{artwork_id}-{tint}.png"
            Image.fromarray(pixels, "RGBA").save(target)


def write_flags() -> None:
    FLAG_OUTPUT.mkdir(parents=True, exist_ok=True)
    with Image.open(MAP_SOURCE) as map_image:
        for column_index, countries in enumerate(FLAG_COLUMNS):
            for row_index, (slug, _, _) in enumerate(countries):
                x = FLAG_X[column_index]
                y = FLAG_Y[row_index]
                crop = map_image.crop(
                    (x, y, x + FLAG_WIDTH, y + FLAG_HEIGHT)
                ).convert("RGBA")
                crop.save(FLAG_OUTPUT / f"flag-{slug}.png")


def write_raw_badges() -> None:
    CUSTOM_OUTPUT.mkdir(parents=True, exist_ok=True)
    for artwork_name, source_path in RAW_BADGES.items():
        source = np.array(
            Image.open(source_path).convert("RGBA"),
            dtype=np.uint8,
        )
        alpha = source[..., 3]
        outside = alpha < 24
        source[outside, :3] = 0
        alpha[outside] = 0
        source[..., 3] = alpha
        Image.fromarray(source, "RGBA").save(
            CUSTOM_OUTPUT / f"{artwork_name}.png"
        )


def main() -> None:
    write_badge_variants()
    write_raw_badges()
    write_flags()
    print("Processed 2 badge sources into 6 tinted PNGs.")
    print("Processed 1 original-color badge with fringe cleanup.")
    print("Extracted 47 country flags.")


if __name__ == "__main__":
    main()
