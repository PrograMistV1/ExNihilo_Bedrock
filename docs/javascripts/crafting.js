function itemIconPath(itemId) {
    if (!itemId) return null;
    const name = itemId.split(":")[1];
    return `../assets/${name}.png`;
}

function itemWikiUrl(itemId) {
    if (!itemId) return null;
    const [ns, name] = itemId.split(":");
    if (ns === "minecraft") {
        return `https://minecraft.wiki/w/${name}`;
    }
    return null;
}

function itemDisplayName(itemId) {
    if (!itemId) return "";
    const name = itemId.split(":")[1] ?? itemId;
    return name
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function setItem(slot, itemId) {
    slot.style.backgroundImage = "";
    slot.dataset.item = "";
    slot.dataset.name = "";
    slot.dataset.url = "";
    slot.style.cursor = "";
    slot.onclick = null;

    if (!itemId) return;

    const iconPath = itemIconPath(itemId);
    const url = itemWikiUrl(itemId);
    const name = itemDisplayName(itemId);

    slot.dataset.item = itemId;
    slot.dataset.name = name;
    if (url) {
        slot.dataset.url = url;
        slot.style.cursor = "pointer";
        slot.onclick = () => window.open(url, "_blank");
    }

    const img = new Image();
    img.onload = () => (slot.style.backgroundImage = `url('${iconPath}')`);
    img.onerror = () =>
        (slot.style.backgroundImage = `url('../assets/missing_texture.png')`);
    img.src = iconPath;
}

document.addEventListener("DOMContentLoaded", () => {
    const tooltip = document.getElementById("tooltip");

    document.querySelectorAll(".crafting-table").forEach(table => {
        /** @type {Array<{result: string, grid: (string|null)[]}>} */
        const recipes = JSON.parse(table.dataset.recipes || "[]");
        if (recipes.length === 0) return;

        const inputSlots = Array.from(table.querySelectorAll(".crafting-input .inventory-slot"));
        const outputSlot = table.querySelector(".crafting-output .inventory-slot");

        function renderRecipe(recipe) {
            inputSlots.forEach((slot, i) => {
                setItem(slot, recipe.grid[i] ?? null);
            });
            if (outputSlot) {
                setItem(outputSlot, recipe.result ?? null);
            }
        }

        let index = 0;
        renderRecipe(recipes[0]);

        if (recipes.length > 1) {
            setInterval(() => {
                index = (index + 1) % recipes.length;
                renderRecipe(recipes[index]);
                refreshTooltip(tooltip);
            }, 2000);
        }
    });

    document.addEventListener("mousemove", e => {
        if (!tooltip) return;
        tooltip.style.left = e.pageX + 12 + "px";
        tooltip.style.top = e.pageY + 12 + "px";
    });

    document.addEventListener("mouseover", e => {
        const slot = e.target.closest(".inventory-slot");
        if (!slot || !slot.dataset.name || !tooltip) return;
        tooltip.textContent = slot.dataset.name;
        tooltip.style.display = "block";
    });

    document.addEventListener("mouseout", e => {
        if (e.target.closest(".inventory-slot") && tooltip) {
            tooltip.style.display = "none";
        }
    });
});

function refreshTooltip(tooltip) {
    if (!tooltip) return;
    const hovered = document.querySelector(".inventory-slot:hover");
    if (hovered && hovered.dataset.name) {
        tooltip.textContent = hovered.dataset.name;
    }
}