import {
    Block,
    BlockComponentBlockBreakEvent,
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
    VanillaEntityIdentifier,
    WeatherType
} from "@minecraft/server";
import {
    BARREL_CONSTANTS,
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
    onBreak(e: BlockComponentBlockBreakEvent): void {
        getTileEntity(e.block, BARREL_TILE_ID)?.remove();
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

        e.block.dimension.spawnItem(new ItemStack(drop), {x: e.block.x + 0.5, y: e.block.y + 0.5, z: e.block.z + 0.5});
    }
}

addProgressChecker("exnihilo:barrel", (block: Block) => {
    if (isProgressive(block)) {
        return getProgressInPercents(block) + "%";
    } else {
        return parseFloat(getFilling(block).toFixed(1)).toString() + "/100"
    }
});

function getProgressInPercents(block: Block): number {
    return Math.floor(getTimer(block) / BARREL_CONSTANTS.COMPOSTING_TIME_TICKS * 100);
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
        setFilling(block, filling + BARREL_CONSTANTS.RAIN_FILL_PER_TICK);
    }
}

function handleWaterEntities(block: Block): void {
    if (getInputBlock(block) !== InputWater) return;

    for (const entity of getContainedEntities(block)) {
        if (entity.getVelocity().y < 0) {
            block.dimension.playSound("random.splash", {x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5});
            const molang = new MolangVariableMap();
            molang.setVector3("variable.direction", {x: 0, y: 1, z: 0});
            block.dimension.spawnParticle("minecraft:water_splash_particle", {
                x: block.x + 0.5,
                y: block.y + 1.1,
                z: block.z + 0.5
            }, molang);
        }
        tryExtinguishEntity(entity);
    }
}

function handleLava(block: Block, flammable: boolean): void {
    if (getInputBlock(block) !== InputLava) return;

    if (flammable && Math.random() <= BARREL_CONSTANTS.LAVA_IGNITE_CHANCE_PER_TICK) {
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

    if (incrementTimer(block) > BARREL_CONSTANTS.COMPOSTING_TIME_TICKS) {
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

    const entity = block.dimension.spawnItem(
        new ItemStack(drop),
        {
            x: block.x + 0.5,
            y: block.y + 1.1,
            z: block.z + 0.5
        }
    );
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

    const tile = getTileEntity(block, BARREL_TILE_ID);
    if (tile) {
        isDefault ? tile.remove() : tile.triggerEvent(input);
        return;
    }
    if (!isDefault) {
        const newTile = block.dimension.spawnEntity(
            BARREL_TILE_ID as keyof VanillaEntityIdentifier,
            {
                x: block.x + 0.5,
                y: block.y + BARREL_CONSTANTS.HEIGHT_OFFSET,
                z: block.z + 0.5
            },
            {spawnEvent: input}
        );
        newTile.setDynamicProperty("filling", 0);
        newTile.setDynamicProperty("timer", 0);
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
    const pos = tile.location;
    tile.teleport({
        x: pos.x,
        y: Math.floor(pos.y) + BARREL_CONSTANTS.HEIGHT_OFFSET + (filling / 100) * 0.875,
        z: pos.z,
    });
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
    block.dimension.playSound(soundId, {x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5});
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
    block.dimension.playSound(soundId, {x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5});
}

function getContainedEntities(block: Block): Entity[] {
    const newPos = {
        x: block.x + 0.5,
        y: Math.floor(block.y) + 0.46875,
        z: block.z + 0.5
    };
    return block.dimension.getEntities({
        excludeTypes: [BARREL_TILE_ID],
        location: newPos,
        maxDistance: BARREL_CONSTANTS.BARREL_ENTITY_RADIUS,
    });
}

function tryExtinguishEntity(entity: Entity): void {
    const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
    if (!onFire || onFire.onFireTicksRemaining <= 0) return;

    entity.extinguishFire(true);
}
