import {TileEntityBlock} from "./TileEntityBlock";
import {
    Block,
    Entity,
    EntityComponentTypes,
    EntityOnFireComponent,
    EntityVariantComponent,
    MolangVariableMap,
    system,
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

export type BlockInput =
    "exnihilo:default"
    | "exnihilo:compost"
    | "exnihilo:dirt"
    | "exnihilo:gravel"
    | "exnihilo:clay"
    | "exnihilo:netherrack"
    | "exnihilo:end_stone"
    | "exnihilo:water"
    | "exnihilo:lava"
    | "exnihilo:witch_water"
    | "exnihilo:soul_sand"
    | "exnihilo:slime";

export const InputDefault: BlockInput = "exnihilo:default";
export const InputCompost: BlockInput = "exnihilo:compost";
export const InputDirt: BlockInput = "exnihilo:dirt";
export const InputGravel: BlockInput = "exnihilo:gravel";
export const InputClay: BlockInput = "exnihilo:clay";
export const InputNetherrack: BlockInput = "exnihilo:netherrack";
export const InputEndStone: BlockInput = "exnihilo:end_stone";
export const InputWater: BlockInput = "exnihilo:water";
export const InputLava: BlockInput = "exnihilo:lava";
export const InputWitchWater: BlockInput = "exnihilo:witch_water";
export const InputSoulSand: BlockInput = "exnihilo:soul_sand";
export const InputSlime: BlockInput = "exnihilo:slime";

export interface TileContext {
    tile: Entity | undefined;
    filling: number;
    input: BlockInput;
}

export abstract class FilledTileEntityBlock extends TileEntityBlock {
    protected constructor(tileId: string, variantStateMap: Record<number, BlockInput>) {
        super(tileId, variantStateMap);
    }

    /**
     * Public API: returns the current input type and filling percentage (0-100) for the given block.
     * Safe to call on any block, tiled or not — returns the "default"/empty state if there's no tile.
     */
    public getState(block: Block): TileContext {
        return this.getTileContext(block);
    }

    /**
     * Public API: sets the tile's input type and filling percentage (0-100) to an absolute value.
     * Mirrors the same animation as filling from a bucket: the tile is switched to the new
     * input immediately (spawning at 0 filling), then rises to the target filling one tick
     * later, instead of snapping straight to the final position.
     *
     * Passing `input: "exnihilo:default"` behaves like `empty()`.
     */
    public setState(block: Block, input: BlockInput, filling: number = 100): void {
        if (input === InputDefault) {
            this.empty(block);
            return;
        }

        const targetFilling = Math.max(0, Math.min(100, filling));

        this.setInputBlock(block, input);
        system.runTimeout(() => this.setFilling(block, targetFilling), 1);
    }

    /**
     * Public API: empties the tile entirely, resetting it back to the default/empty state.
     * Mirrors the bucket-drain animation: filling drops to 0 immediately, and the tile itself
     * is only removed (reverting the block to its default/empty state) a short delay later.
     */
    public empty(block: Block): void {
        const current = this.getTileContext(block);
        if (current.input === InputDefault) return;

        this.setFilling(block, 0);
        system.runTimeout(() => this.setInputBlock(block, InputDefault), 10);
    }

    protected abstract yResolver(filling: number): number;

    protected getInputBlock(block: Block): BlockInput {
        const tile = this.getTileEntity(block);
        if (!tile) return "exnihilo:default";
        const variant = tile.getComponent(EntityVariantComponent.componentId)?.value;
        return this.variantStateMap[variant ?? 0] as BlockInput;
    }

    protected setInputBlock(block: Block, input: BlockInput): void {
        if (block.isAir) return;

        const isLava = input === InputLava;
        const isDefault = input === InputDefault;

        if (block.permutation.getState('exnihilo:emit_light' as keyof BlockStateSuperset) !== undefined) {
            block.setPermutation(block.permutation.withState('exnihilo:emit_light' as keyof BlockStateSuperset, isLava));
        }

        let tile = this.getTileEntity(block);
        if (tile) {
            isDefault ? tile.remove() : tile.triggerEvent(input);
            return;
        }
        if (!isDefault) {
            tile = block.dimension.spawnEntity(
                this.tileId,
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

    protected handleWaterEntities(block: Block, ctx: TileContext): void {
        if (ctx.input !== InputWater) return;

        for (const entity of this.getContainedEntities(block)) {
            if (entity.getVelocity().y < 0) {
                block.dimension.playSound("random.splash", block.center());
                const molang = new MolangVariableMap();
                molang.setVector3("variable.direction", {x: 0, y: 1, z: 0});
                block.dimension.spawnParticle(
                    "minecraft:water_splash_particle",
                    {...block.bottomCenter(), y: block.y + 1.1},
                    molang
                );
            }
            this.tryExtinguishEntity(entity);
        }
    }

    protected tryExtinguishEntity(entity: Entity): void {
        const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
        if (!onFire || onFire.onFireTicksRemaining <= 0) return;

        entity.extinguishFire(true);
    }
}