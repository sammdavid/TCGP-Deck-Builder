// Deck state
let deck = Array(20).fill(null);
let allCards = [];
let selectedCards = [];
let maxSelectable = 0;
let displayLimit = 50;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeDeck();
    loadCards();
    setupEventListeners();
});

// Deck management functions
function initializeDeck() {
    const deckGrid = document.getElementById('deckGrid');
    deckGrid.innerHTML = '';

    for (let i = 0; i < 20; i++) {
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        slot.dataset.index = i;

        if (deck[i]) {
            renderFilledSlot(slot, deck[i]);
        } else {
            renderEmptySlot(slot);
        }

        deckGrid.appendChild(slot);
    }

    updateCardCount();
}

function renderEmptySlot(slot) {
    slot.innerHTML = '<div class="slot-placeholder">Available Slot</div>';
    slot.classList.remove('filled');
    slot.classList.add('empty');
}

function renderFilledSlot(slot, card) {
    slot.innerHTML = `
        <img src="${card.image}" alt="${card.name}" class="card-image" onclick="openZoomModal(${slot.dataset.index})">
        <button class="remove-button" onclick="removeCard(${slot.dataset.index}); event.stopPropagation();">×</button>
    `;
    slot.classList.add('filled');
    slot.classList.remove('empty');
    
    slot.addEventListener('click', function(e) {
        if (!e.target.classList.contains('remove-button')) {
            openZoomModal(slot.dataset.index);
        }
    });
}

function removeCard(index) {
    deck[index] = null;
    sortDeck();
    initializeDeck();
}

function updateCardCount() {
    const count = deck.filter(card => card !== null).length;
    document.getElementById('deckCount').textContent = count;
}

// AUTO-SORT FUNCTION
function sortDeck() {
    const cards = deck.filter(card => card !== null);
    
    const typeOrder = {
        'Grass': 0, 'Fire': 1, 'Water': 2, 'Lightning': 3,
        'Psychic': 4, 'Fighting': 5, 'Darkness': 6, 'Metal': 7,
        'Fairy': 8, 'Dragon': 9, 'Colorless': 10
    };
    
    const categoryOrder = {
        'Pokémon': 0,
        'Item': 1,
        'Tool': 2,
        'Stadium': 3,
        'Supporter': 4,
        'Energy': 5
    };
    
    const stageOrder = {
        'Basic': 0,
        'Stage 1': 1,
        'Stage 2': 2
    };
    
    cards.sort((a, b) => {
        const catA = categoryOrder[a.category] || 0;
        const catB = categoryOrder[b.category] || 0;
        
        if (catA !== catB) {
            return catA - catB;
        }
        
        if (a.category === 'Pokémon' && b.category === 'Pokémon') {
            const typeA = a.types?.[0] || 'Colorless';
            const typeB = b.types?.[0] || 'Colorless';
            
            if (typeOrder[typeA] !== typeOrder[typeB]) {
                return (typeOrder[typeA] || 10) - (typeOrder[typeB] || 10);
            }
            
            const stageA = stageOrder[a.stage] || 0;
            const stageB = stageOrder[b.stage] || 0;
            return stageA - stageB;
        }
        
        return 0;
    });
    
    deck = Array(20).fill(null);
    cards.forEach((card, index) => {
        deck[index] = card;
    });
}

// Card loading functions - FIXED VERSION
// Card loading functions - FIXED VERSION
// Simple working version - use whatever was working before
async function loadCards() {
    try {
        document.getElementById('cardResults').innerHTML = '<div class="loading-spinner"><div class="pokeball"><div class="pokeball-button"></div></div><p>LOADING TCGP CARDS...</p></div>';
        
        // Use the exact same API call that was working
        const seriesResponse = await fetch('https://api.tcgdex.net/v2/en/series/tcgp');
        const seriesData = await seriesResponse.json();

        const sets = seriesData.sets || [];
        populateSetFilter(sets);

        const setDataArray = await Promise.all(
            sets.map(set =>
                fetch(`https://api.tcgdex.net/v2/en/sets/${set.id}`)
                    .then(res => res.json())
                    .catch(err => {
                        console.error(`Error loading set ${set.id}:`, err);
                        return null;
                    })
            )
        );

        allCards = [];
        setDataArray.forEach(setData => {
            if (setData && setData.cards) {
                setData.cards.forEach(card => {
                    const imageUrl = card.image || '';
                    const lowQualityWebp = imageUrl ? `${imageUrl}/low.webp` : '';
                    const highQualityPng = imageUrl ? `${imageUrl}/high.png` : '';
                    
                    // Better rarity detection
                    let cardRarity = 'Common';
                    
                    // Check multiple possible rarity fields
                    if (card.rarity) {
                        cardRarity = card.rarity;
                    } else if (card.rarity) {
                        cardRarity = card.rarity;
                    }
                    
                    // Fallback: Check card ID patterns for rarity hints
                    if (!card.rarity) {
                        const cardId = card.id || '';
                        if (cardId.includes('H') || cardId.includes('SR') || cardId.includes('UR')) {
                            cardRarity = 'Rare Holo';
                        } else if (cardId.includes('R') || cardId.includes('rare')) {
                            cardRarity = 'Rare';
                        } else if (cardId.includes('U') || cardId.includes('uncommon')) {
                            cardRarity = 'Uncommon';
                        }
                    }
                    
                    allCards.push({
                        id: card.id,
                        name: card.name,
                        image: lowQualityWebp,
                        imageHiRes: highQualityPng,
                        set: setData.id,
                        setName: setData.name,
                        rarity: cardRarity, // Use the properly detected rarity
                        types: card.types || [],
                        category: card.category || 'Pokémon',
                        stage: card.stage || 'Basic',
                        hp: card.hp || null,
                        evolvesFrom: card.evolvesFrom || null,
                        effect: card.effect || '',
                        itemType: card.item?.name || null
                    });
                });

                // Add debug logging to see what rarity data we're getting
                console.log('Sample cards with rarity:', allCards.slice(0, 5).map(card => ({
                    name: card.name,
                    rarity: card.rarity,
                    rawRarity: card.rarity // Log what came from API directly
})));
            }
        });

        if (allCards.length > 0) {
            displayCards(allCards);
        } else {
            document.getElementById('cardResults').innerHTML =
                '<p class="loading-text">No cards available yet. Please try again later.</p>';
        }
    } catch (error) {
        console.error('Error loading cards:', error);
        document.getElementById('cardResults').innerHTML =
            '<p class="loading-text">Error loading cards. Please check console for details.</p>';
    }
}

// Helper function to process cards from a set
function processCardsFromSet(cards, set, allCardsData) {
    cards.forEach(card => {
        processSingleCard(card, set, allCardsData);
    });
}

// Helper function to process a single card
function processSingleCard(card, set, allCardsData) {
    const imageUrl = card.image || '';
    const lowQualityWebp = imageUrl ? `${imageUrl}/low.webp` : '';
    const highQualityPng = imageUrl ? `${imageUrl}/high.png` : '';
    
    // Determine card category properly
    let cardCategory = 'Pokémon';
    let cardTypes = card.types || [];
    
    if (card.category) {
        cardCategory = card.category;
    } else if (cardTypes.length === 0) {
        // No types = likely a Trainer/Energy
        if (card.name.includes('Energy') || card.effect?.includes('Energy')) {
            cardCategory = 'Energy';
        } else {
            cardCategory = 'Trainer';
        }
    }
    
    allCardsData.push({
        id: card.id || Math.random().toString(36).substr(2, 9), // Fallback ID
        name: card.name || 'Unknown Card',
        image: lowQualityWebp,
        imageHiRes: highQualityPng,
        set: set.id,
        setName: set.name,
        rarity: card.rarity || 'Common',
        types: cardTypes,
        category: cardCategory,
        stage: card.stage || 'Basic',
        hp: card.hp || null,
        evolvesFrom: card.evolvesFrom || null,
        effect: card.effect || ''
    });
}

// Update populateSetFilter to work with cards
function populateSetFilterFromCards(cards) {
    const setFilter = document.getElementById('setFilter');
    setFilter.innerHTML = '<option value="all">All Sets</option>';

    // Get unique sets from cards
    const uniqueSets = {};
    cards.forEach(card => {
        if (card.set && card.setName) {
            uniqueSets[card.set] = card.setName;
        }
    });
    
    Object.entries(uniqueSets).forEach(([setId, setName]) => {
        const option = document.createElement('option');
        option.value = setId;
        option.textContent = setName;
        setFilter.appendChild(option);
    });
}

// Keep the original populateSetFilter for sets array
function populateSetFilter(sets) {
    const setFilter = document.getElementById('setFilter');
    setFilter.innerHTML = '<option value="all">All Sets</option>';

    sets.forEach(set => {
        const option = document.createElement('option');
        option.value = set.id;
        option.textContent = set.name;
        setFilter.appendChild(option);
    });
}

// Modal functions
function openModal() {
    const emptySlots = deck.filter(slot => slot === null).length;
    
    if (emptySlots === 0) {
        alert('Deck is full! Remove a card before adding more.');
        return;
    }
    
    maxSelectable = emptySlots;
    selectedCards = [];
    
    const modal = document.getElementById('cardModal');
    modal.classList.add('active');
    
    updateSelectionUI();
    
    if (allCards.length > 0) {
        displayCards(allCards);
    }
}

function closeModal() {
    const modal = document.getElementById('cardModal');
    modal.classList.remove('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('setFilter').value = 'all';
    selectedCards = [];
}

// Card selection functions
function displayCards(cards) {
    const resultsContainer = document.getElementById('cardResults');
    
    if (!cards || cards.length === 0) {
        resultsContainer.innerHTML = '<p class="loading-text">No cards found</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-results-grid';

    const cardsToShow = cards.slice(0, displayLimit);

    cardsToShow.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'result-card';
        cardElement.dataset.cardId = card.id;
        
        const currentCount = selectedCards.filter(selected => selected.id === card.id).length;
        const maxAllowed = getMaxAllowedCopies(card);
        
        if (currentCount > 0) {
            cardElement.classList.add('selected');
            cardElement.setAttribute('data-count', currentCount);
        }
        
        cardElement.innerHTML = `
            <img src="${card.image}" alt="${card.name}" loading="lazy">
            <div class="result-card-name">${card.name}</div>
            <div class="card-controls">
                <button class="add-copy-btn" onclick="event.stopPropagation(); addCardCopy('${card.id}')" 
                        ${currentCount >= maxAllowed || selectedCards.length >= maxSelectable ? 'disabled' : ''}>
                    +
                </button>
                <button class="remove-copy-btn" onclick="event.stopPropagation(); removeCardCopy('${card.id}')" 
                        ${currentCount === 0 ? 'disabled' : ''}>
                    −
                </button>
            </div>
        `;
        
        cardElement.addEventListener('click', function() {
            addCardCopy(card.id);
        });
        
        grid.appendChild(cardElement);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(grid);

    if (cards.length > displayLimit) {
        const moreText = document.createElement('p');
        moreText.className = 'loading-text';
        moreText.textContent = `Showing ${displayLimit} of ${cards.length} cards. Use search to narrow results.`;
        resultsContainer.appendChild(moreText);
    }
}

function addCardCopy(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) {
        console.error('Card not found with ID:', cardId);
        return;
    }
    
    const currentCount = selectedCards.filter(selected => selected.id === cardId).length;
    const maxAllowed = getMaxAllowedCopies(card);
    
    if (currentCount >= maxAllowed) {
        alert(`You can only add ${maxAllowed} copies of ${card.name} to your deck.`);
        return;
    }
    
    if (selectedCards.length >= maxSelectable) {
        alert(`You can only select up to ${maxSelectable} cards (available deck slots).`);
        return;
    }
    
    selectedCards.push(card);
    updateSelectionUI();
    updateCardDisplay();
}

function removeCardCopy(cardId) {
    const index = selectedCards.findIndex(selected => selected.id === cardId);
    if (index > -1) {
        selectedCards.splice(index, 1);
        updateSelectionUI();
        updateCardDisplay();
    }
}

function getMaxAllowedCopies(card) {
    if (card.category === 'Energy') {
        return 999;
    }
    return 2;
}

function updateSelectionUI() {
    document.getElementById('selectedCount').textContent = selectedCards.length;
    document.getElementById('maxSelection').textContent = maxSelectable;
    document.getElementById('confirmCount').textContent = selectedCards.length;
    
    const confirmButton = document.querySelector('.confirm-button');
    confirmButton.disabled = selectedCards.length === 0;
    
    updateCardCountBreakdown();
}

function updateCardCountBreakdown() {
    const counter = document.querySelector('.selection-counter');
    let breakdownEl = document.querySelector('.selection-info');
    
    if (!breakdownEl) {
        breakdownEl = document.createElement('div');
        breakdownEl.className = 'selection-info';
        counter.appendChild(breakdownEl);
    }
    
    const cardCounts = {};
    selectedCards.forEach(card => {
        cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
    });
    
    let breakdownText = '';
    Object.entries(cardCounts).forEach(([name, count]) => {
        const card = selectedCards.find(c => c.name === name);
        const maxAllowed = getMaxAllowedCopies(card);
        breakdownText += `${name}: ${count}/${maxAllowed}\n`;
    });
    
    breakdownEl.textContent = breakdownText || 'No cards selected';
}

function updateCardDisplay() {
    const cardElements = document.querySelectorAll('.result-card');
    const selectedCounts = {};
    
    selectedCards.forEach(card => {
        selectedCounts[card.id] = (selectedCounts[card.id] || 0) + 1;
    });
    
    cardElements.forEach(element => {
        const cardId = element.dataset.cardId;
        const currentCount = selectedCounts[cardId] || 0;
        const card = allCards.find(c => c.id === cardId);
        
        if (currentCount > 0) {
            element.classList.add('selected');
            element.setAttribute('data-count', currentCount);
            
            if (card && currentCount >= getMaxAllowedCopies(card)) {
                element.style.borderColor = '#ff4444';
                element.style.boxShadow = '0 0 20px #ff4444, 0 8px 25px rgba(255, 68, 68, 0.6)';
            } else {
                element.style.borderColor = '';
                element.style.boxShadow = '';
            }
        } else {
            element.classList.remove('selected');
            element.removeAttribute('data-count');
            element.style.borderColor = '';
            element.style.boxShadow = '';
        }
    });
}

function addSelectedCards() {
    if (selectedCards.length === 0) return;
    
    const emptyIndexes = deck.map((slot, index) => slot === null ? index : -1).filter(i => i !== -1);
    
    selectedCards.forEach((card, index) => {
        if (index < emptyIndexes.length) {
            const deckCard = {
                ...card,
                image: card.imageHiRes || card.image
            };
            deck[emptyIndexes[index]] = deckCard;
        }
    });
    
    sortDeck();
    initializeDeck();
    closeModal();
}

function clearSelection() {
    selectedCards = [];
    updateSelectionUI();
    updateCardDisplay();
}

// Zoom modal functions
function openZoomModal(cardIndex) {
    const card = deck[cardIndex];
    if (!card) return;
    
    const zoomModal = document.getElementById('cardZoomModal');
    const zoomImage = document.getElementById('zoomedCardImage');
    
    zoomImage.src = '';
    zoomImage.style.opacity = '0.5';
    
    document.getElementById('zoomedCardName').textContent = card.name;
    
    const details = [];
    
    if (card.category === 'Pokémon') {
        if (card.hp) details.push(`HP: ${card.hp}`);
        if (card.types && card.types.length > 0) {
            details.push(`Type: ${card.types.join(', ')}`);
        }
        if (card.stage && card.stage !== 'Basic') {
            details.push(`Stage: ${card.stage}`);
        }
        if (card.evolvesFrom) {
            details.push(`Evolves from: ${card.evolvesFrom}`);
        }
    } else {
        details.push(`Category: ${card.category}`);
        if (card.effect) {
            details.push(`Effect: ${card.effect}`);
        }
    }
    
    if (card.rarity) {
        details.push(`Rarity: ${card.rarity}`);
    }
    if (card.setName) {
        details.push(`Set: ${card.setName}`);
    }
    
    document.getElementById('zoomedCardDetails').innerHTML = details.join('<br>');
    
    zoomModal.classList.add('active');
    
    const hiResImage = new Image();
    hiResImage.onload = function() {
        zoomImage.src = this.src;
        zoomImage.style.opacity = '1';
    };
    hiResImage.onerror = function() {
        zoomImage.src = card.image;
        zoomImage.style.opacity = '1';
    };
    hiResImage.src = card.imageHiRes || card.image;
}

function closeZoomModal() {
    document.getElementById('cardZoomModal').classList.remove('active');
}

// Event handlers
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const setFilter = document.getElementById('setFilter');

    searchInput.addEventListener('input', filterCards);
    setFilter.addEventListener('change', filterCards);

    document.getElementById('cardModal').addEventListener('click', (e) => {
        if (e.target.id === 'cardModal') {
            closeModal();
        }
    });

    document.getElementById('cardZoomModal').addEventListener('click', (e) => {
        if (e.target.id === 'cardZoomModal') {
            closeZoomModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeZoomModal();
        }
    });
}

function filterCards() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedSet = document.getElementById('setFilter').value;

    let filtered = allCards;

    if (selectedSet !== 'all') {
        filtered = filtered.filter(card => card.set === selectedSet);
    }

    if (searchTerm) {
        filtered = filtered.filter(card =>
            card.name?.toLowerCase().includes(searchTerm) ||
            card.types?.some(type => type.toLowerCase().includes(searchTerm)) ||
            card.category?.toLowerCase().includes(searchTerm)
        );
    }

    displayCards(filtered);
}