document.addEventListener("DOMContentLoaded", () => {
    const tables = document.querySelectorAll(".crafting-table");

    tables.forEach(table => {
        const recipes = JSON.parse(table.dataset.recipes || "[]");
        if (recipes.length === 0) return;

        const slots = table.querySelectorAll(".inventory-slot");

        let index = 0;

        function renderRecipe(recipe) {
            slots.forEach((slot, i) => {
                setItem(slot, recipe[i]);
            });
        }

        renderRecipe(recipes[0]);

        setInterval(() => {
            index = (index + 1) % recipes.length;
            renderRecipe(recipes[index]);
            refreshTooltip();
        }, 2000);
    });
});

const items = {
    wood: {
        icon: "../assets/wood.png",
        url: "https://minecraft.fandom.com/wiki/Planks",
        name: "Wood"
    },
    stone: {
        icon: "../assets/stone.png",
        url: "https://minecraft.fandom.com/wiki/Stone",
        name: "Stone"
    },
    iron: {
        icon: "../assets/iron.png",
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

    const img = new Image();
    img.onload = () => slot.style.backgroundImage = `url('${item.icon}')`;
    img.onerror = () => slot.style.backgroundImage = `url('../assets/missing_texture.png')`;

    img.src = item.icon;
    slot.dataset.item = itemName;
    slot.dataset.url = item.url;
    slot.dataset.name = item.name;
    slot.style.cursor = "pointer";

    slot.onclick = () => window.open(item.url, "_blank");
}

document.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
});


const tooltip = document.getElementById("tooltip");

document.addEventListener("mouseover", (e) => {
    const slot = e.target.closest(".inventory-slot");
    if (!slot || !slot.dataset.name) return;

    tooltip.style.display = "block";
    tooltip.textContent = slot.dataset.name;
});

document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".inventory-slot")) {
        tooltip.style.display = "none";
    }
});

function refreshTooltip() {
    const hovered = document.querySelector(".inventory-slot:hover");
    if (hovered && hovered.dataset.name) {
        tooltip.textContent = hovered.dataset.name;
    }
}