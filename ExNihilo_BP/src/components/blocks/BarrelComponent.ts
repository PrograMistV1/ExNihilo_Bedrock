import {
    Block,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Container,
    CustomComponentParameters,
    Entity,
    EntityComponentTypes,
    EntityDamageCause,
    EntityOnFireComponent,
    ItemStack,
    MolangVariableMap,
    system,
    WeatherType
} from "@minecraft/server";
import {BARREL_CONFIG, BARREL_TIMINGS, CompostableItems, Results,} from "../../data/BarrelData";
import {consumeItem, getItemContext, getSelectedItemContext, ItemContext} from "../../utils/Utils";
import {addProgressChecker} from "../../utils/ProgressRegistry";
import {
    BlockInput,
    FilledTileEntityBlock,
    InputClay,
    InputCompost,
    InputDefault,
    InputDirt,
    InputEndStone,
    InputLava,
    InputNetherrack,
    InputWater,
    TileContext
} from "./tiles/FilledTileEntityBlock";

const EMPTY_BUCKET_ITEM = "minecraft:bucket";
const WATER_BUCKET_ITEM = "minecraft:water_bucket";
const LAVA_BUCKET_ITEM = "minecraft:lava_bucket";

export class BarrelComponent extends FilledTileEntityBlock implements BlockCustomComponent {
    static readonly TILE_ID: string = "exnihilo:barrel_tile";
    static readonly VARIANT_STATE_MAP: Record<number, BlockInput> = {
        0: "exnihilo:default",
        1: "exnihilo:compost",
        2: "exnihilo:dirt",
        3: "exnihilo:clay",
        4: "exnihilo:water",
        5: "exnihilo:lava",
        6: "exnihilo:netherrack",
        7: "exnihilo:end_stone",
    };

    constructor() {
        super(BarrelComponent.TILE_ID, BarrelComponent.VARIANT_STATE_MAP);
        addProgressChecker("exnihilo:barrel", (block: Block) => {
            const input = this.getInputBlock(block);
            const filling = this.getFilling(block);
            if (input === InputCompost && filling === 100) {
                return Math.floor(this.getTimer(block) / BARREL_TIMINGS.compostingUpdates * 100) + "%";
            } else if (input === InputDirt || input === InputClay || input === InputNetherrack) {
                return {translate: "gui.done"};
            } else {
                return parseFloat(filling.toFixed(1)).toString() + "/100"
            }
        });
    }

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent) => {
        const itemCtx = getSelectedItemContext(e.player);
        const tileCtx = this.getTileContext(e.block);

        if (this.tryExtractResult(e.block, tileCtx) || !itemCtx.item) return;
        if (this.tryCompost(e.block, itemCtx, tileCtx)) return;
        if (this.handleLiquid(e.block, itemCtx, tileCtx)) return;
        if (this.handleSpecialInteractions(e.block, itemCtx, tileCtx)) return;
    };

    onTick = (e: BlockComponentTickEvent, p: CustomComponentParameters) => {
        const ctx = this.getTileContext(e.block);
        this.handleWaterEntities(e.block, ctx);
        if (this.handleRainFill(e.block, ctx)) return;
        if (this.handleHoppers(e.block, ctx)) return;
        if (this.handleLava(e.block, ctx, (p.params["flammable"] as boolean) ?? false)) return;
        if (this.handleCompost(e.block, ctx)) return;
    }

    onPlayerBreak = (e: BlockComponentPlayerBreakEvent) => {
        this.tryExtractResult(e.block, this.getTileContext(e.block));
    };

    protected yResolver(filling: number): number {
        return 1 / 16 + filling / 100 * 0.875;
    }

    private handleRainFill(block: Block, ctx: TileContext): boolean {
        if ((ctx.input !== InputWater && ctx.input !== InputDefault)) return false;

        const isHighest = block.dimension.getTopmostBlock(block).y === block.y;
        if (isHighest && block.dimension.getWeather() !== WeatherType.Clear && ctx.filling < 100) {
            //todo: Rain is not found in all biomes, and only in the overworld.
            if (ctx.input === InputDefault) this.setInputBlock(block, InputWater);
            this.setFilling(block, ctx.filling + BARREL_TIMINGS.rainFillPerUpdate);
            return true;
        }
        return false;
    }

    private handleHoppers(block: Block, ctx: TileContext): boolean {
        const blockAbove = block.above();
        if (blockAbove.typeId === "minecraft:hopper" && !blockAbove.permutation.getState('toggle_bit')) {
            for (let slotId = 0; slotId < 5; slotId++) {
                const itemCtx = getItemContext(blockAbove, slotId);
                if (this.tryCompost(block, itemCtx, ctx)) return true;
                if (this.handleSpecialInteractions(block, itemCtx, ctx)) return true;
            }
        }
        const blockBelow = block.below();
        if (blockBelow.typeId === "minecraft:hopper" && !blockBelow.permutation.getState('toggle_bit')) {
            const hopperInventory = blockBelow.getComponent(EntityComponentTypes.Inventory).container;
            return this.tryExtractResult(block, ctx, hopperInventory);
        }
        return false;
    }

    private handleWaterEntities(block: Block, ctx: TileContext): void {
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

    private handleLava(block: Block, ctx: TileContext, flammable: boolean): boolean {
        if (ctx.input !== InputLava) return false;

        if (flammable && Math.random() <= BARREL_CONFIG.lavaIgniteChance) {
            const directions = [
                {x: 1, y: 0, z: 0},
                {x: 0, y: 0, z: 1},
                {x: -1, y: 0, z: 0},
                {x: 0, y: 0, z: -1}
            ];
            let ignited = false;
            for (const dir of directions) {
                const target = block.offset(dir);
                const below = target.below();

                if (target.isAir && !below.isAir) {
                    target.setType("minecraft:fire");
                    ignited = true;
                    break;
                }
            }
            if (!ignited) {
                this.setInputBlock(block, InputDefault);
                block.setType("minecraft:air");
            }
        }

        this.getContainedEntities(block).forEach(entity => {
            entity?.setOnFire(10);
            entity?.applyDamage(4, {cause: EntityDamageCause.lava});
        });
        return true;
    }

    private handleCompost(block: Block, ctx: TileContext): boolean {
        if (ctx.input !== InputCompost || ctx.filling !== 100) return false;

        if (this.incrementTimer(block) > BARREL_TIMINGS.compostingUpdates) {
            this.setInputBlock(block, InputDirt);
            this.resetTimer(block);
        }
        return true;
    }

    private tryCompost(block: Block, itemCtx: ItemContext, ctx: TileContext): boolean {
        const fillAmount = CompostableItems[itemCtx.item?.typeId];
        if (fillAmount === undefined) return false;

        if ((ctx.input !== InputDefault && ctx.input !== InputCompost) || ctx.filling === 100) return false;

        consumeItem(itemCtx);
        if (ctx.input === InputDefault) this.setInputBlock(block, InputCompost);
        this.setFilling(block, ctx.filling + fillAmount);
        block.dimension.playSound("block.composter.fill_success", block.center());
        return true;
    }

    private handleLiquid(block: Block, itemCtx: ItemContext, tileCtx: TileContext): boolean {
        const LIQUIDS = {
            [InputWater]: {bucket: WATER_BUCKET_ITEM, emptySound: "bucket.empty_water", fillSound: "bucket.fill_water"},
            [InputLava]: {bucket: LAVA_BUCKET_ITEM, emptySound: "bucket.empty_lava", fillSound: "bucket.fill_lava"},
        } as const;

        const itemId = itemCtx.item.typeId;

        if (itemId === EMPTY_BUCKET_ITEM) {
            const liquid = LIQUIDS[tileCtx.input as keyof typeof LIQUIDS];
            if (liquid && tileCtx.filling === 100) {
                this.drainBarrelToBucket(block, itemCtx, liquid.bucket, liquid.fillSound);
                return true;
            }
        }

        for (const [liquidType, liquid] of Object.entries(LIQUIDS)) {
            if (itemId !== liquid.bucket) continue;
            if (tileCtx.input !== InputDefault && tileCtx.input !== liquidType) continue;
            if (tileCtx.input === liquidType && tileCtx.filling === 0) return false; //This is necessary for the correct animation of emptying

            this.fillBarrelFromBucket(block, itemCtx, liquidType as BlockInput, liquid.emptySound);
            return true;
        }
        return false;
    }

    private tryExtractResult(block: Block, tileCtx: TileContext, toContainer: Container | null = null): boolean {
        const result = Results[tileCtx.input];
        if (!result) return false;

        const resultItem = new ItemStack(result);
        if (toContainer && toContainer.addItem(resultItem)) {
            return false;
        } else if (!toContainer) {
            block.dimension
                .spawnItem(resultItem, {...block.bottomCenter(), y: block.y + 1.1})
                .applyImpulse({x: Math.random() * 0.03, y: 0.03, z: Math.random() * 0.03});
        }

        this.setInputBlock(block, InputDefault);
        return true;
    }

    private handleSpecialInteractions(block: Block, itemCtx: ItemContext, ctx: TileContext): boolean {
        if (!itemCtx.item) return false;

        if (ctx.input === InputWater && ctx.filling === 100 && itemCtx.item.typeId === "exnihilo:dust") {
            consumeItem(itemCtx);
            this.setInputBlock(block, InputClay);
            block.dimension.playSound("dig.gravel", block.center());
            return true;
        }
        if (ctx.input === InputLava && ctx.filling === 100 && itemCtx.item.typeId === "minecraft:redstone") {
            consumeItem(itemCtx);
            this.setInputBlock(block, InputNetherrack);
            block.dimension.playSound("dig.netherrack", block.center());
            return true;
        }
        if (ctx.input === InputLava && ctx.filling === 100 && itemCtx.item.typeId === "minecraft:glowstone_dust") {
            consumeItem(itemCtx);
            this.setInputBlock(block, InputEndStone);
            block.dimension.playSound("dig.stone", block.center());
            return true;
        }
        return false;
    }

    private fillBarrelFromBucket(
        block: Block,
        selectedItem: ItemContext,
        type: BlockInput,
        soundId: string
    ): void {
        this.setInputBlock(block, type);
        system.runTimeout(() => this.setFilling(block, 100), 1);
        selectedItem.container.setItem(selectedItem.slot, new ItemStack(EMPTY_BUCKET_ITEM, 1));
        block.dimension.playSound(soundId, block.center());
    }

    private drainBarrelToBucket(
        block: Block,
        itemCtx: ItemContext,
        filledBucketItemId: string,
        soundId: string
    ): void {
        this.setFilling(block, 0);
        system.runTimeout(() => this.setInputBlock(block, InputDefault), 10);
        if (itemCtx.item.amount === 1) {
            itemCtx.container.setItem(itemCtx.slot, new ItemStack(filledBucketItemId, 1));
        } else {
            consumeItem(itemCtx);
            if (itemCtx.container.emptySlotsCount > 0) {
                itemCtx.container.addItem(new ItemStack(filledBucketItemId, 1));
            } else {
                itemCtx.source.dimension.spawnItem(new ItemStack(filledBucketItemId, 1), itemCtx.source.location);
                itemCtx.source.dimension.playSound("random.pop", itemCtx.source.location);
            }
        }
        block.dimension.playSound(soundId, block.center());
    }

    private tryExtinguishEntity(entity: Entity): void {
        const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
        if (!onFire || onFire.onFireTicksRemaining <= 0) return;

        entity.extinguishFire(true);
    }
}