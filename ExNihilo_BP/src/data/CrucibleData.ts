import {TicksPerSecond} from "@minecraft/server";
import {BlockInput, InputCompost, InputGravel} from "../components/blocks/tiles/FilledTileEntityBlock";

export const CRUCIBLE_CONFIG = {
    updateInterval: 8,
    meltingTimeSeconds: 180
};

const updatesPerSecond = TicksPerSecond / CRUCIBLE_CONFIG.updateInterval;
export const CRUCIBLE_TIMINGS = {
    meltingUpdates: Math.ceil(CRUCIBLE_CONFIG.meltingTimeSeconds * updatesPerSecond)
};

type MeltableBlockData = {
    fillAmount: number;
    type: BlockInput;
};

export const MeltableItems: Readonly<Record<string, MeltableBlockData>> = {
    "minecraft:stone": {"fillAmount": 25, "type": InputGravel},
    "minecraft:cobblestone": {"fillAmount": 25, "type": InputGravel},
    "minecraft:andesite": {"fillAmount": 25, "type": InputGravel},
    "minecraft:basalt": {"fillAmount": 25, "type": InputGravel},
    "minecraft:blackstone": {"fillAmount": 25, "type": InputGravel},
    "minecraft:calcite": {"fillAmount": 25, "type": InputGravel},
    "minecraft:deepslate": {"fillAmount": 25, "type": InputGravel},
    "minecraft:diorite": {"fillAmount": 25, "type": InputGravel},
    "minecraft:dripstone_block": {"fillAmount": 25, "type": InputGravel},
    "minecraft:end_stone": {"fillAmount": 25, "type": InputGravel},
    "minecraft:granite": {"fillAmount": 25, "type": InputGravel},
    "minecraft:tuff": {"fillAmount": 25, "type": InputGravel},
    "minecraft:gravel": {"fillAmount": 20, "type": InputGravel},
    "minecraft:sand": {"fillAmount": 10, "type": InputGravel},
    "minecraft:obsidian": {"fillAmount": 100, "type": InputGravel},
    "minecraft:netherrack": {"fillAmount": 100, "type": InputGravel},
    "exnihilo:dust": {"fillAmount": 5, "type": InputGravel},
    "exnihilo:crushed_andesite": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_basalt": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_blackstone": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_calcite": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_deepslate": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_diorite": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_dripstone": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_end_stone": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_granite": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_netherrack": {"fillAmount": 20, "type": InputGravel},
    "exnihilo:crushed_tuff": {"fillAmount": 20, "type": InputGravel},
    "minecraft:oak_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:spruce_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:birch_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:jungle_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:acacia_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:dark_oak_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:mangrove_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:cherry_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:pale_oak_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:azalea_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:flowering_azalea_leaves": {"fillAmount": 25, "type": InputCompost},
    "minecraft:oak_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:spruce_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:birch_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:jungle_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:acacia_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:dark_oak_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:mangrove_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:cherry_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:pale_oak_sapling": {"fillAmount": 25, "type": InputCompost},
    "minecraft:azalea_sapling": {"fillAmount": 25, "type": InputCompost},
}

export const HeatRate: Readonly<Record<string, number>> = {
    "minecraft:torch": 1,
    "minecraft:redstone_torch": 1,
    "minecraft:magma": 2,
    "minecraft:glowstone": 2,
    "minecraft:shroomlight": 2,
    "minecraft:lava": 3,
    "minecraft:fire": 4,
    "minecraft:soul_fire": 4,
    "minecraft:campfire": 3,
    "minecraft:soul_campfire": 3,
}