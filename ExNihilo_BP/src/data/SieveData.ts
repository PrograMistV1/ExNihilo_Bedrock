export type MeshType =
    "null"
    | "string"
    | "flint"
    | "iron"
    | "diamond"
    | "emerald"
    | "netherite";

export const SIEVE_CONSTANTS = {
    maxSieveClicks: 10,
    completeProgress: 1,
    interactCooldownTicks: 7,
    neighborRadius: 1,
    inputEntityCenterOffset: 0.5,
    inputEntityHeightOffset: 0.69,
    maxViewDistance: 6,
} as const;

export const SIFTABLE_BLOCK_STATES: Readonly<Record<string, string>> = {
    "minecraft:dirt": "exnihilo:dirt",
};

export const MESH_ITEM_BY_TYPE = {
    string: "exnihilo:string_mesh",
    flint: "exnihilo:flint_mesh",
    iron: "exnihilo:iron_mesh",
    diamond: "exnihilo:diamond_mesh",
    emerald: "exnihilo:emerald_mesh",
    netherite: "exnihilo:netherite_mesh",
} as const satisfies Record<Exclude<MeshType, "null">, string>;

export type MeshItemId = (typeof MESH_ITEM_BY_TYPE)[keyof typeof MESH_ITEM_BY_TYPE];

export const MESH_TYPE_BY_ITEM: Record<MeshItemId, Exclude<MeshType, "null">> =
    Object.fromEntries(
        Object.entries(MESH_ITEM_BY_TYPE).map(([meshType, itemId]) => [itemId, meshType])
    ) as Record<MeshItemId, Exclude<MeshType, "null">>;

export const VARIANT_STATE_MAP = {
    0: "exnihilo:default",
    1: "exnihilo:dirt",
}