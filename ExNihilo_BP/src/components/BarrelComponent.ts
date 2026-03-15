import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Entity,
    EntityComponentTypes,
    EntityDamageCause,
    EntityOnFireComponent,
    ItemStack,
    Player
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {COMPOSTABLE_ITEMS} from "../data/compostable_items";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity, SelectedItemContext} from "../Utils";

type BarrelFillType = "empty" | "compost" | "water" | "lava";
type NonEmptyLiquidBarrelType = Extract<BarrelFillType, "water" | "lava">;

const BARREL_TILE_ID = "exnihilo:barrel_tile";
const EMPTY_TYPE: BarrelFillType = "empty";
const COMPOST_TYPE: BarrelFillType = "compost";
const WATER_TYPE: NonEmptyLiquidBarrelType = "water";
const LAVA_TYPE: NonEmptyLiquidBarrelType = "lava";

const MAX_FILLING = 100;
const LEVEL_STEP = 25;
const BARREL_ENTITY_RADIUS = 0.45;
const ENTITY_LIFT_PER_LEVEL = 0.22;
const WATER_SPLASH_OFFSET_Y = 0.4;
const LAVA_FIRE_SECONDS = 10;
const LAVA_DAMAGE = 2;

const EMPTY_BUCKET_ITEM = "minecraft:bucket";
const WATER_BUCKET_ITEM = "minecraft:water_bucket";
const LAVA_BUCKET_ITEM = "minecraft:lava_bucket";

export class BarrelComponent implements BlockCustomComponent {

    onPlace(e: BlockComponentOnPlaceEvent): void {
        const pos = e.block.location;
        const tile = e.block.dimension.spawnEntity(BARREL_TILE_ID, {
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            z: pos.z + 0.5
        });
        setBarrelState(tile, {filling: 0, type: EMPTY_TYPE});
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getBarrelTile(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent) {
        handleCompostable(e.block, e.player);
        handleLiquid(e.block, e.player);
    }

    onTick(e: BlockComponentTickEvent): void {
        const tile = getBarrelTile(e.block);
        if (!tile) return;

        const state = getBarrelState(tile);
        if (state.type === EMPTY_TYPE || state.filling === 0) return;

        let filling = state.filling;
        for (const entity of getContainedEntities(tile)) {
            if (state.type === LAVA_TYPE) {
                applyLavaEffects(entity);
                continue;
            }

            if (state.type === WATER_TYPE && filling >= LEVEL_STEP && tryExtinguishEntity(entity, tile, e.block)) {
                filling -= LEVEL_STEP;
            }
        }
    }
}

function handleCompostable(block: Block, player: Player): void {
    const tile = getBarrelTile(block);
    const selectedItem = getSelectedItemContext(player);
    if (!tile || !selectedItem) return;

    const fillAmount = COMPOSTABLE_ITEMS[selectedItem.item.typeId];
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

function changeFilling(block: Block, amount: number, type: BarrelFillType): void {
    const tile = getBarrelTile(block);
    if (!tile) return;

    const oldState = getBarrelState(tile);
    const newFilling = Math.min(Math.max(oldState.filling + amount, 0), MAX_FILLING);
    const newType = newFilling > 0 ? type : EMPTY_TYPE;

    setBarrelState(tile, {filling: newFilling, type: newType});

    if (newFilling !== oldState.filling || newType !== oldState.type) {
        onFillingChanged(block, newFilling, newType);
    }

    const diff = calculateLevel(newFilling) - calculateLevel(oldState.filling);
    if (diff > 0 && newType !== WATER_TYPE && newType !== LAVA_TYPE) {
        for (const entity of getContainedEntities(tile)) {
            entity.applyImpulse({x: 0, y: ENTITY_LIFT_PER_LEVEL * diff, z: 0});
        }
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
    tile.setDynamicProperty("filling", state.filling);
    tile.setDynamicProperty("type", state.type);
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
    return tile.dimension.getEntities({
        excludeTypes: [BARREL_TILE_ID],
        location: tile.location,
        maxDistance: BARREL_ENTITY_RADIUS
    });
}

function applyLavaEffects(entity: Entity): void {
    entity.setOnFire(LAVA_FIRE_SECONDS);
    entity.applyDamage(LAVA_DAMAGE, {cause: EntityDamageCause.lava});
}

function tryExtinguishEntity(entity: Entity, tile: Entity, block: Block): boolean {
    if (entity.getVelocity().y < 0) {
        const pos = tile.location;
        tile.dimension.playSound("random.splash", tile.location);
        tile.dimension.spawnParticle("minecraft:water_splash_particle", {
            x: pos.x,
            y: pos.y + WATER_SPLASH_OFFSET_Y,
            z: pos.z
        });
    }

    const onFire = entity.getComponent(EntityComponentTypes.OnFire) as EntityOnFireComponent;
    if (!onFire || onFire.onFireTicksRemaining <= 0) return false;

    entity.extinguishFire(true);
    changeFilling(block, -LEVEL_STEP, WATER_TYPE);
    return true;
}

function onFillingChanged(block: Block, filling: number, type: BarrelFillType): void {
    const level = calculateLevel(filling);

    const permutation = block.permutation
        .withState("exnihilo:level" as keyof BlockStateSuperset, level)
        .withState("exnihilo:filling" as keyof BlockStateSuperset, type);
    block.setPermutation(permutation);
}

function calculateLevel(filling: number): number {
    return filling > 0 ? 1 + Math.floor(Math.ceil(filling) / LEVEL_STEP) : 0;
}