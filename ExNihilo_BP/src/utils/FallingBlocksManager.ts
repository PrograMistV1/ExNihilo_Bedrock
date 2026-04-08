/*
 * FallingBlockComponent template by GST378
 * https://github.com/GST378/GSTs-Repository/blob/main/templates/FallingBlock/BP/scripts/FallingBlock/manager.js
 * Copyright (C) 2025 GST378
 *
 * Used with permission. Original license: GPL v3.
 */

import {Block, BlockPermutation, BlockVolume, Entity, system, VanillaEntityIdentifier, world} from '@minecraft/server';
import {FallingBlock, FallingBlocks} from "./FallingBlocks";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

export const FALLING_BLOCK_LAYER_STATE = 'falling_block:layers' as keyof BlockStateSuperset;
export const FALLING_BLOCK_LAYER_PROPERTY = 'falling_block:layers';

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


class FallingBlockUtils {

    // Check if the block should fall
    static shouldFall(block: Block, fallingBlock: FallingBlock) {
        if (block.y <= block.dimension.heightRange.min) return false;
        const blockBelow = block.below();
        return blockBelow && (PASSABLE_BLOCKS.has(blockBelow.typeId) || (fallingBlock?.config?.type === 'layers' && blockBelow.typeId === block.typeId && (blockBelow.permutation.getState(FALLING_BLOCK_LAYER_STATE) as number) < fallingBlock?.config?.maxLayers - 1));
    }

    // Resolves the permutation to be placed for the powder blocks
    static resolvePowderPermutation(permutation: string, solidBlock: BlockPermutation | string, isInWater = false) {
        return (!solidBlock || !isInWater) ? BlockPermutation.resolve(permutation) : solidBlock instanceof BlockPermutation ? solidBlock : BlockPermutation.resolve(solidBlock);
    }
}

class FallingBlockManager {
    // Pull the Falling Blocks stacked in sequence.
    pullAboveBlock(block: Block) {
        if (block.y < block.dimension.heightRange.max) system.runTimeout(() => this.startFalling(block.above()), 5);
    }

    // Handles the logic of causing the blocks to fall.
    startFalling(block: Block) {
        const fb = FallingBlocks[block?.typeId];
        if (!fb || !FallingBlockUtils.shouldFall(block, fb)) return;
        const {typeId, permutation} = block;
        fb.onStartFalling?.(block.permutation, block);
        block.setType("minecraft:air");
        const fallingEntity = block.dimension.spawnEntity(`${typeId}.entity` as keyof VanillaEntityIdentifier, block.bottomCenter());
        if (fb?.config?.fallingSpeed) fallingEntity.applyImpulse({
            x: 0,
            y: Math.min(1, -Math.abs(fb.config.fallingSpeed)),
            z: 0
        });
        if (fb?.config?.type === 'layers') fallingEntity.setProperty(FALLING_BLOCK_LAYER_PROPERTY, permutation.getState(FALLING_BLOCK_LAYER_STATE));
        this.pullAboveBlock(block);
    }

    // Handles the logic of placing the blocks after falling.
    onGround(block: Block, entity: Entity) {
        const id = entity.typeId.replace('.entity', ''), fb = FallingBlocks[id];
        if (!fb) return;
        let permutationToPlace = null;
        const isReplaceable = REPLACEABLE_BLOCKS.has(block.typeId),
            stackLayers = fb?.config?.type === 'layers' && block.typeId === id,
            action = !stackLayers && (fb?.config?.destroyOnFall || !isReplaceable) ? 'destroy' : fb?.config?.type;
        switch (action) {
            case 'destroy':
                break;
            case 'powder':
                permutationToPlace = FallingBlockUtils.resolvePowderPermutation(id, fb?.config?.solidBlock, entity.isInWater);
                break;
            case 'layers': {
                const addLayers = 1 + (entity.getProperty(FALLING_BLOCK_LAYER_PROPERTY) as number);
                if (!stackLayers) {
                    if (isReplaceable) permutationToPlace = BlockPermutation.resolve(id).withState(FALLING_BLOCK_LAYER_STATE as keyof BlockStateSuperset, addLayers - 1);
                    break;
                }
                const blockLayers = (block.permutation.getState(FALLING_BLOCK_LAYER_STATE) as number) + addLayers;
                if (blockLayers < fb?.config.maxLayers) {
                    permutationToPlace = BlockPermutation.resolve(id).withState(FALLING_BLOCK_LAYER_STATE as keyof BlockStateSuperset, blockLayers);
                    break;
                }
                permutationToPlace = BlockPermutation.resolve(id).withState(FALLING_BLOCK_LAYER_STATE as keyof BlockStateSuperset, fb?.config.maxLayers - 1);
                if (block.y < block.dimension.heightRange.max) block.above().setPermutation(BlockPermutation.resolve(id, {[FALLING_BLOCK_LAYER_STATE]: blockLayers - fb.config.maxLayers}));
                break;
            }
            default:
                permutationToPlace = BlockPermutation.resolve(id);
        }
        entity.remove();
        if (permutationToPlace) {
            block.setPermutation(permutationToPlace);
            fb.onGround?.(block.permutation, block);
        } else fb.onRemove?.(block.permutation, block);
    }
}

const FBM = new FallingBlockManager();

// Falling Blocks Triggering Events
world.afterEvents.playerBreakBlock.subscribe(({block}) => FBM.startFalling(block.dimension.getBlockFromRay(block.location, {
    x: 0,
    y: 1,
    z: 0
}, {maxDistance: 2})?.block));
world.afterEvents.playerPlaceBlock.subscribe(({block}) => {
    FBM.startFalling(block)
}, {blockTypes: Object.keys(FallingBlocks)});
world.afterEvents.explosion.subscribe((data) => {
    const impactedBlocks = data.getImpactedBlocks();
    for (let i = 0; i < impactedBlocks.length; i++) {
        const aboveBlock = impactedBlocks[i]?.above();
        if (FallingBlocks[aboveBlock?.typeId]) FBM.startFalling(aboveBlock);
    }
});

world.afterEvents.pistonActivate.subscribe(async ({piston: {block}, isExpanding}) => {
    if (block.typeId === 'minecraft:piston' && !isExpanding) {
        const offset = {x: 0, y: 1, z: 0};
        const facingDirection = block.permutation.getState('facing_direction');
        if (block.y === block.dimension.heightRange.max) return;
        switch (facingDirection) {
            case 0:
                offset.y = 0;
                break;
            case 1:
                if (block.y + 1 < block.dimension.heightRange.max) offset.y = 2;
                break;
            case 2:
                offset.z = 1;
                break;
            case 3:
                offset.z = -1;
                break;
            case 4:
                offset.x = 1;
                break;
            case 5:
                offset.x = -1;
                break;
        }
        if (offset.y) FBM.startFalling(block.offset(offset));
        return;
    }
    const fallingBlockLocations = block.dimension.getBlocks(new BlockVolume(
        {x: block.x - 13, y: block.y - 13, z: block.z - 13},
        {x: block.x + 13, y: block.y + 13, z: block.z + 13}
    ), {includeTypes: ['minecraft:moving_block']})?.getBlockLocationIterator();
    await system.waitTicks(2);
    if (fallingBlockLocations) for (const location of fallingBlockLocations) FBM.startFalling(block.dimension.getBlock(location));
});

world.afterEvents.entitySpawn.subscribe(({entity}) => {
    if (!TRIGGERING_ENTITIES.has(entity.typeId)) return;
    if (entity.location.y < entity.dimension.heightRange.max) FBM.startFalling(entity.dimension.getBlock({
        x: entity.location.x,
        y: entity.location.y + 1,
        z: entity.location.z
    }));
});

// Triggers when the falling entity touches the ground
system.afterEvents.scriptEventReceive.subscribe(({id, sourceEntity}) => {
    if (id === 'falling_block:is_on_ground') {
        if (!sourceEntity || sourceEntity.location.y < sourceEntity.dimension.heightRange.min || sourceEntity.location.y > sourceEntity.dimension.heightRange.max) sourceEntity?.remove();
        else FBM.onGround(sourceEntity.dimension.getBlock(sourceEntity.location), sourceEntity);
    }
});