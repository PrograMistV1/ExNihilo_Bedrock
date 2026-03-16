import {Block, Dimension, Entity, EntityInventoryComponent, ItemStack, Player, Vector3} from "@minecraft/server";

type SelectedItemContext = {
    container: NonNullable<EntityInventoryComponent["container"]>;
    item: ItemStack;
    slot: number;
};

function getTileEntity(block: Block, entityId: string): Entity | null {
    const pos = block.location;
    const entities = block.dimension.getEntities({
        type: entityId,
        location: {
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            z: pos.z + 0.5
        },
        closest: 1
    });
    if (entities.length === 0) {
        console.warn(`Tile not found for block {${block.dimension.id}, [${pos.x}, ${pos.y}, ${pos.z}]}`);
        return null;
    }
    return entities[0];
}

function getSelectedItemContext(player: Player): SelectedItemContext | null {
    const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inventory?.container;
    if (!container) return null;

    const slot = player.selectedSlotIndex;
    const item = container.getItem(slot);
    if (!item) return null;

    return {container, item, slot};
}

function consumeSelectedItem(selectedItem: SelectedItemContext): void {
    if (selectedItem.item.amount > 1) {
        selectedItem.item.amount--;
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
        return;
    }

    selectedItem.container.setItem(selectedItem.slot, null);
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
