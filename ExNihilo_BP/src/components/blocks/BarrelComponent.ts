import {
    Block,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    CustomComponentParameters,
    Entity,
    EntityComponentTypes,
    EntityOnFireComponent,
    EntityVariantComponent,
    ItemStack,
    MolangVariableMap,
    Player,
    system,
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
    NonEmptyLiquidBarrelType,
    VARIANT_STATE_MAP
} from "../../data/BarrelData";
import {
    applyLavaEffects,
    consumeSelectedItem,
    getSelectedItemContext,
    getTileEntity,
    SelectedItemContext
} from "../../Utils";
import {BARREL_TILE_ID} from "../../data/TileList";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {addProgressChecker} from "../../ProgressRegistry";


const EMPTY_BUCKET_ITEM = "minecraft:bucket";
const WATER_BUCKET_ITEM = "minecraft:water_bucket";
const LAVA_BUCKET_ITEM = "minecraft:lava_bucket";

export class BarrelComponent implements BlockCustomComponent {
    constructor() {
        addProgressChecker("exnihilo:barrel", (block: Block) => {
            const input = getInputBlock(block);
            if (isProgressive(block)) {
                return getProgressInPercents(block) + "%";
            } else if (input === InputDirt || input === InputClay || input === InputNetherrack) {
                return {translate: "gui.done"};
            } else {
                return parseFloat(getFilling(block).toFixed(1)).toString() + "/100"
            }
        });
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent) {
        handleCompostable(e.block, e.player);
        handleLiquid(e.block, e.player);
        handleExtractResult(e.block);
        handleSpecialInteractions(e.block, e.player);
    }

    onTick(e: BlockComponentTickEvent, p: CustomComponentParameters): void {
        handleRainFill(e.block);
        handleWaterEntities(e.block);
        handleLava(e.block, (p.params["flammable"] as boolean) ?? false);
        handleCompost(e.block);
    }

    onPlayerBreak(e: BlockComponentPlayerBreakEvent): void {
        const drop = DROP_FROM_INPUT_MAP[getInputBlock(e.block)];
        if (!drop) return;

        e.block.dimension.spawnItem(new ItemStack(drop), e.block.center());
    }
}

function getProgressInPercents(block: Block): number {
    return Math.floor(getTimer(block) / BARREL_TIMINGS.compostingUpdates * 100);
}

function isProgressive(block: Block): boolean {
    return getInputBlock(block) === InputCompost && getFilling(block) === 100;
}

function handleRainFill(block: Block): void {
    const filling = getFilling(block);
    const input = getInputBlock(block);
    if ((input !== InputWater && input !== InputDefault) || filling >= 100) return;

    const isHighest = block.dimension.getTopmostBlock(block).y === block.y;
    if (isHighest && block.dimension.getWeather() !== WeatherType.Clear) {
        //todo: Rain is not found in all biomes, and only in the overworld.
        if (input === InputDefault) setInputBlock(block, InputWater);
        setFilling(block, filling + BARREL_TIMINGS.rainFillPerUpdate);
    }
}

function handleWaterEntities(block: Block): void {
    if (getInputBlock(block) !== InputWater) return;

    for (const entity of getContainedEntities(block)) {
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
        tryExtinguishEntity(entity);
    }
}

function handleLava(block: Block, flammable: boolean): void {
    if (getInputBlock(block) !== InputLava) return;

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
            const below = block.offset({x: dir.x, y: -1, z: dir.z});

            if (target.isAir && !below.isAir) {
                target.setType("minecraft:fire");
                ignited = true;
                break;
            }
        }
        if (!ignited) {
            setInputBlock(block, InputDefault);
            block.setType("minecraft:air");
        }
    }

    for (const entity of getContainedEntities(block)) {
        applyLavaEffects(entity);
    }
}

function handleCompost(block: Block): void {
    if (getInputBlock(block) !== InputCompost || getFilling(block) !== 100) return;

    if (incrementTimer(block) > BARREL_TIMINGS.compostingUpdates) {
        setInputBlock(block, InputDirt);
        resetTimer(block);
    }
}

function handleCompostable(block: Block, player: Player): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem.item) return;

    const fillAmount = CompostableItems[selectedItem.item.typeId];
    if (fillAmount === undefined) return;

    const filling = getFilling(block);
    const input = getInputBlock(block);
    if ((input !== InputDefault && input !== InputCompost) || filling === 100) return;

    consumeSelectedItem(selectedItem);
    if (input === InputDefault) setInputBlock(block, InputCompost);
    setFilling(block, filling + fillAmount);
    block.dimension.playSound("block.composter.fill_success", block.center());
}

function handleLiquid(block: Block, player: Player): void {
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

    const filling = getFilling(block);
    const input = getInputBlock(block);
    const itemId = selectedItem.item.typeId;
    for (const liquidType of Object.keys(LIQUIDS) as NonEmptyLiquidBarrelType[]) {
        const liquid = LIQUIDS[liquidType];

        if (itemId === liquid.bucket && (input === InputDefault || input === liquidType)) {
            if (input === liquidType && filling === 0) return;
            fillBarrelFromBucket(block, selectedItem, liquidType, liquid.emptySound);
            return;
        }

        if (itemId === EMPTY_BUCKET_ITEM && filling === 100 && input === liquidType) {
            drainBarrelToBucket(block, selectedItem, liquid.bucket, liquid.fillSound, player);
            return;
        }
    }
}

function handleExtractResult(block: Block): void {
    const drop = DROP_FROM_INPUT_MAP[getInputBlock(block)];
    if (!drop) return;

    const entity = block.dimension.spawnItem(new ItemStack(drop), {...block.bottomCenter(), y: block.y + 1.1});
    entity.applyImpulse({
        x: Math.random() * 0.03,
        y: 0.03,
        z: Math.random() * 0.03
    });

    setInputBlock(block, InputDefault);
}

function handleSpecialInteractions(block: Block, player: Player): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem.item) return;

    const filling = getFilling(block);
    const input = getInputBlock(block);
    if (input === InputWater && filling === 100 && selectedItem.item.typeId === "exnihilo:dust") {
        consumeSelectedItem(selectedItem);
        setInputBlock(block, InputClay);
        block.dimension.playSound("dig.gravel", block.center());
        return;
    }
    if (input === InputLava && filling === 100 && selectedItem.item.typeId === "minecraft:redstone") {
        consumeSelectedItem(selectedItem);
        setInputBlock(block, InputNetherrack);
        block.dimension.playSound("dig.netherrack", block.center());
        return;
    }
}

function getInputBlock(barrel: Block): BarrelInput {
    const tile = getTileEntity(barrel, BARREL_TILE_ID);
    if (!tile) return InputDefault;

    return VARIANT_STATE_MAP[tile.getComponent(EntityVariantComponent.componentId).value];
}

function setInputBlock(block: Block, input: BarrelInput): void {
    const isLava = input === InputLava;
    const isDefault = input === InputDefault;

    block.setPermutation(block.permutation.withState('exnihilo:emit_light' as keyof BlockStateSuperset, isLava));

    let tile = getTileEntity(block, BARREL_TILE_ID);
    if (tile) {
        isDefault ? tile.remove() : tile.triggerEvent(input);
        return;
    }
    if (!isDefault) {
        tile = block.dimension.spawnEntity(
            BARREL_TILE_ID,
            {...block.bottomCenter(), y: block.y + 1 / 16},
            {spawnEvent: input}
        );
        tile.setDynamicProperty("filling", 0);
        tile.setDynamicProperty("timer", 0);
    }
}

function getFilling(barrel: Block): number {
    const tile = getTileEntity(barrel, BARREL_TILE_ID);
    if (!tile) return 0;

    return tile.getDynamicProperty("filling") as number ?? 0;
}

function setFilling(barrel: Block, filling: number): void {
    const tile = getTileEntity(barrel, BARREL_TILE_ID);
    if (!tile) return;

    filling = Math.max(Math.min(filling, 100), 0);
    tile.teleport({...barrel.bottomCenter(), y: barrel.y + 1 / 16 + filling / 100 * 0.875});
    tile.setDynamicProperty("filling", filling);
}

function incrementTimer(block: Block): number {
    const tile = getTileEntity(block, BARREL_TILE_ID);
    if (!tile) return;

    const currTime = tile.getDynamicProperty("timer") as number;
    const newTime = currTime + 1;
    tile.setDynamicProperty("timer", newTime);
    return newTime;
}

function resetTimer(block: Block): void {
    const tile = getTileEntity(block, BARREL_TILE_ID);
    if (!tile) return;

    tile.setDynamicProperty("timer", 0);
}

function getTimer(block: Block): number {
    const tile = getTileEntity(block, BARREL_TILE_ID);
    if (!tile) return;

    return tile.getDynamicProperty("timer") as number;
}

function fillBarrelFromBucket(
    block: Block,
    selectedItem: SelectedItemContext,
    type: NonEmptyLiquidBarrelType,
    soundId: string
): void {
    setInputBlock(block, type);
    system.runTimeout(() => setFilling(block, 100), 1);
    selectedItem.container.setItem(selectedItem.slot, new ItemStack(EMPTY_BUCKET_ITEM, 1));
    block.dimension.playSound(soundId, block.center());
}

function drainBarrelToBucket(
    block: Block,
    selectedItem: SelectedItemContext,
    filledBucketItemId: string,
    soundId: string,
    player: Player
): void {
    setFilling(block, 0);
    system.runTimeout(() => setInputBlock(block, InputDefault), 10);
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

function getContainedEntities(block: Block): Entity[] {
    return block.dimension.getEntities({
        excludeTypes: [BARREL_TILE_ID],
        location: block.center(),
        maxDistance: 0.47,
    });
}

function tryExtinguishEntity(entity: Entity): void {
    const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
    if (!onFire || onFire.onFireTicksRemaining <= 0) return;

    entity.extinguishFire(true);
}
