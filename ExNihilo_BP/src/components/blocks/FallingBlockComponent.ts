import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockCustomComponent,
    BlockPermutation,
    BlockVolume,
    Entity,
    EntitySpawnAfterEvent,
    ExplosionAfterEvent,
    PistonActivateAfterEvent,
    PlayerBreakBlockAfterEvent,
    ScriptEventCommandMessageAfterEvent,
    system,
    VanillaEntityIdentifier,
    world
} from "@minecraft/server";
import {isWater, resolvePowderPermutation, shouldFall} from "../../utils/FallingBlockUtils";
import {FallingBlocks} from "../../utils/FallingBlocks";
import {
    FALLING_BLOCK_LAYER_PROPERTY,
    FALLING_BLOCK_LAYER_STATE,
    REPLACEABLE_BLOCKS,
    TRIGGERING_ENTITIES
} from "utils/FallingBlocksManager";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

export class FallingBlockComponent implements BlockCustomComponent {

    private static eventsBound = false;
    private static eventHandler: FallingBlockComponent;

    constructor() {
        if (FallingBlockComponent.eventsBound) return;

        FallingBlockComponent.eventsBound = true;
        FallingBlockComponent.eventHandler = this;

        system.afterEvents.scriptEventReceive.subscribe((e) => FallingBlockComponent.eventHandler.onScriptEvent(e), {namespaces: ['falling_block']});
        world.afterEvents.entitySpawn.subscribe((e) => FallingBlockComponent.eventHandler.onEntitySpawn(e));
        world.afterEvents.playerBreakBlock.subscribe((e) => FallingBlockComponent.eventHandler.onPlayerBreakEvent(e));
        world.afterEvents.explosion.subscribe((e) => FallingBlockComponent.eventHandler.onExplosion(e));
        world.afterEvents.pistonActivate.subscribe((e) => FallingBlockComponent.eventHandler.onPistonActivate(e));
    }

    beforeOnPlayerPlace = (e: BlockComponentPlayerPlaceBeforeEvent): void => {
        if (!isWater(e.block)) return;
        const blockId = e.permutationToPlace.type.id;

        e.permutationToPlace = resolvePowderPermutation(blockId, FallingBlocks[blockId]?.config?.solidBlock, true);
    };

    onPlace = (e: BlockComponentOnPlaceEvent): void => {
        this.startFalling(e.block);
    }

    pullAboveBlock(block: Block) {
        if (block.y < block.dimension.heightRange.max) system.runTimeout(() => this.startFalling(block.above()), 5);
    }

    // Handles the logic of causing the blocks to fall.
    private startFalling(block: Block) {
        const fb = FallingBlocks[block?.typeId];
        if (!fb || !shouldFall(block, fb)) return;
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
    private onGround(block: Block, entity: Entity) {
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
                permutationToPlace = resolvePowderPermutation(id, fb?.config?.solidBlock, entity.isInWater);
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

    private onScriptEvent(e: ScriptEventCommandMessageAfterEvent): void {
        if (e.id !== 'falling_block:is_on_ground' || !e.sourceEntity) return;

        const pos = e.sourceEntity.location;
        const dimension = e.sourceEntity.dimension;
        if (pos.y < dimension.heightRange.min || pos.y > dimension.heightRange.max) {
            e.sourceEntity?.remove();
        } else {
            this.onGround(dimension.getBlock(pos), e.sourceEntity);
        }
    }

    private onEntitySpawn(e: EntitySpawnAfterEvent): void {
        if (!TRIGGERING_ENTITIES.has(e.entity.typeId)) return;

        const pos = e.entity.location;
        const dimension = e.entity.dimension;
        if (pos.y < dimension.heightRange.max) {
            this.startFalling(dimension.getBlock({...pos, y: pos.y + 2}));
        }
    }

    private onPlayerBreakEvent(e: PlayerBreakBlockAfterEvent): void {
        this.startFalling(e.block.above());
    }

    private onExplosion(e: ExplosionAfterEvent): void {
        const impactedBlocks = e.getImpactedBlocks();
        for (let i = 0; i < impactedBlocks.length; i++) {
            const aboveBlock = impactedBlocks[i]?.above();
            if (FallingBlocks[aboveBlock?.typeId]) this.startFalling(aboveBlock);
        }
    }

    private async onPistonActivate(e: PistonActivateAfterEvent): Promise<void> {
        const {dimension, x, y, z} = e.block;
        if (e.block.typeId === 'minecraft:piston' && !e.isExpanding) {
            if (y === dimension.heightRange.max) return;

            const facing = e.block.permutation.getState('facing_direction');
            let offsetX = 0, offsetY = 1, offsetZ = 0;

            if (facing === 0) offsetY = 0;
            else if (facing === 1) {
                if (y + 1 < dimension.heightRange.max) offsetY = 2;
                else return;
            } else if (facing === 2) offsetZ = 1;
            else if (facing === 3) offsetZ = -1;
            else if (facing === 4) offsetX = 1;
            else if (facing === 5) offsetX = -1;

            if (offsetX || offsetY || offsetZ) {
                this.startFalling(e.block.offset({x: offsetX, y: offsetY, z: offsetZ}));
            }
            return;
        }

        const iterator = dimension.getBlocks(
            new BlockVolume(
                {x: x - 13, y: y - 13, z: z - 13},
                {x: x + 13, y: y + 13, z: z + 13}
            ),
            {includeTypes: ['minecraft:moving_block']}
        )?.getBlockLocationIterator();
        if (!iterator) return;

        await system.waitTicks(2);
        for (const location of iterator) {
            const target = dimension.getBlock(location);
            if (target) {
                this.startFalling(target);
            }
        }
    }
}