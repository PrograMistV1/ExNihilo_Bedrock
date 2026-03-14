import {Block, Entity} from "@minecraft/server";

function getTileEntity(block: Block, entityId: string): Entity | null {
    const pos = block.location;
    const entities = block.dimension.getEntities({
        type: entityId,
        location: pos,
        closest: 1
    });
    if (entities.length === 0) {
        console.warn(`Tile not found for block {${block.dimension.id}, [${pos.x}, ${pos.y}, ${pos.z}]}`);
        return null;
    }
    return entities[0];
}

export {getTileEntity};
