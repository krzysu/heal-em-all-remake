#!/usr/bin/env python3
"""Generate the single-screen room set (public/assets/data/screen*.tmx).

One room per level, one screen big, never scrolling: 20x12 tiles at 70px =
1400x840 world px, which always fits the visible world (>= 1137x640 at the
game's world zoom, more on wider windows).

Design rules enforced here, not by hand:
  * every room is authored as ASCII, so the layout is reviewable in a diff;
  * platform runs get the original art's left-cap / middle / right-cap gids;
  * entities are snapped so they stand exactly on the platform below them;
  * a reachability check proves each room's geometry: the door must be
    reachable with the tools the player owns when they enter, and - for rooms
    whose barrier is geometric - unreachable with one tool fewer.

Reach model, in tiles, measured in-game off a lip edge with the shipped
  physics (gravity 1400, move 330, jump -820, double jump -760, float dash 1000
  for 340ms): a jump carries 415px = 6 tiles, a double jump 613px = 9 tiles, a
  double jump plus the dash ~870px = 12 tiles.
  single jump  rise 3 / gap 6; double jump rise 6 / gap 9; dash +3 gap;
  a lower landing +1 gap.

Usage: python3 tools/gen_screens.py [--check]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "assets" / "data"
DESIGN = ROOT / "design"

TILE = 70
W, H = 20, 12
SHEET = ROOT / "public" / "assets" / "images" / "map_tiles.png"

JUMP_RISE = 3
JUMP_GAP = 6
DOUBLE_RISE = 6
DOUBLE_GAP = 9
DASH_GAP = 3
FALL_GAP = 1

# Art: a run is left cap (1), middles (2/4/5), right cap (3).
MIDDLES = (2, 2, 4, 2, 5)
DECOR_LEFT = 9
DECOR_RIGHT = 10
DECOR_ABOVE = 8

TOOLS = {
    "doubleJump": "Double jump",
    "dash": "Dash",
    "spread": "Spread shot",
    "charge": "Charge shot",
    "melee": "Melee stun",
    "chain": "Chain cure",
}


class Room:
    def __init__(self, number, name, idea, hint, grants, requires_geometry, grid, entities):
        self.number = number
        self.name = name
        self.idea = idea
        self.hint = hint
        self.grants = grants
        self.requires_geometry = requires_geometry
        self.rows = [row.strip() for row in grid.strip().split("\n") if row.strip()]
        self.entities = entities
        assert len(self.rows) == H, f"room {number}: {len(self.rows)} rows, want {H}"
        for row in self.rows:
            assert len(row) == W, f"room {number}: row width {len(row)}, want {W}: {row!r}"

    def solid(self):
        return {
            (col, row)
            for row, line in enumerate(self.rows)
            for col, ch in enumerate(line)
            if ch == "#"
        }

    def runs(self):
        """Maximal horizontal platform runs: (row, col_start, col_end)."""
        out = []
        for row, line in enumerate(self.rows):
            col = 0
            while col < W:
                if line[col] != "#":
                    col += 1
                    continue
                start = col
                while col < W and line[col] == "#":
                    col += 1
                out.append((row, start, col - 1))
        return out


ROOMS = [
    Room(
        1,
        "The Gate",
        "Tutorial room: walk, hop, find the gun, cure the one zombie guarding the key. Two "
        "walkers, no hazards, nothing that needs a tool.",
        "I need to find the way out of here",
        "doubleJump",
        False,
        """
        ....................
        ....................
        ....................
        ....................
        ....................
        .........###...###..
        ....................
        ....................
        ...###..............
        ....................
        ....................
        ####################
        """,
        [
            ("player", 1, 11),
            ("gun", 4, 7, 5),
            ("walker", 10, 5),
            ("health", 8, 10),
            ("walker", 13, 11),
            ("key", 16, 4),
            ("sign", 17, 10),
            ("door", 18, 10),
        ],
    ),
    Room(
        2,
        "The Well",
        "A vertical shaft: the key is on the floor, the door is at the top. The climb out has "
        "a 5-tile rise and a 6-tile gap, so a single jump cannot leave the bottom. A spitter "
        "on the right ledge covers the shaft the whole way up.",
        "The door is up there. I will need to jump twice to climb out",
        "dash",
        True,
        """
        ....................
        ...............###..
        ....................
        ..........####......
        ....................
        ....................
        ....................
        ..####.........####.
        ....................
        ....................
        ....................
        ####################
        """,
        [
            ("player", 1, 11),
            ("gun", 5, 10, 5),
            ("runner", 12, 11),
            ("key", 10, 10),
            ("walker", 3, 7),
            ("health", 11, 2),
            ("spitter", 16, 7),
            ("sign", 15, 0),
            ("door", 16, 0),
        ],
    ),
    Room(
        3,
        "The Rift",
        "An 11-tile rift in the floor taken off a raised lip: the double jump alone falls "
        "short, only the dash carries the doctor across. The gun is on the lip; everything "
        "else is on the far side, with a spitter covering the landing.",
        "That rift is too wide to jump. I need a dash",
        "spread",
        True,
        """
        ....................
        ....................
        ....................
        ....................
        ....................
        ....................
        ...............###..
        ....................
        ................####
        .###................
        .###................
        ####...........#####
        """,
        [
            ("player", 0, 11),
            ("gun", 2, 8, 6),
            ("spitter", 17, 8),
            ("walker", 16, 11),
            ("key", 17, 10),
            ("health", 19, 10),
            ("runner", 18, 11),
            ("sign", 17, 5),
            ("door", 16, 5),
        ],
    ),
    Room(
        4,
        "The Ward",
        "A roof makes the game's first covered chamber. Three walkers hold a 3-tile ledge with "
        "the key: cure one and the others just re-infect the human, so the row has to go down "
        "together - that is the spread shot. A brute holds the chamber floor.",
        "They are too close together. I need a spread shot",
        "charge",
        False,
        """
        ....................
        ....................
        ....................
        ....................
        ....................
        ..............####..
        .........###........
        ....................
        ......########......
        ....................
        ....................
        ####################
        """,
        [
            ("player", 1, 11),
            ("gun", 2, 10, 5),
            ("walker", 10, 11),
            ("brute", 12, 11),
            ("health", 14, 10),
            ("gun", 15, 10, 5),
            ("spitter", 15, 5),
            ("walkers", 7, 8, 2),
            ("walkers", 9, 6, 3),
            ("key", 10, 5),
            ("sign", 17, 10),
            ("door", 18, 10),
        ],
    ),
    Room(
        5,
        "The Galleries",
        "Stacked galleries and an ammo trap: one bullet in the room, and the key sits on a "
        "3-tile ledge behind an armoured brute that shrugs it off (flat shots from the floor "
        "pass under his body, so he has to be dealt with up there). One charged round counts "
        "as three hits; the real clip is on the far side of him.",
        "He shrugs my bullets off. I need to charge a shot",
        "melee",
        False,
        """
        ....................
        ....................
        ......###...###.....
        ....................
        ....................
        ...###........###...
        ....................
        ....................
        .........###........
        ....................
        ....................
        ####################
        """,
        [
            ("player", 1, 11),
            ("gun", 2, 10, 1),
            ("runner", 6, 11),
            ("brute", 10, 8),
            ("key", 10, 7),
            ("spitter", 7, 2),
            ("runner", 13, 2),
            ("gun", 16, 10, 6),
            ("walker", 17, 11),
            ("walker", 4, 5),
            ("health", 3, 4),
            ("sign", 17, 10),
            ("door", 18, 10),
        ],
    ),
    Room(
        6,
        "The Long Night",
        "The finale: both floors live, a row of three in contact on the low platform so one "
        "cure chains into the next, two bunched on the key ledge, a brute and two runners on "
        "the floor, a spitter above the exit. Ammo is real, so the melee earns its place.",
        "The last night. Everything I have learned, all at once",
        "chain",
        False,
        """
        ....................
        ....................
        ....................
        ........###.........
        ....................
        ....................
        ............####....
        ....................
        .....####...........
        ....................
        ....................
        ####################
        """,
        [
            ("player", 1, 11),
            ("gun", 2, 10, 6),
            ("walkers", 5, 8, 3),
            ("health", 6, 7),
            ("walker", 9, 11),
            ("walkers", 12, 6, 2),
            ("key", 14, 5),
            ("brute", 16, 11),
            ("runner", 15, 11),
            ("spitter", 9, 3),
            ("sign", 17, 10),
            ("door", 18, 10),
        ],
    ),
]


# --------------------------------------------------------------- geometry ---


def entity_cells(room):
    """Expand the multi-zombie shorthand into concrete spawn tuples."""
    out = []
    for entity in room.entities:
        kind, *rest = entity
        if kind == "walkers":
            start, row, count = rest
            for step in range(count):
                out.append(("walker", start + step, row))
        else:
            out.append((kind, *rest))
    return out


def snap_to_floor(room, col, row):
    """Walk down from `row` to the first platform and stand the entity on it."""
    solid = room.solid()
    for probe in range(row, H + 1):
        if (col, probe) in solid:
            return probe
    return None


def reachable(room, tools, start_col):
    """BFS across platform runs with the jump model above."""
    runs = room.runs()
    starts = [index for index, (row, start, end) in enumerate(runs) if start <= start_col <= end]
    if not starts:
        return set(), runs
    start = max(starts, key=lambda index: runs[index][0])

    gap_limit = (DOUBLE_GAP if "doubleJump" in tools else JUMP_GAP) + (
        DASH_GAP if "dash" in tools else 0
    )
    rise_limit = DOUBLE_RISE if "doubleJump" in tools else JUMP_RISE

    seen = {start}
    queue = [start]
    while queue:
        crow, cstart, cend = runs[queue.pop()]
        for index, (row, rstart, rend) in enumerate(runs):
            if index in seen:
                continue
            gap = max(rstart - cend - 1, cstart - rend - 1, 0)
            rise = crow - row
            limit = gap_limit + (FALL_GAP if rise < 0 else 0)
            if gap <= limit and rise <= rise_limit:
                seen.add(index)
                queue.append(index)
    return {runs[index] for index in seen}, runs


def check_room(room, tools):
    """Returns (door reached, key reached, problems)."""
    cells = entity_cells(room)
    problems = []
    player_col = next(col for kind, col, _ in cells if kind == "player")
    reached, runs = reachable(room, tools, player_col)

    def placed_run(col, row):
        """The platform run an entity at this cell stands on / floats over."""
        for run in runs:
            rrow, start, end = run
            if start <= col <= end and rrow == snap_to_floor(room, col, row):
                return run
        return None

    cells_of = {
        entry[0]: (entry[1], entry[2]) for entry in cells if entry[0] in ("key", "door")
    }
    solid = room.solid()
    for entry in cells:
        kind, col, row = entry[0], entry[1], entry[2]
        if kind == "player":
            continue
        if kind in ("gun", "health", "key", "door", "sign"):
            # Items float in the cell directly above their platform.
            if (col, row + 1) not in solid:
                problems.append(f"{kind} at ({col},{row}) is not sitting above a platform")
            continue
        anchor = snap_to_floor(room, col, row)
        if anchor is None:
            problems.append(f"{kind} at ({col},{row}) has no platform under it")
        elif anchor - row > 2:
            problems.append(
                f"{kind} at ({col},{row}) drifts {anchor - row} rows down to its platform"
            )

    door_run = placed_run(*cells_of["door"])
    key_run = placed_run(*cells_of["key"])
    return door_run in reached, key_run in reached, problems


# ---------------------------------------------------------------- rendering ---


def collision_grid(room):
    gids = {}
    for row, start, end in room.runs():
        length = end - start + 1
        for col in range(start, end + 1):
            if length == 1:
                gids[(col, row)] = 2
            elif col == start:
                gids[(col, row)] = 1
            elif col == end:
                gids[(col, row)] = 3
            else:
                gids[(col, row)] = MIDDLES[(col + row) % len(MIDDLES)]
    return gids


def foreground_grid(room):
    solid = room.solid()
    decor = {}
    for row, start, end in room.runs():
        if start - 1 >= 0 and (start - 1, row) not in solid:
            decor[(start - 1, row)] = DECOR_LEFT
        if end + 1 < W and (end + 1, row) not in solid:
            decor[(end + 1, row)] = DECOR_RIGHT
        if row - 1 >= 0 and (start, row - 1) not in solid and (end - start) >= 3:
            decor[(start, row - 1)] = DECOR_ABOVE
    return decor


def tile_frame(sheet, gid, tile, cols):
    index = gid - 1
    return sheet.crop(
        (
            (index % cols) * tile,
            (index // cols) * tile,
            (index % cols + 1) * tile,
            (index // cols + 1) * tile,
        )
    )


def write_tmx(room):
    gids = collision_grid(room)
    decor = foreground_grid(room)

    def layer(name, cells):
        lines = [f' <layer name="{name}" width="{W}" height="{H}">', "  <data>"]
        for row in range(H):
            for col in range(W):
                lines.append(f'   <tile gid="{cells.get((col, row), 0)}"/>')
        lines += ["  </data>", " </layer>"]
        return lines

    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<map version="1.0" orientation="orthogonal" width="{W}" height="{H}" '
        f'tilewidth="{TILE}" tileheight="{TILE}" backgroundcolor="#3c4556">',
        f' <tileset firstgid="1" name="map_tiles_70" tilewidth="{TILE}" tileheight="{TILE}">',
        '  <image source="map_tiles_70.png" width="560" height="140"/>',
        '  <tile id="0"/>',
        '  <tile id="1"/>',
        '  <tile id="2"/>',
        '  <tile id="3"/>',
        " </tileset>",
    ]

    cells = entity_cells(room)

    out.append(f' <objectgroup color="#ffff00" name="items" width="{W}" height="{H}">')
    for kind, col, row, *rest in cells:
        if kind not in ("gun", "health", "key", "door", "sign"):
            continue
        name = "exit_sign" if kind == "sign" else kind
        x, y = col * TILE, row * TILE
        if kind == "gun":
            bullets = rest[0] if rest else 5
            out.append(
                f'  <object name="{name}" type="items" x="{x}" y="{y}" width="70" height="140">'
            )
            out.append("   <properties>")
            out.append(f'    <property name="bullets" value="{bullets}"/>')
            out.append("   </properties>")
            out.append("  </object>")
        else:
            out.append(f'  <object name="{name}" type="items" x="{x}" y="{y}" width="70" height="140"/>')
    out.append(" </objectgroup>")

    for entry in cells:
        kind, col, row = entry[0], entry[1], entry[2]
        if kind != "player":
            continue
        floor = snap_to_floor(room, col, row) or row
        out.append(f' <objectgroup color="#00aa00" name="player" width="{W}" height="{H}">')
        out.append(
            f'  <object name="player" type="player" x="{col * TILE}" y="{floor * TILE - 84}" '
            'width="70" height="140">'
        )
        out.append("   <properties>")
        out.append(f'    <property name="hint" value="{escape(room.hint)}"/>')
        out.append("   </properties>")
        out.append("  </object>")
        out.append(" </objectgroup>")
        break

    out.append(f' <objectgroup color="#ff0000" name="enemies" width="{W}" height="{H}">')
    for entry in cells:
        kind, col, row = entry[0], entry[1], entry[2]
        if kind not in ("walker", "runner", "brute", "spitter"):
            continue
        floor = snap_to_floor(room, col, row) or row
        y = floor * TILE - 84
        out.append(
            f'  <object name="zombie" type="enemy" x="{col * TILE}" y="{y}" width="70" height="140">'
        )
        out.append("   <properties>")
        out.append(f'    <property name="archetype" value="{kind}"/>')
        if col < W // 2:
            out.append('    <property name="startLeft" value="true"/>')
        out.append("   </properties>")
        out.append("  </object>")
    out.append(" </objectgroup>")

    out += layer("collision", gids)
    out += layer("foreground", decor)
    out.append("</map>")

    path = DATA / f"screen{room.number}.tmx"
    path.write_text("\n".join(out) + "\n")
    return path


def write_preview(room):
    from PIL import Image

    sheet = Image.open(SHEET).convert("RGBA")
    cols = sheet.width // TILE
    canvas = Image.new("RGBA", (W * TILE, H * TILE), (60, 69, 86, 255))
    for (col, row), gid in collision_grid(room).items():
        canvas.alpha_composite(tile_frame(sheet, gid, TILE, cols), (col * TILE, row * TILE))
    for (col, row), gid in foreground_grid(room).items():
        canvas.alpha_composite(tile_frame(sheet, gid, TILE, cols), (col * TILE, row * TILE))

    path = DESIGN / f"screen{room.number}.preview.png"
    canvas.convert("RGB").save(path)
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify without writing")
    args = parser.parse_args()

    owned: list[str] = []
    failures: list[str] = []
    for room in ROOMS:
        cells = entity_cells(room)
        enemies = sum(1 for kind, *_ in cells if kind in ("walker", "runner", "brute", "spitter"))
        items = sum(1 for kind, *_ in cells if kind in ("gun", "health", "key", "door", "sign"))
        bullets = sum(rest[0] for kind, _, _, *rest in cells if kind == "gun")

        door_before, key_before, problems = check_room(room, owned[:-1])
        door_after, key_after, _ = check_room(room, owned)
        for problem in problems:
            failures.append(f"room {room.number}: {problem}")

        if room.requires_geometry:
            if door_before:
                failures.append(
                    f"room {room.number}: door is reachable with {owned[:-1] or ['base']} - the "
                    "room does not require the tool it is built around"
                )
            if not door_after:
                failures.append(f"room {room.number}: door is not reachable with {owned}")
        else:
            if not door_after:
                failures.append(f"room {room.number}: door is not reachable with {owned}")
        if not key_after:
            failures.append(f"room {room.number}: key is not reachable with {owned}")

        status = "barrier held" if room.requires_geometry else "open plan"
        print(
            f"room {room.number} {room.name:16s} grants {TOOLS[room.grants]:12s} "
            f"enemies {enemies:2d} items {items:2d} bullets {bullets:2d}  {status}"
        )
        if not args.check:
            print(f"      {write_tmx(room).relative_to(ROOT)}")
            print(f"      {write_preview(room).relative_to(ROOT)}")
        owned.append(room.grants)

    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print(" -", failure)
        return 1
    print("\nall rooms verified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
