import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    ButtonState,
    InputButton,
    ItemStack,
    ItemUseAfterEvent,
    Player,
    system,
    VanillaEntityIdentifier,
    world
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {consumeItem, getSelectedItemContext} from "../../utils/Utils";
import {
    MESH_ITEM_BY_TYPE,
    MESH_TYPE_BY_ITEM,
    MeshType,
    SIEVE_CONSTANTS,
    SIFTABLE_BLOCK_STATES
} from "../../data/SieveData";
import {DROP_BY_MESH, rollDrops} from "../../data/loot/SieveLoot";
import {TileEntityBlock} from "./tiles/TileEntityBlock";

export class SieveComponent extends TileEntityBlock implements BlockCustomComponent {
    static readonly TILE_ID: string = "exnihilo:sieve_tile";
    static readonly VARIANT_STATE_MAP: Record<number, string> = {
        0: "exnihilo:default",
        1: "exnihilo:dirt",
        2: "exnihilo:gravel",
        3: "exnihilo:sand",
        4: "exnihilo:soul_sand",
        5: "exnihilo:dust",
        6: "exnihilo:crushed_end_stone",
        7: "exnihilo:crushed_netherrack",
    }

    constructor() {
        super(SieveComponent.TILE_ID, SieveComponent.VARIANT_STATE_MAP);

        world.afterEvents.itemUse.subscribe((event: ItemUseAfterEvent) => {
            const player = event.source;
            const selectedItem = getSelectedItemContext(player);
            if (!selectedItem?.item) return;

            const block = player.getBlockFromViewDirection({maxDistance: SIEVE_CONSTANTS.maxViewDistance})?.block;

            if (!this.isSieveBlock(block) || !this.isMeshItemId(selectedItem.item.typeId)) return;

            const oldMesh = this.getMeshType(block);
            this.setMeshType(block, this.itemToMeshType(selectedItem.item.typeId));
            selectedItem.container.setItem(selectedItem.slot, this.meshTypeToItem(oldMesh));
            player.setDynamicProperty("last_sieve_interact", system.currentTick);
        });
    }

    onBreak = (e: BlockComponentBlockBreakEvent) => {
        this.removeInputBlock(e.block);
    }

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent) => {
        this.handleMesh(e.player, e.block);
        this.handleProgress(e.block);
        this.handleInput(e.player, e.block);
    }

    onPlayerBreak = (e: BlockComponentPlayerBreakEvent) => {
        const mesh = e.brokenBlockPermutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) as MeshType;
        if (mesh === "null") return;

        e.dimension.spawnItem(new ItemStack(MESH_ITEM_BY_TYPE[mesh]), e.block.center());
    }

    private handleProgress(block: Block): void {
        for (const targetBlock of this.getSieveNeighbors(block)) {
            if (!this.isReadyToSieve(targetBlock)) continue;

            const progress = this.getProgress(targetBlock) + (1 / SIEVE_CONSTANTS.maxSieveClicks);
            if (progress >= SIEVE_CONSTANTS.completeProgress) {
                rollDrops(this.getMeshType(targetBlock), this.getInputBlock(targetBlock)).forEach(drop => {
                    targetBlock.dimension.spawnItem(drop, {
                        x: targetBlock.location.x + 0.5,
                        y: targetBlock.location.y + 1,
                        z: targetBlock.location.z + 0.5
                    });
                });
                this.removeInputBlock(targetBlock);
                continue;
            }
            this.setProgress(targetBlock, progress);
        }
    }

    private handleInput(player: Player, block: Block): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem?.item) return;

        const state = this.blockToState(selectedItem.item.typeId);
        if (!state) return;

        for (const targetBlock of this.getSieveNeighbors(block)) {
            const mesh = this.getMeshType(targetBlock);
            const input = this.getInputBlock(targetBlock);
            if (mesh === "null" || input !== undefined || !this.canBeSifted(state, mesh)) continue;

            this.setInputBlock(targetBlock, state);
            if (consumeItem(selectedItem) === 0) break;
        }
    }

    private canBeSifted(input: string, mesh: MeshType): boolean {
        return Object.keys(DROP_BY_MESH[mesh]).includes(input);
    }

    private handleMesh(player: Player, block: Block): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem) return;

        const oldMesh = this.getMeshType(block);
        if (oldMesh === "null" && this.isMeshItemId(selectedItem.item?.typeId)) {
            this.setMeshType(block, this.itemToMeshType(selectedItem.item.typeId));
            selectedItem.container.setItem(selectedItem.slot, null);
            return;
        }

        const lastInteractTick = (player.getDynamicProperty("last_sieve_interact") as number | undefined) ?? 0;
        if (system.currentTick - lastInteractTick < SIEVE_CONSTANTS.interactCooldownTicks) return;

        if (oldMesh !== "null"
            && player.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed
            && selectedItem.item == null
            && this.getInputBlock(block) === undefined
        ) {
            this.setMeshType(block, "null");
            selectedItem.container.setItem(selectedItem.slot, this.meshTypeToItem(oldMesh));
        }
    }

    private* getSieveNeighbors(block: Block): Generator<Block> {
        const radius = SIEVE_CONSTANTS.neighborRadius;
        const origin = block.location;
        //center offset
        let x = 0;
        let z = 0;
        //vector (1,0)-right, (-1,0)-left, (0,1)-up, (0,-1)-down
        let dx = 1;
        let dz = 0;

        let segmentLength = 1;
        let segmentPassed = 0;
        let segmentCount = 0;

        const maxSteps = (radius * 2 + 1) ** 2;

        for (let i = 0; i < maxSteps; i++) {
            if (Math.abs(x) <= radius && Math.abs(z) <= radius) {
                const targetBlock = block.dimension.getBlock({
                    x: origin.x + x,
                    y: origin.y,
                    z: origin.z + z
                });

                if (this.isSieveBlock(targetBlock)) {
                    yield targetBlock;
                }
            }

            x += dx;
            z += dz;
            segmentPassed++;

            if (segmentPassed === segmentLength) {
                segmentPassed = 0;

                const temp = dx;
                dx = -dz;
                dz = temp;

                segmentCount++;

                if (segmentCount % 2 === 0) {
                    segmentLength++;
                }
            }
        }
    }

    private getInputBlock(sieve: Block): string | undefined {
        const tile = this.getTileEntity(sieve);
        if (!tile) return undefined;

        return SieveComponent.VARIANT_STATE_MAP[tile.getComponent("minecraft:variant").value];
    }

    private setInputBlock(sieve: Block, input: string): void {
        if (this.getTileEntity(sieve) !== undefined) return;

        const pos = sieve.location;
        sieve.dimension.spawnEntity(SieveComponent.TILE_ID as keyof VanillaEntityIdentifier, {
            x: pos.x + SIEVE_CONSTANTS.inputEntityCenterOffset,
            y: pos.y + SIEVE_CONSTANTS.inputEntityHeightOffset,
            z: pos.z + SIEVE_CONSTANTS.inputEntityCenterOffset
        }, {spawnEvent: input});
    }

    private removeInputBlock(sieve: Block): void {
        this.getTileEntity(sieve)?.remove();
    }

    private getProgress(sieve: Block): number | undefined {
        const tile = this.getTileEntity(sieve);
        if (!tile) return undefined;

        return tile.getProperty("exnihilo:progress") as number;
    }

    private setProgress(sieve: Block, progress: number): void {
        const tile = this.getTileEntity(sieve);
        if (!tile) return;

        tile.setProperty("exnihilo:progress", progress);
    }

    private getMeshType(block: Block): MeshType {
        return block.permutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) as MeshType;
    }

    private setMeshType(block: Block, mesh: MeshType): void {
        block.setPermutation(block.permutation.withState("exnihilo:mesh" as keyof BlockStateSuperset, mesh));
    }

    private isReadyToSieve(block: Block): boolean {
        return this.getMeshType(block) !== "null" && (this.getInputBlock(block) !== undefined);
    }

    private isSieveBlock(block?: Block): block is Block {
        return block?.hasComponent("exnihilo:sieve") ?? false;
    }

    private isMeshItemId(itemId?: string): itemId is keyof typeof MESH_TYPE_BY_ITEM {
        return itemId !== undefined && Object.prototype.hasOwnProperty.call(MESH_TYPE_BY_ITEM, itemId);
    }

    private blockToState(blockId?: string): string | undefined {
        if (!blockId) return undefined;
        return SIFTABLE_BLOCK_STATES[blockId];
    }

    private meshTypeToItem(type: MeshType): ItemStack | null {
        if (type === "null") return null;
        return new ItemStack(MESH_ITEM_BY_TYPE[type], 1);
    }

    private itemToMeshType(itemId?: string): MeshType {
        if (!this.isMeshItemId(itemId)) return "null";
        return MESH_TYPE_BY_ITEM[itemId];
    }
}