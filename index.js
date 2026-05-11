const supabaseUrl = 'https://kyfddcexuvcqpslfyvad.supabase.co/rest/v1/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZmRkY2V4dXZjcXBzbGZ5dmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTIyNzAsImV4cCI6MjA5Mzk4ODI3MH0.tpkaI_1c1w0gIawh_F9KaUVNOfht7nYI483Rs0hj7OE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const inventoryEl = document.getElementById('inventory');
const statsEl = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');

let inventory = JSON.parse(localStorage.getItem('homeInventory')) || [];

const doodles = {
    cleaning: 'doodles/cleaning.jpeg',
    medicine: 'doodles/medicine.png',
    other: 'doodles/other.jpeg',
    pantry: 'doodles/pantry.jpeg',
    toiletry: 'doodles/toiletry.jpeg'
};


function saveData() {
    localStorage.setItem('homeInventory', JSON.stringify(inventory));
    for (const item of inventory) {
        await supabaseClient
        .from('inventory')
        .upsert(item);
    }
}


function getImage(category) {
    const lower = category.toLowerCase();

    if (lower.includes('cleaning')) return doodles.cleaning;
    if (lower.includes('medicine')) return doodles.medicine;
    if (lower.includes('pantry')) return doodles.pantry;
    if (lower.includes('toiletry')) return doodles.toiletry;

    return doodles.other;
}


function getStatus(item) {
    if (item.quantity === 0)
        return '⚠ Buy Now';

    if (item.quantity <= item.minimum)
        return '🛒 Buy Soon';

    return '✅ Stocked';
}


function renderItems() {
    inventoryEl.innerHTML = '';

    const search = searchInput.value.toLowerCase();

    const filtered = inventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.id - a.id);

    if (filtered.length === 0) {
        inventoryEl.innerHTML = `
            <div class="empty-state">
                Nothing here yet. Humanity still buying duplicate detergent.
            </div>
        `;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        let className = 'item';

        if (item.quantity === 0)
          className += ' empty';
        else if (item.quantity <= item.minimum)
          className += ' low';

        div.className = className;

        div.innerHTML = `
            <div class="left">
                <img src="${getImage(item.category)}" alt="${item.name}" />
                <div class="details">
                    <h3>${item.name}</h3>
                    <p>Minimum: ${item.minimum}</p>
                    <p>Category: ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</p>
                    <div class="status">${getStatus(item)}</div>
                </div>
            </div>

            <div class="controls">
                <button onclick="decreaseQty(${item.id})"> ➖ </button>
                <div class="qty">${item.quantity}</div>
                <button onclick="increaseQty(${item.id})"> ➕ </button>
                <button class="delete-btn" onclick="deleteItem(${item.id})"> ✖ </button>
            </div>
        `;

        inventoryEl.appendChild(div);
    });

    updateStats();
    saveData();
}


function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('itemQty').value);
    const minimum = parseInt(document.getElementById('itemMin').value);
    const category = document.getElementById('itemCategory').value;

    if (!name) return;

    inventory.push({
        id: Date.now(),
        name,
        quantity,
        minimum,
        category
    });

    document.getElementById('itemName').value = '';
    document.getElementById('itemQty').value = '';
    document.getElementById('itemMin').value = 1;
    document.getElementById('itemCategory').value = '';
    renderItems();
}


function increaseQty(id) {
    const item = inventory.find(i => i.id === id);
    item.quantity++;
    renderItems();
}


function decreaseQty(id) {
    const item = inventory.find(i => i.id === id);

    if (item.quantity > 0)
        item.quantity--;

    renderItems();
}


function deleteItem(id) {
    inventory = inventory.filter(item => item.id !== id);
    renderItems();
}


function clearAll() {
    if (confirm('Delete entire inventory? Tiny domestic apocalypse incoming.')) {
        inventory = [];
        renderItems();
    }
}


function updateStats() {
    const lowStock = inventory.filter(i => i.quantity <= i.minimum && i.quantity !== 0).length;
    const buySoon = inventory.filter(i => i.quantity === 0).length;

    statsEl.innerHTML = `
        Total Items: <b>${inventory.length}</b>
        &nbsp; | &nbsp;
        Low Stock: <b>${lowStock}</b>
        &nbsp; | &nbsp;
        Buy Soon: <b>${buySoon}</b>
    `;
}


searchInput.addEventListener('input', renderItems);


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}


async function loadData() {
    const localData = JSON.parse(localStorage.getItem('homeInventory'));

    if (localData && localData.length > 0) {
        inventory = localData;
        renderItems();
        return;
    }

    const { data, error } = await supabaseClient
        .from('inventory')
        .select('*');

    if (!error && data) {
        inventory = data;
        localStorage.setItem('homeInventory', JSON.stringify(data));
        renderItems();
    }
}

loadData();