import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    ButtonState,
    GameMode,
    InputButton,
    ItemStack,
    Player,
    system,
    VanillaEntityIdentifier
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {consumeItem, getSelectedItemContext, ItemContext} from "../../utils/Utils";
import {MESH_ITEM_BY_TYPE, MeshRegistry, MeshType, SIEVE_CONSTANTS, SIFTABLE_BLOCK_STATES} from "../../data/SieveData";
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
    }

    onBreak = (e: BlockComponentBlockBreakEvent) => {
        this.removeInputBlock(e.block);
    }

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent) => {
        const lit = (e.player.getDynamicProperty("lastSieveInteract") as number | undefined) ?? 0;
        if (system.currentTick - lit < SIEVE_CONSTANTS.interactCooldownTicks) return;

        const itemCtx = getSelectedItemContext(e.player);

        if (this.handleMesh(e.player, e.block, itemCtx)) return;
        this.handleProgress(e.block);
        this.handleInput(e.block, itemCtx);
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

    private handleInput(block: Block, itemCtx: ItemContext): void {
        if (!itemCtx?.item) return;

        const state = this.blockToState(itemCtx.item.typeId);
        if (!state) return;

        for (const targetBlock of this.getSieveNeighbors(block)) {
            const mesh = this.getMeshType(targetBlock);
            const input = this.getInputBlock(targetBlock);
            if (mesh === "null" || input !== undefined || !this.canBeSifted(state, mesh)) continue;

            this.setInputBlock(targetBlock, state);
            if (consumeItem(itemCtx) === 0) break;
        }
    }

    private canBeSifted(input: string, mesh: MeshType): boolean {
        return Object.keys(DROP_BY_MESH[mesh]).includes(input);
    }

    private handleMesh(player: Player, block: Block, itemCtx: ItemContext): boolean {
        const oldMesh = this.getMeshType(block);
        const meshComp = itemCtx.item?.getComponent("exnihilo:mesh");
        const p = meshComp?.customComponentParameters;
        if (oldMesh === "null" && meshComp) {
            this.setMeshType(block, p.params["type"]);
            block.dimension.playSound(p.params["sound"], block.center());
            consumeItem(itemCtx);
            return true;
        }

        if (oldMesh === "null"
            || player.inputInfo.getButtonState(InputButton.Sneak) !== ButtonState.Pressed
            || this.getInputBlock(block)
            || itemCtx.item
        ) return;

        const oldMeshItem = new ItemStack(MeshRegistry.toItem(oldMesh), 1);
        const oldMeshP = oldMeshItem.getComponent("exnihilo:mesh").customComponentParameters;
        this.setMeshType(block, "null");
        block.dimension.playSound(oldMeshP.params["sound"], block.center());
        if (player.getGameMode() !== GameMode.Creative) {
            itemCtx.container.addItem(new ItemStack(MeshRegistry.toItem(oldMesh), 1));
        }
        return true;
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

    private blockToState(blockId?: string): string | undefined {
        if (!blockId) return undefined;
        return SIFTABLE_BLOCK_STATES[blockId];
    }
}