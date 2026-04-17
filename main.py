import json
import logging
from pathlib import Path

from markupsafe import Markup

log = logging.getLogger("mkdocs")

_SLOT = '<span class="inventory-slot"></span>'
_SLOTS_PER_ROW = 3
_ROWS = 3


def _build_row(slots: int = _SLOTS_PER_ROW) -> str:
    return f'<span class="inventory-row">{"".join(_SLOT for _ in range(slots))}</span>'


def _build_input_grid() -> str:
    return f'<span class="crafting-input">{"".join(_build_row() for _ in range(_ROWS))}</span>'


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

    return {"result": result, "grid": grid}


def load_all_recipes(recipes_dir: Path) -> dict[str, dict]:
    recipes = {}
    recipes_dir = Path(recipes_dir)

    for json_file in recipes_dir.rglob("*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        parsed = _parse_shaped_recipe(data)
        if parsed and parsed["result"]:
            recipes[parsed["result"]] = parsed

    return recipes


_RECIPE_CACHE: dict[str, dict] = {}


def define_env(env):
    recipes_dir = Path(env.project_dir) / "ExNihilo_BP/recipes"

    global _RECIPE_CACHE
    if recipes_dir.exists():
        _RECIPE_CACHE = load_all_recipes(recipes_dir)
    else:
        log.warning(f"[crafting] Recipes directory not found: {recipes_dir}")

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
                log.warning(f"[crafting] Рецепт не найден: {item_id}")
                recipes_data.append({"result": item_id, "grid": [None] * 9})
            else:
                recipes_data.append(recipe)

        return Markup(_build_crafting_table(json.dumps(recipes_data)))
