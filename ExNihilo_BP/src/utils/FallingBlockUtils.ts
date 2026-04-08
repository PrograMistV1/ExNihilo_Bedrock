import {Block, BlockPermutation} from '@minecraft/server';
import {FallingBlock} from './FallingBlocks';
import {FALLING_BLOCK_LAYER_STATE, PASSABLE_BLOCKS, REPLACEABLE_BLOCKS} from "./FallingBlocksManager";

export function isWater(block: Block): boolean {
    return block.typeId === 'minecraft:water' || block.typeId === 'minecraft:flowing_water';
}

export function shouldFall(block: Block, fb: FallingBlock): boolean {
    if (block.y <= block.dimension.heightRange.min) return false;
    const below = block.below();
    if (!below) return false;
    if (PASSABLE_BLOCKS.has(below.typeId)) return true;
    if (fb.config?.type !== 'layers') return false;
    return below.typeId === block.typeId
        && (below.permutation.getState(FALLING_BLOCK_LAYER_STATE) as number) < fb.config.maxLayers - 1;
}

export function resolvePowderPermutation(
    blockId: string,
    solidBlock: BlockPermutation | string | undefined,
    isInWater: boolean
): BlockPermutation {
    if (!solidBlock || !isInWater) return BlockPermutation.resolve(blockId);
    return solidBlock instanceof BlockPermutation
        ? solidBlock
        : BlockPermutation.resolve(solidBlock);
}

export function isReplaceable(block: Block): boolean {
    return REPLACEABLE_BLOCKS.has(block.typeId);
}

export function entityIdToBlockId(entityTypeId: string): string {
    return entityTypeId.replace('.entity', '');
}