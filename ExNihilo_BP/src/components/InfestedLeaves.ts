import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentRandomTickEvent,
    BlockCustomComponent,
    Dimension,
    Vector3
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

const LEAVES_LIST = {
    "minecraft:oak_leaves": "exnihilo:infested_oak_leaves",
    "minecraft:spruce_leaves": "exnihilo:infested_spruce_leaves",
    "minecraft:birch_leaves": "exnihilo:infested_birch_leaves",
    "minecraft:jungle_leaves": "exnihilo:infested_jungle_leaves",
    "minecraft:acacia_leaves": "exnihilo:infested_acacia_leaves",
    "minecraft:dark_oak_leaves": "exnihilo:infested_dark_oak_leaves",
    "minecraft:mangrove_leaves": "exnihilo:infested_mangrove_leaves",
    "minecraft:cherry_leaves": "exnihilo:infested_cherry_leaves",
    "minecraft:pale_oak_leaves": "exnihilo:infested_pale_oak_leaves",
    "minecraft:azalea_leaves": "exnihilo:infested_azalea_leaves",
    "minecraft:flowering_azalea_leaves": "exnihilo:infested_flowering_azalea_leaves",
};

const INFESTED_STATE = "exnihilo:infested" as keyof BlockStateSuperset;

export class InfestedLeaves implements BlockCustomComponent {
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
            if (LEAVES_LIST[target.typeId]) {
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
        const newType = LEAVES_LIST[target.typeId];
        if (newType) {
            dimension.setBlockType(target, newType);
        }
    }
}