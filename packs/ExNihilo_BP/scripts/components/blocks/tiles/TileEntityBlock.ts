import {Block, Entity} from "@minecraft/server";

export abstract class TileEntityBlock {
    protected constructor(
        protected readonly tileId: string,
        protected readonly variantStateMap: Record<number, string>
    ) {
    }

    protected getTileEntity(block: Block): Entity | undefined {
        const entities = block.dimension.getEntities({
            type: this.tileId,
            location: block.center(),
            closest: 1,
            maxDistance: 0.5
        });
        if (entities.length === 0) return undefined;
        return entities[0];
    }
}