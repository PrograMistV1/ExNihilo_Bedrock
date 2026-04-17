import json

from markupsafe import Markup

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
    <div class="ui crafting-table pixel-image" data-recipes='{recipes_json}'>
        {_build_input_grid()}
        <span class="crafting-arrow"><br></span>
        <span class="crafting-output">
            <span class="inventory-slot inventory-slot-large"></span>
        </span>
    </div>
</div>
"""


def define_env(env):
    @env.macro
    def craft(*recipes):
        return Markup(_build_crafting_table(json.dumps(list(recipes))))
