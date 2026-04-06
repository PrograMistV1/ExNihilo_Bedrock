import {Container, Entity, EntityDamageCause, EntityInventoryComponent, ItemStack, Player} from "@minecraft/server";

export type ItemContext = {
    container: NonNullable<EntityInventoryComponent["container"]>;
    item?: ItemStack | undefined;
    slot: number;
};

export function getSelectedItemContext(player: Player): ItemContext | null {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return null;

    return getItemContext(container, player.selectedSlotIndex);
}

export function getItemContext(container: Container, slot: number): ItemContext {
    const item = container.getItem(slot);
    return {container, item, slot};
}

export function consumeItem(selectedItem: ItemContext, amount: number = 1): number {
    const newAmount = selectedItem.item.amount - amount;
    if (newAmount > 0) {
        selectedItem.item.amount = newAmount;
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
        return newAmount;
    }
    selectedItem.container.setItem(selectedItem.slot, null);
    return 0;
}

export function damageSelectedItem(selectedItem: ItemContext, player: Player, damage: number = 1): void {
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