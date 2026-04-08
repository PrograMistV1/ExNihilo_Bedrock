/*
 * FallingBlock template by GST378
 * https://github.com/GST378/GSTs-Repository/blob/main/templates/FallingBlock/BP/scripts/FallingBlock/fallingBlocks.js
 * Copyright (C) 2025 GST378
 *
 * Used with permission. Original license: GPL v3.
 */

import {Block, Dimension, ItemStack, world} from '@minecraft/server';

function dropFallingBlock(blockId: string, dimension: Dimension, block: Block) {
    if (world.gameRules.doEntityDrops) dimension.spawnItem(new ItemStack(blockId), block.center());
    dimension.spawnParticle(`${blockId}.break_particle`, block.center());
}

export const FallingBlocks = {
    'exnihilo:dust': {
        onRemove: (dimension: Dimension, block: Block) => {
            dropFallingBlock('exnihilo:dust', dimension, block);
        }
    }
}