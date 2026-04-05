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
    VanillaEntityIdentifier,
    WeatherType
} from "@minecraft/server";
import {
    BARREL_CONFIG,
    BARREL_TIMINGS,
    BarrelInput,
    CompostableItems,
    DROP_FROM_INPUT_MAP,
    InputClay,
    InputCompost,
    InputDefault,
    InputDirt,
    InputLava,
    InputNetherrack,
    InputWater,
    NonEmptyLiquidBarrelType
} from "../../data/BarrelData";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity, SelectedItemContext} from "../../utils/Utils";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {addProgressChecker} from "../../utils/ProgressRegistry";
import {TileEntityBlock} from "../../utils/TileEntityBlock";


const EMPTY_BUCKET_ITEM = "minecraft:bucket";
const WATER_BUCKET_ITEM = "minecraft:water_bucket";
const LAVA_BUCKET_ITEM = "minecraft:lava_bucket";

export class BarrelComponent extends TileEntityBlock implements BlockCustomComponent {
    static readonly TILE_ID: string = "exnihilo:barrel_tile";
    static readonly VARIANT_STATE_MAP = {
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
            if (this.getInputBlock(block) === InputCompost && filling === 100) {
                return Math.floor(this.getTimer(block) / BARREL_TIMINGS.compostingUpdates * 100) + "%";
            } else if (input === InputDirt || input === InputClay || input === InputNetherrack) {
                return {translate: "gui.done"};
            } else {
                return parseFloat(filling.toFixed(1)).toString() + "/100"
            }
        });
    }

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent) => {
        this.handleCompostable(e.block, e.player);
        this.handleLiquid(e.block, e.player);
        this.handleExtractResult(e.block);
        this.handleSpecialInteractions(e.block, e.player);
    };

    onTick = (e: BlockComponentTickEvent, p: CustomComponentParameters) => {
        this.handleRainFill(e.block);
        this.handleWaterEntities(e.block);
        this.handleLava(e.block, (p.params["flammable"] as boolean) ?? false);
        this.handleCompost(e.block);
    }

    onPlayerBreak = (e: BlockComponentPlayerBreakEvent) => {
        const drop = DROP_FROM_INPUT_MAP[this.getInputBlock(e.block)];
        if (!drop) return;

        e.block.dimension.spawnItem(new ItemStack(drop), e.block.center());
    };

    private yResolver(filling: number): number {
        return 1 / 16 + filling / 100 * 0.875;
    }

    private handleRainFill(block: Block): void {
        const filling = this.getFilling(block);
        const input = this.getInputBlock(block);
        if ((input !== InputWater && input !== InputDefault) || filling >= 100) return;

        const isHighest = block.dimension.getTopmostBlock(block).y === block.y;
        if (isHighest && block.dimension.getWeather() !== WeatherType.Clear) {
            //todo: Rain is not found in all biomes, and only in the overworld.
            if (input === InputDefault) this.setInputBlock(block, InputWater);
            this.setFilling(block, filling + BARREL_TIMINGS.rainFillPerUpdate, this.yResolver);
        }
    }

    private handleWaterEntities(block: Block): void {
        if (this.getInputBlock(block) !== InputWater) return;

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

    private handleLava(block: Block, flammable: boolean): void {
        if (this.getInputBlock(block) !== InputLava) return;

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

    private handleCompost(block: Block): void {
        if (this.getInputBlock(block) !== InputCompost || this.getFilling(block) !== 100) return;

        if (this.incrementTimer(block) > BARREL_TIMINGS.compostingUpdates) {
            this.setInputBlock(block, InputDirt);
            this.resetTimer(block);
        }
    }

    private handleCompostable(block: Block, player: Player): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item) return;

        const fillAmount = CompostableItems[selectedItem.item.typeId];
        if (fillAmount === undefined) return;

        const filling = this.getFilling(block);
        const input = this.getInputBlock(block);
        if ((input !== InputDefault && input !== InputCompost) || filling === 100) return;

        consumeSelectedItem(selectedItem);
        if (input === InputDefault) this.setInputBlock(block, InputCompost);
        this.setFilling(block, filling + fillAmount, this.yResolver);
        block.dimension.playSound("block.composter.fill_success", block.center());
    }

    private handleLiquid(block: Block, player: Player): void {
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

        const filling = this.getFilling(block);
        const input = this.getInputBlock(block);
        const itemId = selectedItem.item.typeId;
        for (const liquidType of Object.keys(LIQUIDS) as NonEmptyLiquidBarrelType[]) {
            const liquid = LIQUIDS[liquidType];

            if (itemId === liquid.bucket && (input === InputDefault || input === liquidType)) {
                if (input === liquidType && filling === 0) return;
                this.fillBarrelFromBucket(block, selectedItem, liquidType, liquid.emptySound);
                return;
            }

            if (itemId === EMPTY_BUCKET_ITEM && filling === 100 && input === liquidType) {
                this.drainBarrelToBucket(block, selectedItem, liquid.bucket, liquid.fillSound, player);
                return;
            }
        }
    }

    private handleExtractResult(block: Block): void {
        const drop = DROP_FROM_INPUT_MAP[this.getInputBlock(block)];
        if (!drop) return;

        const entity = block.dimension.spawnItem(new ItemStack(drop), {...block.bottomCenter(), y: block.y + 1.1});
        entity.applyImpulse({
            x: Math.random() * 0.03,
            y: 0.03,
            z: Math.random() * 0.03
        });

        this.setInputBlock(block, InputDefault);
    }

    private handleSpecialInteractions(block: Block, player: Player): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item) return;

        const filling = this.getFilling(block);
        const input = this.getInputBlock(block);
        if (input === InputWater && filling === 100 && selectedItem.item.typeId === "exnihilo:dust") {
            consumeSelectedItem(selectedItem);
            this.setInputBlock(block, InputClay);
            block.dimension.playSound("dig.gravel", block.center());
            return;
        }
        if (input === InputLava && filling === 100 && selectedItem.item.typeId === "minecraft:redstone") {
            consumeSelectedItem(selectedItem);
            this.setInputBlock(block, InputNetherrack);
            block.dimension.playSound("dig.netherrack", block.center());
            return;
        }
    }

    private setInputBlock(block: Block, input: BarrelInput): void {
        const isLava = input === InputLava;
        const isDefault = input === InputDefault;

        block.setPermutation(block.permutation.withState('exnihilo:emit_light' as keyof BlockStateSuperset, isLava));

        let tile = getTileEntity(block, this.tileId);
        if (tile) {
            isDefault ? tile.remove() : tile.triggerEvent(input);
            return;
        }
        if (!isDefault) {
            tile = block.dimension.spawnEntity(
                this.tileId as keyof VanillaEntityIdentifier,
                {...block.bottomCenter(), y: block.y + 1 / 16},
                {spawnEvent: input}
            );
            tile.setDynamicProperty("filling", 0);
            tile.setDynamicProperty("timer", 0);
        }
    }

    private fillBarrelFromBucket(
        block: Block,
        selectedItem: SelectedItemContext,
        type: NonEmptyLiquidBarrelType,
        soundId: string
    ): void {
        this.setInputBlock(block, type);
        system.runTimeout(() => this.setFilling(block, 100, this.yResolver), 1);
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
        this.setFilling(block, 0, this.yResolver);
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

    private getContainedEntities(block: Block): Entity[] {
        return block.dimension.getEntities({
            excludeTypes: [this.tileId],
            location: block.center(),
            maxDistance: 0.47,
        });
    }

    private tryExtinguishEntity(entity: Entity): void {
        const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
        if (!onFire || onFire.onFireTicksRemaining <= 0) return;

        entity.extinguishFire(true);
    }
}