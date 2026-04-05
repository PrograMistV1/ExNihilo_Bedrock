export const CompostableItems: Record<string, number> = {
    "minecraft:acacia_sapling": 12.5,
    "minecraft:birch_sapling": 12.5,
    "minecraft:cherry_sapling": 12.5,
    "minecraft:dark_oak_sapling": 12.5,
    "minecraft:jungle_sapling": 12.5,
    "minecraft:oak_sapling": 12.5,
    "minecraft:pale_oak_sapling": 12.5,
    "minecraft:spruce_sapling": 12.5,
    "minecraft:mangrove_propagule": 12.5,
    "minecraft:azalea": 12.5,
    "minecraft:flowering_azalea": 12.5,
    "minecraft:acacia_leaves": 12.5,
    "minecraft:azalea_leaves": 12.5,
    "minecraft:azalea_leaves_flowered": 12.5,
    "minecraft:birch_leaves": 12.5,
    "minecraft:cherry_leaves": 12.5,
    "minecraft:dark_oak_leaves": 12.5,
    "minecraft:jungle_leaves": 12.5,
    "minecraft:mangrove_leaves": 12.5,
    "minecraft:oak_leaves": 12.5,
    "minecraft:pale_oak_leaves": 12.5,
    "minecraft:spruce_leaves": 12.5,
    "minecraft:bamboo": 10,
    "minecraft:cactus_flower": 10,
    "minecraft:dandelion": 10,
    "minecraft:poppy": 10,
    "minecraft:blue_orchid": 10,
    "minecraft:allium": 10,
    "minecraft:azure_bluet": 10,
    "minecraft:red_tulip": 10,
    "minecraft:orange_tulip": 10,
    "minecraft:white_tulip": 10,
    "minecraft:pink_tulip": 10,
    "minecraft:oxeye_daisy": 10,
    "minecraft:cornflower": 10,
    "minecraft:lily_of_the_valley": 10,
    "minecraft:wheat": 8,
    "minecraft:carrot": 10,
    "minecraft:beetroot": 10,
    "minecraft:potato": 10,
    "minecraft:apple": 10,
    "minecraft:wheat_seeds": 8,
    "minecraft:pumpkin_seeds": 8,
    "minecraft:melon_seeds": 8,
    "minecraft:beetroot_seeds": 8,
    "exnihilo:silkworm": 4,
    "exnihilo:cooked_silkworm": 4
};

export const BARREL_CONSTANTS = {
    MAX_FILLING: 100,
    BARREL_ENTITY_RADIUS: 0.47,
    COMPOSTING_TIME_TICKS: 514, //1 barrel update tick occurs every 7 game ticks. 514*7≈3600, which equals 3 minutes.
    RAIN_FILL_PER_TICK: 0.33334, //1 minute 45 seconds to fill barrel,
    HEIGHT_OFFSET: 0.0625,
    LAVA_IGNITE_CHANCE_PER_TICK: 0.015
}

export type BarrelInput =
    "exnihilo:default"
    | "exnihilo:compost"
    | "exnihilo:water"
    | "exnihilo:lava"
    | "exnihilo:dirt"
    | "exnihilo:clay"
    | "witch_water"
    | "exnihilo:netherrack";
export type NonEmptyLiquidBarrelType = Extract<BarrelInput, "exnihilo:water" | "exnihilo:lava">;

export const InputDefault: BarrelInput = "exnihilo:default";
export const InputCompost: BarrelInput = "exnihilo:compost";
export const InputWater: NonEmptyLiquidBarrelType = "exnihilo:water";
export const InputLava: NonEmptyLiquidBarrelType = "exnihilo:lava";
export const InputDirt: BarrelInput = "exnihilo:dirt";
export const InputClay: BarrelInput = "exnihilo:clay";
export const InputNetherrack: BarrelInput = "exnihilo:netherrack";

export const VARIANT_STATE_MAP: Readonly<Record<number, BarrelInput>> = {
    0: "exnihilo:default",
    1: "exnihilo:compost",
    2: "exnihilo:dirt",
    3: "exnihilo:clay",
    4: "exnihilo:water",
    5: "exnihilo:lava",
    6: "exnihilo:netherrack",
}

export const DROP_FROM_INPUT_MAP: Readonly<Record<string, string>> = {
    [InputDirt]: "minecraft:dirt",
    [InputClay]: "minecraft:clay",
    [InputNetherrack]: "minecraft:netherrack",
}