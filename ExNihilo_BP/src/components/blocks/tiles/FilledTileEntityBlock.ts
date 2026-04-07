import {TileEntityBlock} from "./TileEntityBlock";
import {Block, Entity, EntityVariantComponent, VanillaEntityIdentifier} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

export type BlockInput =
    "exnihilo:default"
    | "exnihilo:compost"
    | "exnihilo:dirt"
    | "exnihilo:gravel"
    | "exnihilo:clay"
    | "exnihilo:netherrack"
    | "exnihilo:water"
    | "exnihilo:lava"
    | "exnihilo:witch_water";

export const InputDefault: BlockInput = "exnihilo:default";
export const InputCompost: BlockInput = "exnihilo:compost";
export const InputDirt: BlockInput = "exnihilo:dirt";
export const InputGravel: BlockInput = "exnihilo:gravel";
export const InputClay: BlockInput = "exnihilo:clay";
export const InputNetherrack: BlockInput = "exnihilo:netherrack";
export const InputWater: BlockInput = "exnihilo:water";
export const InputLava: BlockInput = "exnihilo:lava";
export const InputWitchWater: BlockInput = "exnihilo:witch_water";

export interface TileContext {
    tile: Entity | undefined;
    filling: number;
    input: BlockInput;
}

export abstract class FilledTileEntityBlock extends TileEntityBlock {
    protected constructor(tileId: string, variantStateMap: Record<number, BlockInput>) {
        super(tileId, variantStateMap);
    }

    protected abstract yResolver(filling: number): number;

    protected getInputBlock(block: Block): BlockInput {
        const tile = this.getTileEntity(block);
        if (!tile) return "exnihilo:default";
        return this.variantStateMap[tile.getComponent(EntityVariantComponent.componentId).value] as BlockInput;
    }

    protected setInputBlock(block: Block, input: BlockInput): void {
        if (block.isAir) return;

        const isLava = input === InputLava;
        const isDefault = input === InputDefault;

        block.setPermutation(block.permutation.withState('exnihilo:emit_light' as keyof BlockStateSuperset, isLava));

        let tile = this.getTileEntity(block);
        if (tile) {
            isDefault ? tile.remove() : tile.triggerEvent(input);
            return;
        }
        if (!isDefault) {
            tile = block.dimension.spawnEntity(
                this.tileId as keyof VanillaEntityIdentifier,
                {...block.bottomCenter(), y: block.y + this.yResolver(0)},
                {spawnEvent: input}
            );
            tile.setDynamicProperty("filling", 0);
            tile.setDynamicProperty("timer", 0);
        }
    }

    protected getFilling(block: Block): number {
        const tile = this.getTileEntity(block);
        return tile ? (tile.getDynamicProperty("filling") as number ?? 0) : 0;
    }

    protected setFilling(block: Block, filling: number): void {
        const tile = this.getTileEntity(block);
        if (!tile) return;
        filling = Math.max(0, Math.min(100, filling));
        tile.teleport({...tile.location, y: block.y + this.yResolver(filling)});
        tile.setDynamicProperty("filling", filling);
    }

    protected getTimer(block: Block): number {
        return (this.getTileEntity(block)?.getDynamicProperty("timer") as number) ?? 0;
    }

    protected incrementTimer(block: Block, amount = 1): number {
        const tile = this.getTileEntity(block);
        if (!tile) return 0;
        const newTime = (tile.getDynamicProperty("timer") as number) + amount;
        tile.setDynamicProperty("timer", newTime);
        return newTime;
    }

    protected resetTimer(block: Block): void {
        this.getTileEntity(block)?.setDynamicProperty("timer", 0);
    }

    protected getContainedEntities(block: Block): Entity[] {
        return block.dimension.getEntities({
            excludeTypes: [this.tileId],
            location: block.center(),
            maxDistance: 0.47,
        });
    }

    protected getTileContext(block: Block): TileContext {
        const tile = this.getTileEntity(block);

        return {
            tile,
            filling: this.getFilling(block),
            input: this.getInputBlock(block)
        };
    }
}