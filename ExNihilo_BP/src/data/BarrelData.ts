export const CompostableItems: Record<string, number> = {
    "minecraft:apple": 10,
    "minecraft:wheat": 5,
    "minecraft:carrot": 6,
    "minecraft:potato": 6
};

export const BARREL_CONSTANTS = {
    MAX_FILLING: 100,
    LEVEL_STEP: 25,
    BARREL_ENTITY_RADIUS: 0.47,
    WATER_SPLASH_OFFSET_Y: 0.1,
    LAVA_FIRE_SECONDS: 10,
    LAVA_DAMAGE: 4,
    COMPOSTING_TIME_TICKS: 514, //1 barrel update tick occurs every 7 game ticks. 514*7≈3600, which equals 3 minutes.
    RAIN_FILL_PER_TICK: 0.33334, //1 minute 45 seconds to fill barrel,
    HEIGHT_OFFSET: 0.0625
}

export type BarrelInput =
    "exnihilo:default"
    | "exnihilo:compost"
    | "exnihilo:water"
    | "exnihilo:lava"
    | "exnihilo:dirt"
    | "exnihilo:clay"
    | "witch_water";
export type NonEmptyLiquidBarrelType = Extract<BarrelInput, "exnihilo:water" | "exnihilo:lava">;

export const InputDefault: BarrelInput = "exnihilo:default";
export const InputCompost: BarrelInput = "exnihilo:compost";
export const InputWater: NonEmptyLiquidBarrelType = "exnihilo:water";
export const InputLava: NonEmptyLiquidBarrelType = "exnihilo:lava";
export const InputDirt: BarrelInput = "exnihilo:dirt";
export const InputClay: BarrelInput = "exnihilo:clay";

export const VARIANT_STATE_MAP: Readonly<Record<number, BarrelInput>> = {
    0: "exnihilo:default",
    1: "exnihilo:compost",
    2: "exnihilo:dirt",
    3: "exnihilo:clay",
    4: "exnihilo:water",
    5: "exnihilo:lava",
}

export const DROP_FROM_INPUT_MAP: Readonly<Record<string, string>> = {
    [InputDirt]: "minecraft:dirt",
    [InputClay]: "minecraft:clay"
}