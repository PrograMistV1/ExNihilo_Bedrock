import {
    BlockComponentBlockBreakEvent,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    EntityInventoryComponent
} from "@minecraft/server";
import {COMPOSTABLE_ITEMS} from "../data/compostable_items";
import {getTileEntity} from "../Utils";

export class BarrelComponent implements BlockCustomComponent {

    onPlace(e: BlockComponentOnPlaceEvent): void {
        e.block.dimension.spawnEntity("exnihilo:barrel_tile", e.block.location);
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        const block = e.block;

        getTileEntity(block, "exnihilo:barrel_tile")?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        const player = e.player;
        const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;

        const container = inventory.container;
        if (!container) return;

        const item = container.getItem(player.selectedSlotIndex);
        if (!item) return;

        const value = COMPOSTABLE_ITEMS[item.typeId];
        if (value !== undefined) {
            player.sendMessage(`Compost +${value}`);
        }
    }
}
