import {Block, Entity, EntityVariantComponent} from "@minecraft/server";
import {getTileEntity} from "./Utils";

export abstract class TileEntityBlock {
    protected constructor(
        protected readonly tileId: string,
        protected readonly variantStateMap: Record<number, string>
    ) {
    }

    protected getInputBlock(block: Block): string {
        const tile = getTileEntity(block, this.tileId);
        if (!tile) return "exnihilo:default";
        return this.variantStateMap[tile.getComponent(EntityVariantComponent.componentId).value];
    }

    protected getFilling(block: Block): number {
        const tile = getTileEntity(block, this.tileId);
        return tile ? (tile.getDynamicProperty("filling") as number ?? 0) : 0;
    }

    protected setFilling(block: Block, filling: number, yResolver: (filling: number) => number): void {
        const tile = getTileEntity(block, this.tileId);
        if (!tile) return;
        filling = Math.max(0, Math.min(100, filling));
        tile.teleport({...tile.location, y: block.y + yResolver(filling)});
        tile.setDynamicProperty("filling", filling);
    }

    protected getTimer(block: Block): number {
        return (getTileEntity(block, this.tileId)?.getDynamicProperty("timer") as number) ?? 0;
    }

    protected incrementTimer(block: Block, amount = 1): number {
        const tile = getTileEntity(block, this.tileId);
        if (!tile) return 0;
        const newTime = (tile.getDynamicProperty("timer") as number) + amount;
        tile.setDynamicProperty("timer", newTime);
        return newTime;
    }

    protected resetTimer(block: Block): void {
        getTileEntity(block, this.tileId)?.setDynamicProperty("timer", 0);
    }

    protected getContainedEntities(block: Block): Entity[] {
        return block.dimension.getEntities({
            excludeTypes: [this.tileId],
            location: block.center(),
            maxDistance: 0.47,
        });
    }
}