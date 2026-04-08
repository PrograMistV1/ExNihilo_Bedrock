/*
 * FallingBlockComponent template by GST378
 * https://github.com/GST378/GSTs-Repository/blob/main/templates/FallingBlock/BP/scripts/FallingBlock/fallingBlocks.js
 * Copyright (C) 2025 GST378
 *
 * Used with permission. Original license: GPL v3.
 */

import {Block, BlockPermutation, ItemStack, world} from '@minecraft/server';

function dropFallingBlock(blockId: string, block: Block) {
    if (world.gameRules.doEntityDrops) block.dimension.spawnItem(new ItemStack(blockId), block.center());
    block.dimension.spawnParticle(`${blockId}.break_particle`, block.center());
}

export interface FallingBlockConfig {
    type?: string;
    destroyOnFall?: boolean;
    fallingSpeed?: number;
    solidBlock?: string;
    maxLayers?: number;
}

export interface FallingBlock {
    config?: FallingBlockConfig;
    onStartFalling?: (fallingBlockPerm: BlockPermutation, block: Block) => void;
    onRemove?: (fallingBlockPerm: BlockPermutation, block: Block) => void;
    onGround?: (fallingBlockPerm: BlockPermutation, block: Block) => void;
}

export const FallingBlocks: Record<string, FallingBlock> = {
    'exnihilo:dust': {
        onRemove: (_fallingBlockPerm: BlockPermutation, block: Block) => {
            dropFallingBlock('exnihilo:dust', block);
        }
    }
}