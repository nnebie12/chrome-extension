console.log('🚀 Popup chargé');

let currentTab = 'home';
let currentUser = null;
let shoppingList = [];
let savedRecipes = [];

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔧 Initialisation du popup...');
  await init();
});

async function init() {
  try {
    await loadUser();
    setupTabs();
    setupActionButtons();
    setupSearch();
    setupShoppingList();
    
    // On lance le chargement initial
    await Promise.all([
      loadRecommendations(),
      loadShoppingList()
    ]);
    
    updateGreeting();
    
    // TRACKING: Ouverture de l'extension
    trackBehavior('open_extension', { userId: currentUser.id });
    
    console.log('✅ Popup initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    showError('Connexion au serveur impossible');
  }
}

async function loadRecommendations(forceRefresh = false) {
  const listContainer = document.getElementById('recommendationsList');
  if (!listContainer) return;

  // Animation de chargement
  listContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyse de vos goûts...</p></div>';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get-recommendations',
      userId: currentUser.id,
      force: forceRefresh
    });
    
    if (response.success && response.recommendations) {
      // Normalisation des données pour accepter plusieurs formats de réponse API
      const recipes = response.recommendations.recommendations || response.recommendations;
      
      if (!Array.isArray(recipes) || recipes.length === 0) {
        renderEmptyState(listContainer, '🍳', 'Aucune recommandation', 'Cuisinez davantage pour que l\'IA apprenne !');
      } else {
        displayRecommendations(recipes);
      }
    } else {
      // Gestion spécifique des erreurs 500 ou CORS (vu précédemment)
      throw new Error(response.error || 'Erreur serveur (CORS ou Backend)');
    }
  } catch (error) {
    renderErrorState(listContainer, error.message);
  }
}

// Recherche avec tracking
async function performSearch(query) {
  if (!query.trim()) return;
  
  // TRACKING: Recherche effectuée
  trackBehavior('search_query', { query });

  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Recherche en cours...</p></div>';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'search-semantic',
      query: query
    });
    
    if (response.success && response.results) {
      const recipes = response.results.results || response.results;
      
      if (!Array.isArray(recipes) || recipes.length === 0) {
        renderEmptyState(resultsContainer, '🔍', 'Aucun résultat', 'Essayez avec d\'autres mots-clés');
      } else {
        resultsContainer.innerHTML = `<div class="search-results-list">${recipes.map(createRecipeCard).join('')}</div>`;
        
        // Event listeners pour les boutons de chaque recette
        document.querySelectorAll('.btn-view-recipe').forEach(button => {
          button.addEventListener('click', (e) => {
            const recipeId = e.target.dataset.recipeId;
            viewRecipe(recipeId, 'search_results');
          });
        });
      }
    } else {
      throw new Error(response.error || 'Erreur de recherche');
    }
  } catch (error) {
    renderErrorState(resultsContainer, error.message);
  }
}

//  Ajout d'ingrédients avec tracking
async function addShoppingItem(text) {
  const newItem = {
    id: Date.now(),
    text: text,
    checked: false,
    addedAt: new Date().toISOString()
  };
  
  shoppingList.push(newItem);
  
  // TRACKING: Ajout à la liste
  trackBehavior('add_shopping_item', { item: text });

  await chrome.runtime.sendMessage({
    action: 'add-to-shopping-list',
    item: text,
    userId: currentUser.id
  });
  
  displayShoppingList();
  updateShoppingStats();
}

async function init() {
  try {
    await loadUser();
    setupTabs();
    setupActionButtons();
    setupSearch();
    setupShoppingList();
    
    await loadRecommendations();
    await loadShoppingList();
    updateGreeting();
    
    console.log('✅ Popup initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    showError('Erreur lors de l\'initialisation de l\'extension');
  }
}

async function loadUser() {
  try {
    const result = await chrome.storage.local.get(['currentUser']);
    currentUser = result.currentUser || { id: 1, nom: 'Utilisateur' };
    console.log('👤 Utilisateur chargé:', currentUser);
  } catch (error) {
    console.error('Erreur chargement utilisateur:', error);
    currentUser = { id: 1, nom: 'Utilisateur' };
  }
}

// AMÉLIORATION : Gestion centralisée des clics sur les recettes
function viewRecipe(recipeId, source = 'unknown') {
  // TRACKING: Clic sur une recette
  trackBehavior('view_recipe', { recipeId, source });
  
  chrome.tabs.create({
    url: `http://localhost:5173/recettes/${recipeId}`
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
  const selectedContent = document.getElementById(`${tabName}Tab`);
  
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
  
  currentTab = tabName;
  
  switch(tabName) {
    case 'home':
      loadRecommendations();
      break;
    case 'shopping':
      loadShoppingList();
      break;
  }
}

function setupActionButtons() {
  const quickRecipeBtn = document.getElementById('quickRecipeBtn');
  if (quickRecipeBtn) {
    quickRecipeBtn.addEventListener('click', () => {
      switchTab('search');
      performSearch('recettes rapides moins de 30 minutes');
    });
  }
  
  const surpriseMeBtn = document.getElementById('surpriseMeBtn');
  if (surpriseMeBtn) {
    surpriseMeBtn.addEventListener('click', () => {
      loadRecommendations(true);
    });
  }
  
  const refreshBtn = document.getElementById('refreshRecommendations');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadRecommendations(true);
    });
  }
  
  const openAppBtn = document.getElementById('openWebApp');
  if (openAppBtn) {
    openAppBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5374' });
    });
  }
}

async function loadRecommendations(forceRefresh = false) {
  const listContainer = document.getElementById('recommendationsList');
  if (!listContainer) return;
  
  listContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Chargement des recommandations...</p>
    </div>
  `;
  
  try {
    console.log('📡 Envoi requête recommandations pour userId:', currentUser.id);
    
    const response = await chrome.runtime.sendMessage({
      action: 'get-recommendations',
      userId: currentUser.id
    });
    
    console.log('📨 Réponse reçue:', response);
    
    if (response.success && response.recommendations) {
      const recipes = response.recommendations.recommendations || 
                      response.recommendations.results || 
                      response.recommendations || 
                      [];
      
      console.log('🍽️ Recettes trouvées:', recipes.length);
      
      if (recipes.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🍳</div>
            <p>Aucune recommandation pour le moment</p>
            <small>Commencez à explorer des recettes pour recevoir des suggestions personnalisées !</small>
          </div>
        `;
      } else {
        displayRecommendations(recipes);
      }
    } else {
      throw new Error(response.error || 'Erreur inconnue');
    }
  } catch (error) {
    console.error('❌ Erreur chargement recommandations:', error);
    listContainer.innerHTML = `
      <div class="error-state">
        <p>❌ Impossible de charger les recommandations</p>
        <small>${error.message}</small>
        <button onclick="loadRecommendations()">Réessayer</button>
      </div>
    `;
  }
}

function displayRecommendations(recipes) {
  const listContainer = document.getElementById('recommendationsList');
  if (!listContainer) return;
  
  listContainer.innerHTML = recipes.slice(0, 5).map(recipe => createRecipeCard(recipe)).join('');
  
  // Ajouter les event listeners pour les boutons
  document.querySelectorAll('.btn-view-recipe').forEach(button => {
    button.addEventListener('click', (e) => {
      const recipeId = e.target.dataset.recipeId;
      viewRecipe(recipeId);
    });
  });
}

function createRecipeCard(recipe) {
  const titre = recipe.titre || recipe.title || 'Sans titre';
  const description = recipe.description || '';
  const temps = recipe.tempsPreparation || recipe.temps_preparation || 30;
  const difficulte = recipe.difficulte || recipe.difficulty || 'Moyen';
  const id = recipe.id;
  
  return `
    <div class="recipe-card" data-recipe-id="${id}">
      ${recipe.imageUrl || recipe.image_url ? 
        `<img src="${recipe.imageUrl || recipe.image_url}" alt="${titre}" class="recipe-image">` : 
        ''}
      <div class="recipe-info">
        <h4 class="recipe-title">${titre}</h4>
        <p class="recipe-desc">${truncate(description, 80)}</p>
        <div class="recipe-meta">
          <span class="meta-item">⏱ ${temps}min</span>
          <span class="meta-item">📊 ${difficulte}</span>
        </div>
        <button class="btn-view-recipe" data-recipe-id="${id}">
          Voir la recette
        </button>
      </div>
    </div>
  `;
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const voiceBtn = document.getElementById('voiceSearchBtn');
  
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (e.target.value.length >= 3) {
          performSearch(e.target.value);
        }
      }, 500);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        performSearch(e.target.value);
      }
    });
  }
  
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = chip.textContent;
        performSearch(chip.textContent);
      }
    });
  });
}

async function performSearch(query) {
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Recherche en cours...</p>
    </div>
  `;
  
  try {
    console.log('🔍 Recherche:', query);
    
    const response = await chrome.runtime.sendMessage({
      action: 'search-semantic',
      query: query
    });
    
    console.log('📨 Résultats recherche:', response);
    
    if (response.success && response.results) {
      const recipes = response.results.results || response.results || [];
      
      if (recipes.length === 0) {
        resultsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>Aucun résultat pour "${query}"</p>
            <small>Essayez avec d'autres mots-clés</small>
          </div>
        `;
      } else {
        resultsContainer.innerHTML = `
          <div class="search-results-list">
            ${recipes.map(recipe => createRecipeCard(recipe)).join('')}
          </div>
        `;
        
        // Event listeners pour les boutons
        document.querySelectorAll('.btn-view-recipe').forEach(button => {
          button.addEventListener('click', (e) => {
            const recipeId = e.target.dataset.recipeId;
            viewRecipe(recipeId);
          });
        });
      }
    } else {
      throw new Error(response.error || 'Erreur de recherche');
    }
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    resultsContainer.innerHTML = `
      <div class="error-state">
        <p>❌ Erreur de recherche</p>
        <small>${error.message}</small>
      </div>
    `;
  }
}

function setupShoppingList() {
  const addItemInput = document.getElementById('addItemInput');
  const addItemBtn = document.getElementById('addItemBtn');
  const clearBtn = document.getElementById('clearCheckedBtn');
  
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      const text = addItemInput.value.trim();
      if (text) {
        addShoppingItem(text);
        addItemInput.value = '';
      }
    });
  }
  
  if (addItemInput) {
    addItemInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = e.target.value.trim();
        if (text) {
          addShoppingItem(text);
          e.target.value = '';
        }
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearCheckedItems);
  }
}

async function loadShoppingList() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get-shopping-list',
      userId: currentUser.id
    });
    
    if (response.success) {
      shoppingList = response.shoppingList || [];
      displayShoppingList();
      updateShoppingStats();
    }
  } catch (error) {
    console.error('Erreur chargement liste:', error);
  }
}

function displayShoppingList() {
  const listContainer = document.getElementById('shoppingList');
  if (!listContainer) return;
  
  if (shoppingList.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <p>Votre liste de courses est vide</p>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = shoppingList.map((item, index) => `
    <div class="shopping-item ${item.checked ? 'checked' : ''}" data-index="${index}">
      <input 
        type="checkbox" 
        ${item.checked ? 'checked' : ''} 
        data-index="${index}"
      >
      <span class="item-text">${item.text}</span>
      <button class="delete-btn" data-index="${index}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Event listeners
  document.querySelectorAll('.shopping-item input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      toggleShoppingItem(index);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      deleteShoppingItem(index);
    });
  });
}

async function addShoppingItem(text) {
  const newItem = {
    id: Date.now(),
    text: text,
    checked: false,
    addedAt: new Date().toISOString()
  };
  
  shoppingList.push(newItem);
  
  await chrome.runtime.sendMessage({
    action: 'add-to-shopping-list',
    item: text,
    userId: currentUser.id
  });
  
  displayShoppingList();
  updateShoppingStats();
}

function toggleShoppingItem(index) {
  shoppingList[index].checked = !shoppingList[index].checked;
  displayShoppingList();
  updateShoppingStats();
  saveShoppingList();
}

function deleteShoppingItem(index) {
  shoppingList.splice(index, 1);
  displayShoppingList();
  updateShoppingStats();
  saveShoppingList();
}

function clearCheckedItems() {
  shoppingList = shoppingList.filter(item => !item.checked);
  displayShoppingList();
  updateShoppingStats();
  saveShoppingList();
}

async function saveShoppingList() {
  await chrome.storage.local.set({
    [`shopping_list_${currentUser.id}`]: shoppingList
  });
}

function updateShoppingStats() {
  const totalEl = document.getElementById('totalItems');
  const checkedEl = document.getElementById('checkedItems');
  const badgeEl = document.getElementById('shoppingBadge');
  
  const total = shoppingList.length;
  const checked = shoppingList.filter(item => item.checked).length;
  
  if (totalEl) totalEl.textContent = total;
  if (checkedEl) checkedEl.textContent = checked;
  if (badgeEl) badgeEl.textContent = total;
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Bonjour';
  
  if (hour < 12) greeting = 'Bon matin';
  else if (hour < 18) greeting = 'Bon après-midi';
  else greeting = 'Bonsoir';
  
  const greetingEl = document.getElementById('greetingText');
  if (greetingEl && currentUser) {
    greetingEl.textContent = `${greeting} ${currentUser.nom || ''} !`;
  }
}

function showError(message) {
  const container = document.getElementById('recommendationsList');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <p>❌ ${message}</p>
      </div>
    `;
  }
}

// Fonction pour voir une recette
function viewRecipe(recipeId) {
  chrome.tabs.create({
    url: `http://localhost:5173/recettes/${recipeId}`
  });
}

// --- FONCTIONS UTILITAIRES ---

function renderEmptyState(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <p>${title}</p>
      <small>${sub}</small>
    </div>`;
}

function renderErrorState(container, message) {
  container.innerHTML = `
    <div class="error-state">
      <p>❌ Oups ! Un problème est survenu</p>
      <small style="display:block; margin-bottom:10px;">${message}</small>
      <button class="btn-view-recipe" id="retryBtn">Réessayer</button>
    </div>`;
  
  const btn = container.querySelector('#retryBtn');
  if(btn) btn.onclick = () => loadRecommendations(true);
}

console.log('✅ popup.js chargé et prêt');
