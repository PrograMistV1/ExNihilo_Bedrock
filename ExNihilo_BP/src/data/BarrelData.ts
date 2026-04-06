import {TicksPerSecond} from "@minecraft/server";
import {InputClay, InputDirt, InputNetherrack} from "../components/blocks/tiles/FilledTileEntityBlock";

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

export const BARREL_CONFIG = {
    updateInterval: 8,
    compostingTimeSeconds: 180,
    rainFillSeconds: 105,
    lavaIgniteChance: 0.015
};

const updatesPerSecond = TicksPerSecond / BARREL_CONFIG.updateInterval;
export const BARREL_TIMINGS = {
    compostingUpdates: Math.ceil(BARREL_CONFIG.compostingTimeSeconds * updatesPerSecond),
    rainFillPerUpdate: 100 / (BARREL_CONFIG.rainFillSeconds * updatesPerSecond)
};

export const DROP_FROM_INPUT_MAP: Readonly<Record<string, string>> = {
    [InputDirt]: "minecraft:dirt",
    [InputClay]: "minecraft:clay",
    [InputNetherrack]: "minecraft:netherrack",
}