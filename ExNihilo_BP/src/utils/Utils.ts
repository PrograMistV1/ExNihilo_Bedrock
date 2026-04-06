import {
    Block,
    Entity,
    EntityDamageCause,
    EntityInventoryComponent,
    ItemStack,
    Player,
    VanillaEntityIdentifier
} from "@minecraft/server";

export type SelectedItemContext = {
    container: NonNullable<EntityInventoryComponent["container"]>;
    item?: ItemStack;
    slot: number;
};



export function getSelectedItemContext(player: Player): SelectedItemContext | null {
    const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inventory?.container;
    if (!container) return null;

    const slot = player.selectedSlotIndex;
    const item = container.getItem(slot);

    return {container, item, slot};
}

export function consumeSelectedItem(selectedItem: SelectedItemContext, amount: number = 1): number {
    const newAmount = selectedItem.item.amount - amount;
    if (newAmount > 0) {
        selectedItem.item.amount = newAmount;
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
        return newAmount;
    }
    selectedItem.container.setItem(selectedItem.slot, null);
    return 0;
}

export function damageSelectedItem(selectedItem: SelectedItemContext, player: Player, damage: number = 1): void {
    const durability = selectedItem.item.getComponent("minecraft:durability");
    if (!durability) return;

    durability.damage += damage;
    if (durability.damage >= durability.maxDurability) {
        selectedItem.container.setItem(selectedItem.slot, null);
        player.dimension.playSound('random.break', player.location, {volume: 1.0, pitch: 0.9});
    } else {
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
    }
}

export function applyLavaEffects(entity: Entity, seconds: number = 10, damage: number = 4): void {
    entity.setOnFire(seconds);
    entity.applyDamage(damage, {cause: EntityDamageCause.lava});
}