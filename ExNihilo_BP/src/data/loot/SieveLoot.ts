import {ItemStack} from "@minecraft/server";
import {MeshType} from "../SieveData";

type RollPattern = {
    result: string;
    chances: number[]; // 0..1
};

const STRING_MESH_DROPS: Record<string, RollPattern[]> = {
    "exnihilo:dirt": [
        {result: "exnihilo:pebble_stone", chances: [1, 1, 0.5, 0.5, 0.1, 0.1]},
        {result: "exnihilo:pebble_andesite", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_diorite", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_granite", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_basalt", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_blackstone", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_calcite", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_deepslate", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_dripstone", chances: [0.5, 0.1]},
        {result: "exnihilo:pebble_tuff", chances: [0.5, 0.1]},
        {result: "exnihilo:dark_oak_seeds", chances: [0.05]},
        {result: "exnihilo:spruce_seeds", chances: [0.05]},
        {result: "exnihilo:birch_seeds", chances: [0.05]},
        {result: "exnihilo:jungle_seeds", chances: [0.05]},
        {result: "exnihilo:acacia_seeds", chances: [0.05]},
        {result: "exnihilo:oak_seeds", chances: [0.05]},
        {result: "minecraft:cherry_sapling", chances: [0.05]},
        {result: "exnihilo:carrot_seeds", chances: [0.05]},
        {result: "exnihilo:potato_seeds", chances: [0.05]},
        {result: "exnihilo:sweet_berry_seeds", chances: [0.05]},
        {result: "exnihilo:bamboo_seeds", chances: [0.05]},
        {result: "exnihilo:fern_seeds", chances: [0.05]},
        {result: "exnihilo:large_fern_seeds", chances: [0.05]},
    ],
    "exnihilo:sand": [
        {result: "exnihilo:cactus_seeds", chances: [0.05]},
        {result: "exnihilo:sugarcane_seeds", chances: [0.05]},
        {result: "exnihilo:kelp_seeds", chances: [0.5]},
        {result: "exnihilo:pickle_seeds", chances: [0.5]},
    ],
    "exnihilo:gravel": [
        {result: "minecraft:amethyst_shard", chances: [0.05]},
        {result: "minecraft:flint", chances: [0.25]},
    ],
    "exnihilo:soul_sand": [
        {result: "minecraft:nether_wart", chances: [0.1]}
    ],
    "exnihilo:dust": [
        {result: "minecraft:gunpowder", chances: [0.07]},
        {result: "minecraft:bone_meal", chances: [0.2]}
    ]
};

const FLINT_MESH_DROPS: Record<string, RollPattern[]> = {
    "exnihilo:gravel": [
        {result: "minecraft:amethyst_shard", chances: [0.1]},
        {result: "exnihilo:iron_pieces", chances: [0.1]},
        {result: "exnihilo:gold_pieces", chances: [0.05]},
        {result: "exnihilo:copper_pieces", chances: [0.05]},
        {result: "minecraft:flint", chances: [0.25]},
        {result: "minecraft:coal", chances: [0.125]},
        {result: "minecraft:lapis_lazuli", chances: [0.05]},
    ],
};

const IRON_MESH_DROPS: Record<string, RollPattern[]> = {
    "exnihilo:gravel": [
        {result: "minecraft:amethyst_shard", chances: [0.15]},
        {result: "exnihilo:iron_pieces", chances: [0.15]},
        {result: "exnihilo:gold_pieces", chances: [0.075]},
        {result: "exnihilo:copper_pieces", chances: [0.075]},
        {result: "minecraft:diamond", chances: [0.008]},
        {result: "minecraft:emerald", chances: [0.008]},
    ],
    "exnihilo:dust": [
        {result: "minecraft:redstone", chances: [0.125]},
        {result: "minecraft:glowstone_dust", chances: [0.0625]},
        {result: "minecraft:blaze_powder", chances: [0.05]},
    ],
};

const DIAMOND_MESH_DROPS: Record<string, RollPattern[]> = {
    "exnihilo:gravel": [
        {result: "minecraft:amethyst_shard", chances: [0.2]},
        {result: "exnihilo:iron_pieces", chances: [0.25]},
        {result: "exnihilo:gold_pieces", chances: [0.15]},
        {result: "exnihilo:copper_pieces", chances: [0.1]},
        {result: "minecraft:diamond", chances: [0.016]},
        {result: "minecraft:emerald", chances: [0.016]},
    ],
    "exnihilo:sand": [
        {result: "exnihilo:iron_pieces", chances: [0.5]},
    ],
    "exnihilo:dust": [
        {result: "minecraft:redstone", chances: [0.25]},
    ],
};

const EMERALD_MESH_DROPS: Record<string, RollPattern[]> = {};

const NETHERITE_MESH_DROPS: Record<string, RollPattern[]> = {};

export const DROP_BY_MESH: Record<MeshType, Record<string, RollPattern[]>> = {
    string: STRING_MESH_DROPS,
    flint: FLINT_MESH_DROPS,
    iron: IRON_MESH_DROPS,
    diamond: DIAMOND_MESH_DROPS,
    emerald: EMERALD_MESH_DROPS,
    netherite: NETHERITE_MESH_DROPS,
    null: {}
}

export function rollDrops(mesh: MeshType, inputBlock: string): ItemStack[] {
    const drops: ItemStack[] = [];
    DROP_BY_MESH[mesh][inputBlock]?.forEach(({result, chances}) => {
        chances.forEach(chance => {
            if (Math.random() <= chance) drops.push(new ItemStack(result));
        });
    });
    return drops;
}