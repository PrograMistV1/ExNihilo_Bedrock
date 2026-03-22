import {Block, Dimension, Entity, EntityInventoryComponent, ItemStack, Player, Vector3} from "@minecraft/server";

type SelectedItemContext = {
    container: NonNullable<EntityInventoryComponent["container"]>;
    item?: ItemStack;
    slot: number;
};

function getTileEntity(block: Block, entityId: string): Entity | undefined {
    const pos = block.location;
    const entities = block.dimension.getEntities({
        type: entityId,
        location: {
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            z: pos.z + 0.5
        },
        closest: 1,
        maxDistance: 0.5
    });
    if (entities.length === 0) return undefined;
    return entities[0];
}

function getSelectedItemContext(player: Player): SelectedItemContext | null {
    const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inventory?.container;
    if (!container) return null;

    const slot = player.selectedSlotIndex;
    const item = container.getItem(slot);

    return {container, item, slot};
}

function consumeSelectedItem(selectedItem: SelectedItemContext, amount: number = 1): number {
    const newAmount = selectedItem.item.amount - amount;
    if (newAmount > 0) {
        selectedItem.item.amount = newAmount;
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
        return newAmount;
    }
    selectedItem.container.setItem(selectedItem.slot, null);
    return 0;
}

function dropItem(drop: ItemStack, dimension: Dimension, location: Vector3): void {
    const entity = dimension.spawnItem(drop, location);
    entity.applyImpulse({
        x: Math.random() * 0.03,
        y: 0.03,
        z: Math.random() * 0.03
    });
}

export {
    getTileEntity,
    getSelectedItemContext,
    consumeSelectedItem,
    dropItem,
    SelectedItemContext
};
