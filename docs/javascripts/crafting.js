document.addEventListener("DOMContentLoaded", () => {
    const slots = document.querySelectorAll(".inventory-slot");

    setItem(slots[0], "wood");
    setItem(slots[1], "stone");
});

const items = {
    wood: {
        icon: "/minecraft-bedrock/addons/exnihilo-bedrock/assets/items/wood.png",
        url: "https://minecraft.fandom.com/wiki/Planks",
        name: "Wood"
    },
    stone: {
        icon: "/minecraft-bedrock/addons/exnihilo-bedrock/assets/items/stone.png",
        url: "https://minecraft.fandom.com/wiki/Stone",
        name: "Stone"
    },
    iron: {
        icon: "/minecraft-bedrock/addons/exnihilo-bedrock/assets/items/iron.png",
        url: "https://minecraft.fandom.com/wiki/Iron_Ingot",
        name: "Iron"
    }
};

function setItem(slot, itemName) {
    const item = items[itemName];

    if (!item) {
        slot.style.backgroundImage = "";
        slot.dataset.item = "";
        slot.onclick = null;
        return;
    }

    slot.dataset.item = itemName;
    slot.dataset.url = item.url;
    slot.dataset.name = item.name;

    slot.style.backgroundImage = `url('${item.icon}')`;

    slot.style.cursor = "pointer";

    slot.onclick = () => {
        window.open(item.url, "_blank");
    };
    bindHover(slot, item);
}

const tooltip = document.getElementById("tooltip");

document.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
});

function bindHover(slot, item) {
    slot.addEventListener("mouseenter", () => {
        if (!item) return;

        tooltip.style.display = "block";
        tooltip.textContent = item.name;
    });

    slot.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });
}