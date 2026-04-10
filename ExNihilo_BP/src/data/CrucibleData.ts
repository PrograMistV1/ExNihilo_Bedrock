import {TicksPerSecond} from "@minecraft/server";

export const CRUCIBLE_CONFIG = {
    updateInterval: 8,
    meltingTimeSeconds: 180
};

const updatesPerSecond = TicksPerSecond / CRUCIBLE_CONFIG.updateInterval;
export const CRUCIBLE_TIMINGS = {
    meltingUpdates: Math.ceil(CRUCIBLE_CONFIG.meltingTimeSeconds * updatesPerSecond)
};

export const MeltableBlocks: Readonly<Record<string, number>> = {
    "minecraft:stone": 25,
    "minecraft:cobblestone": 25,
    "minecraft:andesite": 25,
    "minecraft:basalt": 25,
    "minecraft:blackstone": 25,
    "minecraft:calcite": 25,
    "minecraft:deepslate": 25,
    "minecraft:diorite": 25,
    "minecraft:dripstone_block": 25,
    "minecraft:end_stone": 25,
    "minecraft:granite": 25,
    "minecraft:tuff": 25,
    "minecraft:gravel": 20,
    "minecraft:sand": 10,
    "minecraft:obsidian": 100,
    "minecraft:netherrack": 100,
    "exnihilo:dust": 5,
    "exnihilo:crushed_andesite": 20,
    "exnihilo:crushed_basalt": 20,
    "exnihilo:crushed_blackstone": 20,
    "exnihilo:crushed_calcite": 20,
    "exnihilo:crushed_deepslate": 20,
    "exnihilo:crushed_diorite": 20,
    "exnihilo:crushed_dripstone": 20,
    "exnihilo:crushed_end_stone": 20,
    "exnihilo:crushed_granite": 20,
    "exnihilo:crushed_netherrack": 20,
    "exnihilo:crushed_tuff": 20,
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