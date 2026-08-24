/*
 * FallingBlockComponent template by GST378
 * https://github.com/GST378/GSTs-Repository/blob/main/templates/FallingBlock/BP/scripts/FallingBlock/manager.js
 * Copyright (C) 2025 GST378
 *
 * Used with permission. Original license: GPL v3.
 */

// These are the blocks that can be replaced by the falling blocks
export const REPLACEABLE_BLOCKS = new Set([
    'minecraft:air', 'minecraft:structure_void',
    'minecraft:water', 'minecraft:flowing_water', 'minecraft:bubble_column',
    'minecraft:lava', 'minecraft:flowing_lava',
    'minecraft:fire', 'minecraft:soul_fire',
    'minecraft:vine', 'minecraft:glow_lichen',
    'minecraft:deadbush', 'minecraft:short_grass', 'minecraft:tall_grass',
    'minecraft:fern', 'minecraft:large_fern', 'minecraft:seagrass',
    'minecraft:warped_roots', 'minecraft:crimson_roots', 'minecraft:nether_sprouts',
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => `minecraft:light_block_${n}`)
]);

// The Falling Blocks that are on top of these blocks will fall
export const PASSABLE_BLOCKS = new Set([...REPLACEABLE_BLOCKS,
    'minecraft:moss_carpet', 'minecraft:pale_moss_carpet', 'minecraft:pale_hanging_moss',
    'minecraft:acacia_sapling', 'minecraft:bamboo_sapling', 'minecraft:birch_sapling',
    'minecraft:cherry_sapling', 'minecraft:dark_oak_sapling', 'minecraft:jungle_sapling',
    'minecraft:mangrove_propagule', 'minecraft:pale_oak_sapling', 'minecraft:oak_sapling',
    'minecraft:spruce_sapling', 'minecraft:kelp', 'minecraft:sea_pickle', 'minecraft:reeds',
    'minecraft:nether_wart', 'minecraft:twisting_vines', 'minecraft:warped_fungus',
    'minecraft:crimson_fungus', 'minecraft:brown_mushroom', 'minecraft:red_mushroom',
    'minecraft:small_dripleaf_block', 'minecraft:snow_layer', 'minecraft:cocoa', 'minecraft:wheat',
    'minecraft:potatoes', 'minecraft:carrots', 'minecraft:beetroot', 'minecraft:pumpkin_stem',
    'minecraft:melon_stem', 'minecraft:pitcher_crop', 'minecraft:torchflower_crop', 'minecraft:sweet_berry_bush',
    'minecraft:brain_coral', 'minecraft:brain_coral_fan', 'minecraft:brain_coral_wall_fan',
    'minecraft:bubble_coral', 'minecraft:bubble_coral_fan', 'minecraft:bubble_coral_wall_fan',
    'minecraft:fire_coral', 'minecraft:fire_coral_fan', 'minecraft:fire_coral_wall_fan',
    'minecraft:horn_coral', 'minecraft:horn_coral_fan', 'minecraft:horn_coral_wall_fan',
    'minecraft:tube_coral', 'minecraft:tube_coral_fan', 'minecraft:tube_coral_wall_fan',
    'minecraft:dead_brain_coral', 'minecraft:dead_brain_coral_fan', 'minecraft:dead_brain_coral_wall_fan',
    'minecraft:dead_bubble_coral', 'minecraft:dead_bubble_coral_fan', 'minecraft:dead_bubble_coral_wall_fan',
    'minecraft:dead_fire_coral', 'minecraft:dead_fire_coral_fan', 'minecraft:dead_fire_coral_wall_fan',
    'minecraft:dead_horn_coral', 'minecraft:dead_horn_coral_fan', 'minecraft:dead_horn_coral_wall_fan',
    'minecraft:dead_tube_coral', 'minecraft:dead_tube_coral_fan', 'minecraft:dead_tube_coral_wall_fan',
    'minecraft:dandelion', 'minecraft:poppy', 'minecraft:blue_orchid', 'minecraft:allium', 'minecraft:azure_bluet',
    'minecraft:red_tulip', 'minecraft:orange_tulip', 'minecraft:white_tulip', 'minecraft:pink_tulip', 'minecraft:oxeye_daisy',
    'minecraft:cornflower', 'minecraft:lily_of_the_valley', 'minecraft:sunflower', 'minecraft:lilac',
    'minecraft:rose_bush', 'minecraft:peony', 'minecraft:pitcher_plant', 'minecraft:pink_petals',
    'minecraft:wither_rose', 'minecraft:torchflower', 'minecraft:open_eyeblossom', 'minecraft:closed_eyeblossom'
]);

// These entities can trigger falling blocks when spawning
export const TRIGGERING_ENTITIES = new Set(['minecraft:tnt', 'minecraft:falling_block']);