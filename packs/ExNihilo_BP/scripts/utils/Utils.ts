import {
    Block,
    Entity,
    EntityDamageCause,
    EntityInventoryComponent,
    GameMode,
    ItemStack,
    Player
} from "@minecraft/server";

export type ItemContext = {
    container: NonNullable<EntityInventoryComponent["container"]>;
    item?: ItemStack | undefined;
    slot: number;
    source: Entity | Block;
};

export function getSelectedItemContext(player: Player): ItemContext | null {
    return getItemContext(player, player.selectedSlotIndex);
}

export function getItemContext(source: Entity | Block, slot: number): ItemContext | null {
    const container = source.getComponent("minecraft:inventory")?.container;
    if (!container) return null;

    const item = container.getItem(slot);
    return {container, item, slot, source};
}

export function consumeItem(selectedItem: ItemContext, amount: number = 1): number {
    if (selectedItem.source instanceof Player && selectedItem.source.getGameMode() === GameMode.Creative) {
        return 0;
    }

    const item = selectedItem.item;
    if (!item) return 0;

    const newAmount = item.amount - amount;

    if (newAmount > 0) {
        item.amount = newAmount;
        selectedItem.container.setItem(selectedItem.slot, item);
        return newAmount;
    }

    selectedItem.container.setItem(selectedItem.slot);
    return 0;
}

export function damageSelectedItem(selectedItem: ItemContext, player: Player, damage: number = 1): void {
    const durability = selectedItem.item?.getComponent("minecraft:durability");
    if (!durability || player.getGameMode() === GameMode.Creative) return;

    durability.damage += damage;
    if (durability.damage >= durability.maxDurability) {
        selectedItem.container.setItem(selectedItem.slot);
        player.dimension.playSound('random.break', player.location, {volume: 1.0, pitch: 0.9});
    } else {
        selectedItem.container.setItem(selectedItem.slot, selectedItem.item);
    }
}

export function applyLavaEffects(entity: Entity, seconds: number = 10, damage: number = 4): void {
    entity.setOnFire(seconds);
    entity.applyDamage(damage, {cause: EntityDamageCause.lava});
}