import {
    Block,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    CustomComponentParameters,
    Entity,
    EntityComponentTypes,
    EntityDamageCause,
    EntityOnFireComponent,
    ItemStack,
    MolangVariableMap,
    Player,
    system,
    WeatherType
} from "@minecraft/server";
import {BARREL_CONFIG, BARREL_TIMINGS, CompostableItems, DROP_FROM_INPUT_MAP,} from "../../data/BarrelData";
import {consumeSelectedItem, getSelectedItemContext, SelectedItemContext} from "../../utils/Utils";
import {addProgressChecker} from "../../utils/ProgressRegistry";
import {
    BlockInput,
    FilledTileEntityBlock,
    InputClay,
    InputCompost,
    InputDefault,
    InputDirt,
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
        6: "exnihilo:netherrack"
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
        const ctx = this.getTileContext(e.block);
        this.handleCompostable(e.block, e.player, ctx);
        this.handleLiquid(e.block, e.player, ctx);
        this.handleExtractResult(e.block, ctx);
        this.handleSpecialInteractions(e.block, e.player, ctx);
    };

    onTick = (e: BlockComponentTickEvent, p: CustomComponentParameters) => {
        const ctx = this.getTileContext(e.block);
        this.handleRainFill(e.block, ctx);
        this.handleWaterEntities(e.block, ctx);
        this.handleLava(e.block, ctx, (p.params["flammable"] as boolean) ?? false);
        this.handleCompost(e.block, ctx);
    }

    onPlayerBreak = (e: BlockComponentPlayerBreakEvent) => {
        const drop = DROP_FROM_INPUT_MAP[this.getInputBlock(e.block)];
        if (!drop) return;

        e.block.dimension.spawnItem(new ItemStack(drop), e.block.center());
    };

    protected yResolver(filling: number): number {
        return 1 / 16 + filling / 100 * 0.875;
    }

    private handleRainFill(block: Block, ctx: TileContext): void {
        if ((ctx.input !== InputWater && ctx.input !== InputDefault) || ctx.filling >= 100) return;

        const isHighest = block.dimension.getTopmostBlock(block).y === block.y;
        if (isHighest && block.dimension.getWeather() !== WeatherType.Clear) {
            //todo: Rain is not found in all biomes, and only in the overworld.
            if (ctx.input === InputDefault) this.setInputBlock(block, InputWater);
            this.setFilling(block, ctx.filling + BARREL_TIMINGS.rainFillPerUpdate);
        }
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

    private handleLava(block: Block, ctx: TileContext, flammable: boolean): void {
        if (ctx.input !== InputLava) return;

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
    }

    private handleCompost(block: Block, ctx: TileContext): void {
        if (ctx.input !== InputCompost || ctx.filling !== 100) return;

        if (this.incrementTimer(block) > BARREL_TIMINGS.compostingUpdates) {
            this.setInputBlock(block, InputDirt);
            this.resetTimer(block);
        }
    }

    private handleCompostable(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item) return;

        const fillAmount = CompostableItems[selectedItem.item.typeId];
        if (fillAmount === undefined) return;

        if ((ctx.input !== InputDefault && ctx.input !== InputCompost) || ctx.filling === 100) return;

        consumeSelectedItem(selectedItem);
        if (ctx.input === InputDefault) this.setInputBlock(block, InputCompost);
        this.setFilling(block, ctx.filling + fillAmount);
        block.dimension.playSound("block.composter.fill_success", block.center());
    }

    private handleLiquid(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item) return;

        const LIQUIDS = {
            [InputWater]: {
                bucket: WATER_BUCKET_ITEM,
                emptySound: "bucket.empty_water",
                fillSound: "bucket.fill_water",
            },
            [InputLava]: {
                bucket: LAVA_BUCKET_ITEM,
                emptySound: "bucket.empty_lava",
                fillSound: "bucket.fill_lava",
            }
        } as const;

        const itemId = selectedItem.item.typeId;
        for (const liquidType of Object.keys(LIQUIDS) as BlockInput[]) {
            const liquid = LIQUIDS[liquidType];

            if (itemId === liquid.bucket && (ctx.input === InputDefault || ctx.input === liquidType)) {
                if (ctx.input === liquidType && ctx.filling === 0) return;
                this.fillBarrelFromBucket(block, selectedItem, liquidType, liquid.emptySound);
                return;
            }

            if (itemId === EMPTY_BUCKET_ITEM && ctx.filling === 100 && ctx.input === liquidType) {
                this.drainBarrelToBucket(block, selectedItem, liquid.bucket, liquid.fillSound, player);
                return;
            }
        }
    }

    private handleExtractResult(block: Block, ctx: TileContext): void {
        const drop = DROP_FROM_INPUT_MAP[ctx.input];
        if (!drop) return;

        const entity = block.dimension.spawnItem(new ItemStack(drop), {...block.bottomCenter(), y: block.y + 1.1});
        entity.applyImpulse({
            x: Math.random() * 0.03,
            y: 0.03,
            z: Math.random() * 0.03
        });

        this.setInputBlock(block, InputDefault);
    }

    private handleSpecialInteractions(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item) return;

        if (ctx.input === InputWater && ctx.filling === 100 && selectedItem.item.typeId === "exnihilo:dust") {
            consumeSelectedItem(selectedItem);
            this.setInputBlock(block, InputClay);
            block.dimension.playSound("dig.gravel", block.center());
            return;
        }
        if (ctx.input === InputLava && ctx.filling === 100 && selectedItem.item.typeId === "minecraft:redstone") {
            consumeSelectedItem(selectedItem);
            this.setInputBlock(block, InputNetherrack);
            block.dimension.playSound("dig.netherrack", block.center());
            return;
        }
    }

    private fillBarrelFromBucket(
        block: Block,
        selectedItem: SelectedItemContext,
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
        selectedItem: SelectedItemContext,
        filledBucketItemId: string,
        soundId: string,
        player: Player
    ): void {
        this.setFilling(block, 0);
        system.runTimeout(() => this.setInputBlock(block, InputDefault), 10);
        if (selectedItem.item.amount === 1) {
            selectedItem.container.setItem(selectedItem.slot, new ItemStack(filledBucketItemId, 1));
        } else {
            consumeSelectedItem(selectedItem);
            if (selectedItem.container.emptySlotsCount > 0) {
                selectedItem.container.addItem(new ItemStack(filledBucketItemId, 1));
            } else {
                player.dimension.spawnItem(new ItemStack(filledBucketItemId, 1), player.location);
                player.dimension.playSound("random.pop", player.location);
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