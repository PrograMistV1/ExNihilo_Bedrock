import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentRandomTickEvent,
    BlockCustomComponent,
    Dimension,
    Vector3
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {LEAVES_TO_INFESTED_MAP} from "../../data/InfestedLeavesData";

export const INFESTED_STATE = "exnihilo:infested" as keyof BlockStateSuperset;

export class InfestedLeavesComponent implements BlockCustomComponent {
    onRandomTick(e: BlockComponentRandomTickEvent): void {
        const {block, dimension} = e;

        const perm = block.permutation;
        if (!perm.getState(INFESTED_STATE)) {
            block.setPermutation(perm.withState(INFESTED_STATE, true));
            spread(dimension, block);
        }
    }

    onPlace(e: BlockComponentOnPlaceEvent): void {
        for (const target of getNeighbors(e.dimension, e.block)) {
            if (LEAVES_TO_INFESTED_MAP[target.typeId]) {
                target.setPermutation(target.permutation.withState('persistent_bit', true));
                target.setPermutation(target.permutation.withState('update_bit', false));
            }
        }
    }
}

function* getNeighbors(dimension: Dimension, block: Block): Generator<Block> {
    const {x, y, z} = block;

    const offsets: Vector3[] = [
        {x: -1, y: 0, z: 0},
        {x: 1, y: 0, z: 0},
        {x: 0, y: -1, z: 0},
        {x: 0, y: 1, z: 0},
        {x: 0, y: 0, z: -1},
        {x: 0, y: 0, z: 1},
    ];

    for (const offset of offsets) {
        const neighbor = dimension.getBlock({x: x + offset.x, y: y + offset.y, z: z + offset.z});

        if (neighbor) {
            yield neighbor;
        }
    }
}

function spread(dimension: Dimension, block: Block): void {
    for (const target of getNeighbors(dimension, block)) {
        const newType = LEAVES_TO_INFESTED_MAP[target.typeId];
        if (newType) {
            dimension.setBlockType(target, newType);
        }
    }
}