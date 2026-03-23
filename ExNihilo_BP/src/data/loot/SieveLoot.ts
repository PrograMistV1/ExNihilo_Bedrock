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
    ],
    "exnihilo:gravel": []
}

const DROP_BY_MESH: Record<MeshType, Record<string, RollPattern[]>> = {
    string: STRING_MESH_DROPS,
    flint: {},
    iron: {},
    diamond: {},
    emerald: {},
    netherite: {},
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