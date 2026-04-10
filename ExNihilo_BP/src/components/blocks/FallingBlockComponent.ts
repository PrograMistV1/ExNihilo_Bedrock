import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockCustomComponent,
    BlockPermutation,
    BlockVolume,
    CustomComponentParameters,
    EntitySpawnAfterEvent,
    ExplosionAfterEvent,
    ItemStack,
    PistonActivateAfterEvent,
    PlayerBreakBlockAfterEvent,
    ScriptEventCommandMessageAfterEvent,
    system,
    VanillaEntityIdentifier,
    world
} from "@minecraft/server";
import {PASSABLE_BLOCKS, REPLACEABLE_BLOCKS, TRIGGERING_ENTITIES} from "data/FallingBlocksData";

export interface FallingBlockConfig {
    alias?: string;
    spawnEvent?: string;
    convertTo?: string;
}

export class FallingBlockComponent implements BlockCustomComponent {

    private static eventsBound = false;
    private static eventHandler: FallingBlockComponent;

    constructor() {
        if (FallingBlockComponent.eventsBound) return;

        FallingBlockComponent.eventsBound = true;
        FallingBlockComponent.eventHandler = this;

        const handler = FallingBlockComponent.eventHandler;
        system.afterEvents.scriptEventReceive.subscribe(this.onScriptEvent.bind(this), {namespaces: ['exnihilo']});
        world.afterEvents.entitySpawn.subscribe((e) => handler.onEntitySpawn(e));
        world.afterEvents.playerBreakBlock.subscribe((e) => handler.onPlayerBreakEvent(e));
        world.afterEvents.explosion.subscribe((e) => handler.onExplosion(e));
        world.afterEvents.pistonActivate.subscribe((e) => handler.onPistonActivate(e));
        world.beforeEvents.entityRemove.subscribe((e) => {
            const dimension = e.removedEntity.dimension;
            const location = e.removedEntity.location;
            const block = dimension.getBlock(location);
            const originalBlock = e.removedEntity.getDynamicProperty('blockTypeId') as string | undefined;
            if (!block || !originalBlock || e.removedEntity.getDynamicProperty('converted')) return;

            system.run(() => {
                if (block.hasComponent('minecraft:replaceable') || REPLACEABLE_BLOCKS.has(block.typeId)) {
                    dimension.setBlockType(location, originalBlock);
                } else {
                    dimension.spawnItem(new ItemStack(originalBlock), {...location, y: location.y + 0.5});
                    dimension.spawnParticle(`${originalBlock}.break_particle`, {...location, y: location.y + 0.5});
                }
            });
        })
    }

    beforeOnPlayerPlace = (e: BlockComponentPlayerPlaceBeforeEvent, param: CustomComponentParameters): void => {
        const isWater = e.block.typeId === 'minecraft:water' || e.block.typeId === 'minecraft:flowing_water';
        const config = param.params as FallingBlockConfig;

        if (!isWater || !config['convertTo']) return;

        e.permutationToPlace = BlockPermutation.resolve(config['convertTo']);
    };

    onPlace = (e: BlockComponentOnPlaceEvent): void => {
        this.startFalling(e.block);
    };

    private startFalling(block: Block): void {
        if (!this.isFallingBlock(block) || !PASSABLE_BLOCKS.has(block.below()?.typeId)) return;

        const config = this.getConfig(block);
        const blockId = block.typeId;
        const entityId = `${config.alias ?? blockId}.entity` as keyof VanillaEntityIdentifier;

        block.setType("minecraft:air");

        const fallingEntity = block.dimension.spawnEntity(entityId, block.center(), {
            spawnEvent: config.spawnEvent
        });
        fallingEntity.setDynamicProperty('config', JSON.stringify(config));
        fallingEntity.setDynamicProperty('blockTypeId', blockId)

        if (block.y < block.dimension.heightRange.max) {
            system.run(() => this.startFalling(block.above()));
        }
    }

    private isFallingBlock(block: Block): boolean {
        return block.hasComponent("exnihilo:falling_block")
            || block.hasComponent("exnihilo:falling_layer_block");
    }

    private getConfig(block: Block): FallingBlockConfig {
        if (!this.isFallingBlock(block)) {
            throw new Error(`${block.typeId} must have "exnihilo:falling_block" or "exnihilo:falling_layer_block" component to get config!`);
        }
        return (
            block.getComponent("exnihilo:falling_block")
            ?? block.getComponent("exnihilo:falling_layer_block")
        ).customComponentParameters.params as FallingBlockConfig;
    }

    private onScriptEvent(e: ScriptEventCommandMessageAfterEvent): void {
        if (e.id !== 'exnihilo:convert_to') return;

        const config = JSON.parse(e.sourceEntity.getDynamicProperty('config') as string) as FallingBlockConfig;
        if (!config['convertTo']) return;

        e.sourceEntity.dimension.setBlockType(e.sourceEntity.location, config['convertTo']);
        e.sourceEntity.setDynamicProperty("converted", true)
        e.sourceEntity.remove();
    }

    private onEntitySpawn(e: EntitySpawnAfterEvent): void {
        if (!TRIGGERING_ENTITIES.has(e.entity.typeId)) return;

        const {location: pos, dimension} = e.entity;

        if (pos.y < dimension.heightRange.max) {
            this.startFalling(dimension.getBlock({...pos, y: pos.y + 2}));
        }
    }

    private onPlayerBreakEvent(e: PlayerBreakBlockAfterEvent): void {
        this.startFalling(e.block.above());
    }

    private onExplosion(e: ExplosionAfterEvent): void {
        for (const impactedBlock of e.getImpactedBlocks()) {
            const aboveBlock = impactedBlock?.above();
            if (this.isFallingBlock(aboveBlock)) this.startFalling(aboveBlock);
        }
    }

    private async onPistonActivate(e: PistonActivateAfterEvent): Promise<void> {
        const {dimension, x, y, z} = e.block;

        if (e.block.typeId === 'minecraft:piston' && !e.isExpanding) {
            this.handlePistonRetract(e.block, dimension, y);
            return;
        }

        await this.handleMovingBlocks(dimension, x, y, z);
    }

    private handlePistonRetract(block: Block, dimension: Block['dimension'], y: number): void {
        if (y === dimension.heightRange.max) return;

        const facing = block.permutation.getState('facing_direction');
        const offset = this.getPistonOffset(facing, y, dimension);

        if (offset) this.startFalling(block.offset(offset));
    }

    private getPistonOffset(
        facing: unknown,
        y: number,
        dimension: Block['dimension']
    ): { x: number; y: number; z: number } | null {
        if (facing === 0) return {x: 0, y: 0, z: 0};
        if (facing === 1) {
            if (y + 1 >= dimension.heightRange.max) return null;
            return {x: 0, y: 2, z: 0};
        }
        if (facing === 2) return {x: 0, y: 1, z: 1};
        if (facing === 3) return {x: 0, y: 1, z: -1};
        if (facing === 4) return {x: 1, y: 1, z: 0};
        if (facing === 5) return {x: -1, y: 1, z: 0};
        return {x: 0, y: 1, z: 0};
    }

    private async handleMovingBlocks(
        dimension: Block['dimension'],
        x: number, y: number, z: number
    ): Promise<void> {
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
            if (target) this.startFalling(target);
        }
    }
}