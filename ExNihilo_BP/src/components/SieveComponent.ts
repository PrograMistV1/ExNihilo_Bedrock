import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    ButtonState,
    Entity,
    InputButton,
    ItemStack,
    ItemUseAfterEvent,
    system,
    world
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {getSelectedItemContext, getTileEntity} from "../Utils";
import {SIEVE_TILE_ID} from "../data/TileList";

type MeshType =
    "null"
    | "string"
    | "flint"
    | "iron"
    | "diamond"
    | "emerald"
    | "netherite";

export class SieveComponent implements BlockCustomComponent {
    onBreak(e: BlockComponentBlockBreakEvent): void {
        getInputBlock(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        const selectedItem = getSelectedItemContext(e.player);

        const oldMesh = getMeshType(e.block);
        if (oldMesh === "null" && isMesh(selectedItem?.item)) {
            setMeshType(e.block, itemToMeshType(selectedItem.item));
            selectedItem.container.setItem(selectedItem.slot, null);
            return;
        }
        if (system.currentTick - (e.player.getDynamicProperty("last_sieve_interact") as number) < 7) return;
        if (oldMesh !== "null" && e.player.inputInfo.getButtonState(InputButton.Sneak) == ButtonState.Pressed && !selectedItem.item) {
            setMeshType(e.block, "null");
            selectedItem.container.setItem(selectedItem.slot, meshTypeToItem(oldMesh));
        }
    }
}

world.afterEvents.itemUse.subscribe((event: ItemUseAfterEvent) => {
    const player = event.source;
    const selectedItem = getSelectedItemContext(player);
    const block = player.getBlockFromViewDirection({maxDistance: 6})?.block;

    if (!block?.getComponent("exnihilo:sieve") && !isMesh(selectedItem.item)) return;

    const oldMesh = getMeshType(block);
    setMeshType(block, itemToMeshType(selectedItem.item));
    selectedItem.container.setItem(selectedItem.slot, meshTypeToItem(oldMesh));
    player.setDynamicProperty("last_sieve_interact", system.currentTick);
});

function getInputBlock(block: Block): Entity | undefined {
    return getTileEntity(block, SIEVE_TILE_ID);
}

function setInputBlock(sieve: Block, input: string): void {
    if (getInputBlock(sieve) !== undefined) return;

    const pos = sieve.location;
    sieve.dimension.spawnEntity(SIEVE_TILE_ID, {
        x: pos.x + 0.5,
        y: pos.y + 0.69,
        z: pos.z + 0.5
    }, {spawnEvent: input});
}

function getMeshType(block: Block): MeshType {
    return block.permutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) as MeshType;
}

function setMeshType(block: Block, mesh: MeshType): void {
    block.setPermutation(block.permutation.withState("exnihilo:mesh" as keyof BlockStateSuperset, mesh));
}

function isReadyToSieve(block: Block): boolean {
    return getMeshType(block) !== "null" && (getInputBlock(block) !== undefined);
}

function isMesh(item: ItemStack): boolean {
    const meshTypes = [
        "exnihilo:string_mesh",
        "exnihilo:flint_mesh",
        "exnihilo:iron_mesh",
        "exnihilo:diamond_mesh",
        "exnihilo:emerald_mesh",
        "exnihilo:netherite_mesh",
    ];
    return meshTypes.includes(item.typeId);
}

function meshTypeToItem(type: MeshType): ItemStack | null {
    const meshToItemMap = {
        null: null,
        string: "exnihilo:string_mesh",
        flint: "exnihilo:flint_mesh",
        iron: "exnihilo:iron_mesh",
        diamond: "exnihilo:diamond_mesh",
        emerald: "exnihilo:emerald_mesh",
        netherite: "exnihilo:netherite_mesh",
    }
    const id = meshToItemMap[type];
    if (!id) return null;
    return new ItemStack(id, 1);
}

function itemToMeshType(item?: ItemStack): MeshType {
    const itemToMeshMap = {
        null: null,
        "exnihilo:string_mesh": "string",
        "exnihilo:flint_mesh": "flint",
        "exnihilo:iron_mesh": "iron",
        "exnihilo:diamond_mesh": "diamond",
        "exnihilo:emerald_mesh": "emerald",
        "exnihilo:netherite_mesh": "netherite",
    }
    const mesh = itemToMeshMap[item.typeId];
    if (!mesh) return "null";
    return mesh as MeshType;
}