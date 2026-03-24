export const VARIANT_STATE_MAP: Readonly<Record<number, CrucibleInput>> = {
    0: "exnihilo:default",
    1: "exnihilo:gravel",
    2: "exnihilo:lava"
}

export const CRUCIBLE_CONSTANTS = {
    inputEntityCenterOffset: 0.5,
    inputEntityHeightOffset: 0.1875,
}

export type CrucibleInput = "exnihilo:default" | "exnihilo:gravel" | "exnihilo:lava";

export const InputDefault = "exnihilo:default";
export const InputGravel = "exnihilo:gravel";
export const InputLava = "exnihilo:lava";