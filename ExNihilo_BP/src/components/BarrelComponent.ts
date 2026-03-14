import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    Entity,
    EntityInventoryComponent,
    ItemStack,
    Player
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {COMPOSTABLE_ITEMS} from "../data/compostable_items";
import {getTileEntity} from "../Utils";

export class BarrelComponent implements BlockCustomComponent {

    onPlace(e: BlockComponentOnPlaceEvent): void {
        const entity = e.block.dimension.spawnEntity("exnihilo:barrel_tile", e.block.location);
        entity.setDynamicProperty("filling", 0);
        entity.setDynamicProperty("type", "empty");
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        const block = e.block;

        getTileEntity(block, "exnihilo:barrel_tile")?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent) {
        handleCompostable(e.block, e.player);
        handleLiquid(e.block, e.player);
    }
}

function handleCompostable(block: Block, player: Player): void {
    const tile = getTileEntity(block, "exnihilo:barrel_tile");
    const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inventory?.container;
    const item = container?.getItem(player.selectedSlotIndex);
    const fillAmount = item && COMPOSTABLE_ITEMS[item.typeId];

    if (!tile || !container || !item || !fillAmount) return;
    const filling = tile.getDynamicProperty("filling") as number;
    const type = tile.getDynamicProperty("type") as string;
    if (type != "empty" && type != "compost" || filling == 100) return;

    if (item.amount > 1) {
        item.amount--;
        container.setItem(player.selectedSlotIndex, item);
    } else {
        container.setItem(player.selectedSlotIndex, null);
    }
    changeFilling(block, fillAmount, "compost");
}

function handleLiquid(block: Block, player: Player): void {
    const tile = getTileEntity(block, "exnihilo:barrel_tile");
    const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inventory?.container;
    const item = container?.getItem(player.selectedSlotIndex);

    if (!tile || !container || !item) return;
    const filling = tile.getDynamicProperty("filling") as number;
    const type = tile.getDynamicProperty("type") as string;
    if (item.typeId === "minecraft:water_bucket") {
        if (type === "empty" || type === "water") {
            changeFilling(block, 100, "water");
            container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:bucket", 1));
            block.dimension.playSound("bucket.empty_water", block.location);
            return;
        }
    }
    if (item.typeId === "minecraft:lava_bucket") {
        if (type === "empty" || type === "lava") {
            changeFilling(block, 100, "lava");
            container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:bucket", 1));
            block.dimension.playSound("bucket.empty_lava", block.location);
            return;
        }
    }
    if (item.typeId === "minecraft:bucket") {
        if (type === "water" && filling == 100) {
            changeFilling(block, -100, "empty");
            container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:water_bucket", 1));
            block.dimension.playSound("bucket.fill_water", block.location);
            return;
        }
        if (type === "lava" && filling == 100) {
            changeFilling(block, -100, "empty");
            container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:lava_bucket", 1));
            block.dimension.playSound("bucket.fill_lava", block.location);
            return;
        }
    }
}

function changeFilling(block: Block, amount: number, type: string): void {
    const tile = getTileEntity(block, "exnihilo:barrel_tile");
    if (!tile) return;

    const oldFilling = tile.getDynamicProperty("filling") as number;
    const oldType = tile.getDynamicProperty("type") as string;

    const newFilling = Math.min(Math.max(oldFilling + amount, 0), 100); // 0..100
    tile.setDynamicProperty("filling", newFilling);
    tile.setDynamicProperty("type", type);

    if (newFilling !== oldFilling || type !== oldType) {
        onFillingChanged(tile, block);
    }
    //move the entity up if the level has increased
    const diff = calculateLevel(newFilling) - calculateLevel(oldFilling);
    if (diff > 0 && type != "water" && type != "lava") {
        const pos = block.location;
        const entities = block.dimension.getEntities({
            excludeTypes: ["exnihilo:barrel_tile"],
            location: {
                x: pos.x + 0.5,
                y: pos.y + 0.5,
                z: pos.z + 0.5
            },
            maxDistance: 0.45
        });
        entities.forEach(entity => {
            entity.applyImpulse({x: 0, y: 0.22 * diff, z: 0})
        });
    }
}

function onFillingChanged(tile: Entity, block: Block) {
    const filling = tile.getDynamicProperty("filling") as number;
    const type = tile.getDynamicProperty("type") as string;
    const level = calculateLevel(filling);

    block.setPermutation(block.permutation.withState("exnihilo:level" as keyof BlockStateSuperset, level));
    block.setPermutation(block.permutation.withState("exnihilo:filling" as keyof BlockStateSuperset, type));
}

function calculateLevel(filling: number): number {
    return filling > 0 ? 1 + Math.floor(Math.ceil(filling) / 25) : 0;
}