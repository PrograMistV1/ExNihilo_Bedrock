export const LEAVES_TO_INFESTED_MAP: Readonly<Record<string, string>> = {
    "minecraft:oak_leaves": "exnihilo:infested_oak_leaves",
    "minecraft:spruce_leaves": "exnihilo:infested_spruce_leaves",
    "minecraft:birch_leaves": "exnihilo:infested_birch_leaves",
    "minecraft:jungle_leaves": "exnihilo:infested_jungle_leaves",
    "minecraft:acacia_leaves": "exnihilo:infested_acacia_leaves",
    "minecraft:dark_oak_leaves": "exnihilo:infested_dark_oak_leaves",
    "minecraft:mangrove_leaves": "exnihilo:infested_mangrove_leaves",
    "minecraft:cherry_leaves": "exnihilo:infested_cherry_leaves",
    "minecraft:pale_oak_leaves": "exnihilo:infested_pale_oak_leaves",
    "minecraft:azalea_leaves": "exnihilo:infested_azalea_leaves",
    "minecraft:flowering_azalea_leaves": "exnihilo:infested_flowering_azalea_leaves"
};

export const LEAVES: Readonly<string[]> = [
    "minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:mangrove_leaves",
    "minecraft:cherry_leaves",
    "minecraft:pale_oak_leaves",
    "minecraft:azalea_leaves",
    "minecraft:flowering_azalea_leaves"
];

export const INFESTED_LEAVES: Readonly<string[]> = [
    "exnihilo:infested_oak_leaves",
    "exnihilo:infested_spruce_leaves",
    "exnihilo:infested_birch_leaves",
    "exnihilo:infested_jungle_leaves",
    "exnihilo:infested_acacia_leaves",
    "exnihilo:infested_dark_oak_leaves",
    "exnihilo:infested_mangrove_leaves",
    "exnihilo:infested_cherry_leaves",
    "exnihilo:infested_pale_oak_leaves",
    "exnihilo:infested_azalea_leaves",
    "exnihilo:infested_flowering_azalea_leaves"
];

export const DROP_CHANCES = {
    SILKWORM_FROM_LEAVES: 0.1,
    SILKWORM_FROM_INFESTED_LEAVES: 0.2,
    STRING_FROM_INFESTED_LEAVES: 0.5
};