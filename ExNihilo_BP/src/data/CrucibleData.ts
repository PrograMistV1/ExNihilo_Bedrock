export const VARIANT_STATE_MAP: Readonly<Record<number, CrucibleInput>> = {
    0: "exnihilo:default",
    1: "exnihilo:gravel",
    2: "exnihilo:lava"
}

export const CRUCIBLE_CONSTANTS = {
    CENTER_OFFSET: 0.5,
    HEIGHT_OFFSET: 0.1875,
    MELTING_TIME_TICKS: 20
}

export type CrucibleInput = "exnihilo:default" | "exnihilo:gravel" | "exnihilo:lava";

export const InputDefault = "exnihilo:default";
export const InputGravel = "exnihilo:gravel";
export const InputLava = "exnihilo:lava";

export const MeltableBlocks: Readonly<Record<string, number>> = {
    "minecraft:gravel": 10,
    "minecraft:cobblestone": 10,
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
    "minecraft:campfire": 4,
    "minecraft:soul_campfire": 4,
}