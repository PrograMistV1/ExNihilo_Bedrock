import json
import logging
import re
from html import escape
from pathlib import Path
from typing import TypedDict

from markupsafe import Markup

log = logging.getLogger("mkdocs")

_SLOT = '<span class="inventory-slot"></span>'
_SLOTS_PER_ROW = 3
_ROWS = 3


def _build_row(slots: int = _SLOTS_PER_ROW) -> str:
    return f'<span class="inventory-row">{"".join(_SLOT for _ in range(slots))}</span>'


def _build_input_grid() -> str:
    return f'<span class="ui-input">{"".join(_build_row() for _ in range(_ROWS))}</span>'


def _build_crafting_table(recipes_json: str) -> str:
    return f"""
<div class="craft-wrapper">
    <div class="ui crafting-table" data-recipes='{recipes_json}'>
        {_build_input_grid()}
        <span class="crafting-arrow"><br></span>
        <span class="crafting-output">
            <span class="inventory-slot inventory-slot-large"></span>
        </span>
    </div>
</div>
"""


def _build_furnace(recipes_json: str) -> str:
    return f"""
<div class="craft-wrapper">
    <div class="ui furnace" data-recipes='{recipes_json}'>
        <span class="ui-input">
            <span class="inventory-slot"></span>
            <span class="ui-fuel"></span>
            <span class="inventory-slot"></span>
        </span>
        <span class="crafting-arrow"><br></span>
        <span class="crafting-output">
            <span class="inventory-slot inventory-slot-large"></span>
        </span>
    </div>
</div>
"""


def _parse_shaped_recipe(data: dict) -> dict | None:
    recipe = data.get("minecraft:recipe_shaped")
    if not recipe:
        return None

    pattern = recipe.get("pattern", [])
    key = recipe.get("key", {})
    result = recipe.get("result")

    if isinstance(result, dict):
        result = result.get("item")

    grid = []
    for row_idx in range(3):
        row_str = pattern[row_idx] if row_idx < len(pattern) else ""
        for col_idx in range(3):
            char = row_str[col_idx] if col_idx < len(row_str) else " "
            if char == " " or char not in key:
                grid.append(None)
            else:
                item = key[char]
                if isinstance(item, dict):
                    item = item.get("item")
                grid.append(item)

    return {"type": "shaped", "result": result, "grid": grid}


def _parse_furnace_recipe(data: dict) -> dict | None:
    recipe = data.get("minecraft:recipe_furnace")
    if not recipe:
        return None

    input_item = recipe.get("input")
    output_item = recipe.get("output")

    if isinstance(input_item, dict):
        input_item = input_item.get("item")
    if isinstance(output_item, dict):
        output_item = output_item.get("item")

    if not input_item or not output_item:
        return None

    return {"type": "furnace", "result": output_item, "input": input_item}


def load_all_recipes(recipes_dir: Path) -> dict[str, dict]:
    recipes = {}
    recipes_dir = Path(recipes_dir)

    for json_file in recipes_dir.rglob("*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        for parser in (_parse_shaped_recipe, _parse_furnace_recipe):
            parsed = parser(data)
            if parsed and parsed["result"]:
                recipes[parsed["result"]] = parsed
                break

    return recipes


_RECIPE_CACHE: dict[str, dict] = {}
_SIEVE_TABLES_CACHE = ""

_MESH_ORDER = ["string", "flint", "iron", "diamond", "emerald", "netherite"]
_MESH_TITLES = {
    "string": "String Mesh",
    "flint": "Flint Mesh",
    "iron": "Iron Mesh",
    "diamond": "Diamond Mesh",
    "emerald": "Emerald Mesh",
    "netherite": "Netherite Mesh",
}
_MESH_TO_CONST = {
    "string": "STRING_MESH_DROPS",
    "flint": "FLINT_MESH_DROPS",
    "iron": "IRON_MESH_DROPS",
    "diamond": "DIAMOND_MESH_DROPS",
    "emerald": "EMERALD_MESH_DROPS",
    "netherite": "NETHERITE_MESH_DROPS",
}


class ParsedRoll(TypedDict):
    result: str
    chances: list[float]


def _extract_balanced_block(text: str, start_idx: int, open_char: str, close_char: str) -> tuple[str, int]:
    depth = 0
    quote = None
    escaped = False

    for idx in range(start_idx, len(text)):
        ch = text[idx]

        if quote:
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if ch == quote:
                quote = None
            continue

        if ch in ('"', "'", "`"):
            quote = ch
            continue

        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return text[start_idx:idx + 1], idx + 1

    raise ValueError(f"Could not parse balanced block starting at index {start_idx}")


def _humanize_item_id(item_id: str) -> str:
    _, _, raw_name = item_id.partition(":")
    target = raw_name or item_id
    return " ".join(part.capitalize() for part in target.split("_"))


def _format_chance(value: float) -> str:
    percent = value * 100
    formatted = f"{percent:.2f}".rstrip("0").rstrip(".")
    return f"{formatted}%"


def _parse_rolls(array_text: str) -> list[ParsedRoll]:
    rolls: list[ParsedRoll] = []
    pattern = re.compile(r'\{\s*result:\s*"([^"]+)"\s*,\s*chances:\s*\[([^]]*)]\s*}\s*,?', re.DOTALL)

    for match in pattern.finditer(array_text):
        result = match.group(1)
        chances_raw = match.group(2)
        chances = []
        for part in chances_raw.split(","):
            chunk = part.strip()
            if chunk:
                chances.append(float(chunk))
        rolls.append({"result": result, "chances": chances})

    return rolls


def _parse_mesh_const(source: str, const_name: str) -> dict[str, list[ParsedRoll]]:
    const_match = re.search(rf"const\s+{const_name}\s*:\s*Record<string,\s*RollPattern\[]>\s*=\s*\{{", source)
    if not const_match:
        raise ValueError(f"Constant {const_name} not found in sieve loot source")

    object_start = source.find("{", const_match.start())
    object_text, _ = _extract_balanced_block(source, object_start, "{", "}")

    parsed: dict[str, list[ParsedRoll]] = {}
    i = 1
    while i < len(object_text) - 1:
        key_match = re.search(r'\s*"([^"]+)"\s*:\s*\[', object_text[i:])
        if not key_match:
            break

        key_abs_end = i + key_match.end()
        block_id = key_match.group(1)
        array_start = key_abs_end - 1
        array_text, next_pos = _extract_balanced_block(object_text, array_start, "[", "]")
        parsed[block_id] = _parse_rolls(array_text)
        i = next_pos

    return parsed


def build_sieve_tables(loot_source_path: Path) -> str:
    if not loot_source_path.exists():
        log.warning(f"[sieve] Loot source not found: {loot_source_path}")
        return ""

    source = loot_source_path.read_text(encoding="utf-8")
    tables: list[str] = []

    for mesh in _MESH_ORDER:
        const_name = _MESH_TO_CONST[mesh]
        try:
            drops_by_block: dict[str, list[ParsedRoll]] = _parse_mesh_const(source, const_name)
        except ValueError as exc:
            log.warning(f"[sieve] {exc}")
            continue

        title = _MESH_TITLES[mesh]
        section = [
            "<details>",
            f"    <summary>{escape(title)}</summary>",
            "    <table>",
            "        <tr><th>Block</th><th>Result</th><th>Chances</th></tr>",
        ]

        for block_id, rolls in drops_by_block.items():
            if not rolls:
                continue

            block_name = _humanize_item_id(block_id)
            chances_by_roll = [", ".join(_format_chance(value) for value in roll["chances"]) for roll in rolls]

            chance_groups: list[tuple[int, int, str]] = []
            group_start = 0
            while group_start < len(chances_by_roll):
                group_end = group_start + 1
                while group_end < len(chances_by_roll) and chances_by_roll[group_end] == chances_by_roll[group_start]:
                    group_end += 1
                chance_groups.append((group_start, group_end, chances_by_roll[group_start]))
                group_start = group_end

            chance_group_idx = 0
            active_start, active_end, active_chances = chance_groups[chance_group_idx]

            for idx, roll in enumerate(rolls):
                result_name = _humanize_item_id(roll["result"])
                row_cells: list[str] = []

                if idx == 0:
                    if len(rolls) > 1:
                        row_cells.append(f'<td rowspan="{len(rolls)}">{escape(block_name)}</td>')
                    else:
                        row_cells.append(f"<td>{escape(block_name)}</td>")

                row_cells.append(f"<td>{escape(result_name)}</td>")

                if idx == active_start:
                    chance_span = active_end - active_start
                    if chance_span > 1:
                        row_cells.append(f'<td rowspan="{chance_span}">{escape(active_chances)}</td>')
                    else:
                        row_cells.append(f"<td>{escape(active_chances)}</td>")

                section.append(f"        <tr>{''.join(row_cells)}</tr>")

                if idx + 1 == active_end and chance_group_idx + 1 < len(chance_groups):
                    chance_group_idx += 1
                    active_start, active_end, active_chances = chance_groups[chance_group_idx]

        section.append("    </table>")
        section.append("</details>")
        tables.append("\n".join(section))

    return "\n\n".join(tables)


def define_env(env):
    recipes_dir = Path(env.project_dir) / "ExNihilo_BP/recipes"
    sieve_loot_path = Path(env.project_dir) / "ExNihilo_BP/src/data/loot/SieveLoot.ts"

    global _RECIPE_CACHE, _SIEVE_TABLES_CACHE
    if recipes_dir.exists():
        _RECIPE_CACHE = load_all_recipes(recipes_dir)
    else:
        log.warning(f"[crafting] Recipes directory not found: {recipes_dir}")

    _SIEVE_TABLES_CACHE = build_sieve_tables(sieve_loot_path)

    @env.macro
    def craft(*item_ids: str) -> Markup:
        """
        Usage in .md:
            {{ craft("exnihilo:iron_crook") }}
            {{ craft("exnihilo:oak_barrel", "exnihilo:birch_barrel") }}
        """
        recipes_data = []

        for item_id in item_ids:
            recipe = _RECIPE_CACHE.get(item_id)
            if recipe is None:
                log.warning(f"[crafting] Recipe not found: {item_id}")
                recipes_data.append({"type": "shaped", "result": item_id, "grid": [None] * 9})
            else:
                recipes_data.append(recipe)

        recipe_type = recipes_data[0]["type"] if recipes_data else "shaped"

        if recipe_type == "furnace":
            return Markup(_build_furnace(json.dumps(recipes_data)))
        return Markup(_build_crafting_table(json.dumps(recipes_data)))

    @env.macro
    def furnace(*item_ids: str) -> Markup:
        """
        Usage in .md:
            {{ furnace("exnihilo:fired_crucible") }}
        """
        recipes_data = []

        for item_id in item_ids:
            recipe = _RECIPE_CACHE.get(item_id)
            if recipe is None:
                log.warning(f"[crafting] Recipe not found: {item_id}")
                recipes_data.append({"type": "furnace", "result": item_id, "input": None})
            elif recipe.get("type") != "furnace":
                log.warning(f"[crafting] Recipe for {item_id} is not a furnace recipe")
                recipes_data.append(recipe)
            else:
                recipes_data.append(recipe)

        return Markup(_build_furnace(json.dumps(recipes_data)))

    @env.macro
    def sieve_loot_tables() -> Markup:
        return Markup(_SIEVE_TABLES_CACHE)
