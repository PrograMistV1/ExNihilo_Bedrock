# Barrel

The **Barrel** is one of the most important early-game blocks in Ex Nihilo Bedrock.  
It is used as a versatile block for processing organic materials, liquids, and key progression mechanics.

---

## Overview

Barrels are used for:

- composting organic resources into dirt
- collecting rainwater
- transforming materials using liquids
- summoning entities (in development)

This is one of the key blocks for overcoming the initial resource scarcity.

---

## Crafting

<div id="tooltip" class="pixel-image"></div>

{{craft(
"exnihilo:oak_barrel",
"exnihilo:spruce_barrel",
"exnihilo:birch_barrel",
"exnihilo:jungle_barrel",
"exnihilo:acacia_barrel",
"exnihilo:dark_oak_barrel",
"exnihilo:mangrove_barrel",
"exnihilo:cherry_barrel",
"exnihilo:pale_oak_barrel",
"exnihilo:bamboo_barrel",
"exnihilo:crimson_barrel",
"exnihilo:warped_barrel",
"exnihilo:stone_barrel"
)}}

All barrel variants function identically, except for fire resistance.  
Barrels made from Nether wood (Crimson, Warped) and Stone are fireproof and can safely store lava.

---

## Mechanics

### Composting

The barrel composts organic items, filling an internal progress bar.  
Different categories of items provide different fill amounts.

---

### Compost Values

| Category            | Fill Amount | Examples                       |
|---------------------|-------------|--------------------------------|
| Leaves and Saplings | 12.5%       | all leaves, saplings, azalea   |
| Plants and Flowers  | 10%         | flowers, bamboo, cactus, crops |
| Seeds and Wheat     | 8%          | pumpkin seeds, wheat           |
| Silkworms           | 4%          | silkworm, cooked silkworm      |

---

- The value indicates how much the compost bar fills per item
- 100% is required to produce dirt
- Leaves and saplings are the most efficient early-game compost source

---

### Water Collection

When placed under open sky, the barrel can collect rainwater during rain.

This is one of the earliest renewable sources of water.

---

### Material Transformation

Barrels can process items when filled with liquids.

| Fluid | Input Materials | Output Materials |
|-------|-----------------|------------------|
| Water | Dust            | Clay             |
| Lava  | Redstone Dust   | Netherrack       |
| Lava  | Glowstone Dust  | End Stone        |

---

### Entity Summoning

In development

---

### Moss Generation

When filled with water, barrels can convert nearby stone blocks into mossy variants.  
Place stone blocks under the barrel, and over time they will transform into mossy versions.

## Automation

Barrels can be automated using hoppers:

- item input from the top
- item output from the bottom

This is especially useful for composting, allowing automated dirt production setups.

---

## See Also

- [Sieve](../blocks/sieve.md)
- [Crucible](../blocks/crucible.md)
- [Hammer](../items/hammer.md)