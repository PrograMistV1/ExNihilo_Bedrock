import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Entity,
    EntityComponentTypes,
    EntityDamageCause,
    EntityOnFireComponent,
    ItemStack,
    MolangVariableMap,
    Player,
    system,
    WeatherType,
    world
} from "@minecraft/server";
import {CompostableItems} from "../data/CompostableItems";
import {consumeSelectedItem, dropItem, getSelectedItemContext, getTileEntity, SelectedItemContext} from "../Utils";
import {BARREL_TILE_ID} from "../data/TileList";

type BarrelFillType =
    "exnihilo:default"
    | "exnihilo:compost"
    | "exnihilo:water"
    | "exnihilo:lava"
    | "exnihilo:dirt"
    | "exnihilo:clay"
    | "witch_water";
type NonEmptyLiquidBarrelType = Extract<BarrelFillType, "exnihilo:water" | "exnihilo:lava">;

const EMPTY_TYPE: BarrelFillType = "exnihilo:default";
const COMPOST_TYPE: BarrelFillType = "exnihilo:compost";
const WATER_TYPE: NonEmptyLiquidBarrelType = "exnihilo:water";
const LAVA_TYPE: NonEmptyLiquidBarrelType = "exnihilo:lava";
const DIRT_TYPE: BarrelFillType = "exnihilo:dirt";
const CLAY_TYPE: BarrelFillType = "exnihilo:clay";

const MAX_FILLING = 100;
const LEVEL_STEP = 25;
const BARREL_ENTITY_RADIUS = 0.47;
const WATER_SPLASH_OFFSET_Y = 0.1;
const LAVA_FIRE_SECONDS = 10;
const LAVA_DAMAGE = 4;
const COMPOSTING_TIME_TICKS = 514; //1 barrel update tick occurs every 7 game ticks. 514*7≈3600, which equals 3 minutes.

const EMPTY_BUCKET_ITEM = "minecraft:bucket";
const WATER_BUCKET_ITEM = "minecraft:water_bucket";
const LAVA_BUCKET_ITEM = "minecraft:lava_bucket";

const getDrop = (tile: Entity) => {
    const id = ({
        [DIRT_TYPE]: "minecraft:dirt",
        [CLAY_TYPE]: "minecraft:clay"
    })[getBarrelState(tile).type];
    return id ? new ItemStack(id, 1) : null;
};

let isRainingGlobal = false;

export class BarrelComponent implements BlockCustomComponent {

    onPlace(e: BlockComponentOnPlaceEvent): void {
        const pos = e.block.location;
        const tile = e.block.dimension.spawnEntity(BARREL_TILE_ID, {
            x: pos.x + 0.5,
            y: pos.y + 0.05,
            z: pos.z + 0.5
        });
        setBarrelState(tile, {filling: 0, type: EMPTY_TYPE});
        resetTimer(tile);
        tile.triggerEvent("exnihilo:show");
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getBarrelTile(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent) {
        handleCompostable(e.block, e.player);
        handleLiquid(e.block, e.player);
        handleExtractResult(e.block);
        handleSpecialInteractions(e.block, e.player);
    }

    onTick(e: BlockComponentTickEvent): void {
        const tile = getBarrelTile(e.block);
        if (!tile) return;

        const state = getBarrelState(tile);
        const isHighest = e.block.dimension.getBlockAbove(e.block.location, {
            includeLiquidBlocks: true,
            includePassableBlocks: true,
            maxDistance: 16
        }) === undefined;
        if ((state.type === EMPTY_TYPE || state.type === WATER_TYPE) && state.filling < MAX_FILLING && isHighest && isRainingGlobal) {
            //todo: Rain is not found in all biomes, and only in the overworld.
            changeFilling(e.block, 0.33334, WATER_TYPE); //1 minute 45 seconds to fill barrel
        }
        if (state.type === WATER_TYPE) {
            for (const entity of getContainedEntities(tile)) {
                if (state.filling > 0) {
                    if (entity.getVelocity().y < 0) {
                        const pos = tile.location;
                        tile.dimension.playSound("random.splash", tile.location);
                        const molang = new MolangVariableMap();
                        molang.setVector3("variable.direction", {x: 0, y: 1, z: 0});
                        tile.dimension.spawnParticle("minecraft:water_splash_particle", {
                            x: pos.x,
                            y: pos.y + WATER_SPLASH_OFFSET_Y,
                            z: pos.z
                        }, molang);
                    }
                }
                if (state.filling >= LEVEL_STEP) {
                    tryExtinguishEntity(entity, e.block);
                }
            }
            return;
        }
        if (state.type === LAVA_TYPE) {
            for (const entity of getContainedEntities(tile)) {
                applyLavaEffects(entity);
            }
            return;
        }
        if (state.type === COMPOST_TYPE && state.filling === MAX_FILLING) {
            if (getTimer(tile) >= COMPOSTING_TIME_TICKS) {
                changeFilling(e.block, MAX_FILLING, DIRT_TYPE);
                resetTimer(tile);
            } else {
                incrementTimer(tile);
            }
            return;
        }
    }

    onPlayerBreak(e: BlockComponentPlayerBreakEvent): void {
        const tile = getBarrelTile(e.block);
        if (!tile) return;

        const drop = getDrop(tile);
        if (!drop) return;

        const {x, y, z} = tile.location;
        dropItem(drop, e.block.dimension, {x, y: y + 0.5, z});
    }
}

world.afterEvents.weatherChange.subscribe(event => {
    if (event.dimension != "overworld") return;

    system.runTimeout(() => {
        isRainingGlobal = event.newWeather != WeatherType.Clear;
        world.setDynamicProperty("isRaining", isRainingGlobal);
    }, 80) //wtf mojang?
    // Even though the weather has changed, if you rejoin the world within a few seconds,
    // the weather will revert to the previous state.
});

world.afterEvents.worldLoad.subscribe(() => {
    isRainingGlobal = (world.getDynamicProperty("isRaining") as boolean | undefined) ?? false;
});

function handleCompostable(block: Block, player: Player): void {
    const tile = getBarrelTile(block);
    const selectedItem = getSelectedItemContext(player);
    if (!tile || !selectedItem) return;

    const fillAmount = CompostableItems[selectedItem.item.typeId];
    if (fillAmount === undefined) return;

    const {filling, type} = getBarrelState(tile);
    if ((type !== EMPTY_TYPE && type !== COMPOST_TYPE) || filling === MAX_FILLING) return;

    consumeSelectedItem(selectedItem);
    changeFilling(block, fillAmount, COMPOST_TYPE);
}

function handleLiquid(block: Block, player: Player): void {
    const tile = getBarrelTile(block);
    const selectedItem = getSelectedItemContext(player);
    if (!tile || !selectedItem) return;

    const {filling, type} = getBarrelState(tile);

    if (selectedItem.item.typeId === WATER_BUCKET_ITEM) {
        if (type === EMPTY_TYPE || type === WATER_TYPE) {
            fillBarrelFromBucket(block, selectedItem, WATER_TYPE, "bucket.empty_water");
        }
        return;
    }

    if (selectedItem.item.typeId === LAVA_BUCKET_ITEM) {
        if (type === EMPTY_TYPE || type === LAVA_TYPE) {
            fillBarrelFromBucket(block, selectedItem, LAVA_TYPE, "bucket.empty_lava");
        }
        return;
    }

    if (selectedItem.item.typeId !== EMPTY_BUCKET_ITEM || filling !== MAX_FILLING) return;

    if (type === WATER_TYPE) {
        drainBarrelToBucket(block, selectedItem, WATER_BUCKET_ITEM, "bucket.fill_water");
        return;
    }

    if (type === LAVA_TYPE) {
        drainBarrelToBucket(block, selectedItem, LAVA_BUCKET_ITEM, "bucket.fill_lava");
    }
}

function handleExtractResult(block: Block): void {
    const tile = getBarrelTile(block);
    if (!tile) return;

    const drop = getDrop(tile);
    if (!drop) return;

    const {x, y, z} = tile.location;
    dropItem(drop, block.dimension, {x, y: y + 0.5, z});

    changeFilling(block, -MAX_FILLING, EMPTY_TYPE);
}

function handleSpecialInteractions(block: Block, player: Player): void {
    const tile = getBarrelTile(block);
    const selectedItem = getSelectedItemContext(player);
    if (!tile || !selectedItem) return;

    const {filling, type} = getBarrelState(tile);
    if (type === WATER_TYPE && filling === MAX_FILLING && selectedItem.item.typeId === "exnihilo:dust") {
        consumeSelectedItem(selectedItem);
        changeFilling(block, MAX_FILLING, CLAY_TYPE);
        return;
    }
}

function changeFilling(block: Block, amount: number, type: BarrelFillType): void {
    const tile = getBarrelTile(block);
    if (!tile) return;

    const oldState = getBarrelState(tile);
    const newFilling = Math.min(Math.max(oldState.filling + amount, 0), MAX_FILLING);
    const newType = newFilling > 0 ? type : EMPTY_TYPE;

    if (newFilling !== oldState.filling || newType !== oldState.type) {
        setBarrelState(tile, {filling: newFilling, type: newType});
        const pos = tile.location;
        const newPos = {
            x: pos.x,
            y: Math.floor(pos.y) + (newFilling == 0 ? 0.05 : 0.0625) + (newFilling / 100) * (0.875),
            z: pos.z,
        };
        tile.teleport(newPos)
    }
}

function getBarrelTile(block: Block): Entity | null {
    return getTileEntity(block, BARREL_TILE_ID);
}

function getBarrelState(tile: Entity): { filling: number; type: BarrelFillType } {
    return {
        filling: (tile.getDynamicProperty("filling") as number | undefined) ?? 0,
        type: (tile.getDynamicProperty("type") as BarrelFillType | undefined) ?? EMPTY_TYPE
    };
}

function setBarrelState(tile: Entity, state: { filling: number; type: BarrelFillType }): void {
    const oldState = getBarrelState(tile);
    const isOldLiquid = oldState.type === WATER_TYPE || oldState.type === LAVA_TYPE;
    const isNewEmpty = state.type === EMPTY_TYPE;

    if (!isOldLiquid && state.filling === 0) {
        tile.triggerEvent("exnihilo:hide");
        system.runTimeout(() => tile.triggerEvent("exnihilo:show"), 20);
    }

    if (!isOldLiquid || !isNewEmpty) {
        tile.triggerEvent(state.type);
        if (!isNewEmpty) {
            tile.triggerEvent("exnihilo:show");
        }
    }
    tile.setDynamicProperty("filling", state.filling);
    tile.setDynamicProperty("type", state.type);
}

function resetTimer(tile: Entity): void {
    tile.setDynamicProperty("timer", 0);
}

function incrementTimer(tile: Entity): void {
    tile.setDynamicProperty("timer", getTimer(tile) + 1);
}

function getTimer(tile: Entity): number {
    return (tile.getDynamicProperty("timer") as number | undefined) ?? 0;
}

function fillBarrelFromBucket(
    block: Block,
    selectedItem: SelectedItemContext,
    type: NonEmptyLiquidBarrelType,
    soundId: string
): void {
    changeFilling(block, MAX_FILLING, type);
    selectedItem.container.setItem(selectedItem.slot, new ItemStack(EMPTY_BUCKET_ITEM, 1));
    block.dimension.playSound(soundId, block.location);
}

function drainBarrelToBucket(
    block: Block,
    selectedItem: SelectedItemContext,
    filledBucketItemId: string,
    soundId: string
): void {
    changeFilling(block, -MAX_FILLING, EMPTY_TYPE);
    selectedItem.container.setItem(selectedItem.slot, new ItemStack(filledBucketItemId, 1));
    block.dimension.playSound(soundId, block.location);
}

/**
 * @param tile Barrel tile entity (Entity), not the Block itself.
 */
function getContainedEntities(tile: Pick<Entity, "dimension" | "location">): Entity[] {
    const newPos = {
        x: tile.location.x,
        y: Math.floor(tile.location.y) + 0.4375,
        z: tile.location.z
    };
    return tile.dimension.getEntities({
        excludeTypes: [BARREL_TILE_ID],
        location: newPos,
        maxDistance: BARREL_ENTITY_RADIUS,
    });
}

function applyLavaEffects(entity: Entity): void {
    entity.setOnFire(LAVA_FIRE_SECONDS);
    entity.applyDamage(LAVA_DAMAGE, {cause: EntityDamageCause.lava});
}

function tryExtinguishEntity(entity: Entity, block: Block): void {
    const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
    if (!onFire || onFire.onFireTicksRemaining <= 0) return;

    entity.extinguishFire(true);
    changeFilling(block, -LEVEL_STEP, WATER_TYPE);
}
