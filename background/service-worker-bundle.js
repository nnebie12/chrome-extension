/**
 * SERVICE WORKER - Version compatible sans ES6 modules
 * Toutes les classes sont intégrées directement
 */

console.log('🚀 Service Worker démarré');

// ==================== API CLIENT ====================
class APIClient {
  constructor(baseURL = 'http://localhost:8080/api/') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async setToken(token) {
    this.token = token;
    await chrome.storage.local.set({ authToken: token });
  }

  async getToken() {
    if (this.token) return this.token;
    const result = await chrome.storage.local.get(['authToken']);
    this.token = result.authToken || null;
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// ==================== STORAGE MANAGER ====================
class StorageManager {
  async get(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  async getCurrentUser() {
    return this.get('currentUser');
  }

  async getShoppingList(userId) {
    const key = `shopping_list_${userId}`;
    return this.get(key) || [];
  }

  async setShoppingList(list, userId) {
    const key = `shopping_list_${userId}`;
    await this.set(key, list);
  }
}

// ==================== NOTIFICATION MANAGER ====================
class NotificationManager {
  show(options) {
    const notificationOptions = {
      type: 'basic',
      iconUrl: options.iconUrl || chrome.runtime.getURL('assets/icon-128.png'),
      title: options.title || 'Recipe AI',
      message: options.message || '',
      priority: 2
    };

    if (options.buttons) {
      notificationOptions.buttons = options.buttons;
    }

    chrome.notifications.create(
      options.id || `notification_${Date.now()}`,
      notificationOptions
    );
  }
}

// ==================== INITIALISATION ====================
const API_BASE_URL = 'http://localhost:8080/api/';
const api = new APIClient(API_BASE_URL);
const storage = new StorageManager();
const notifications = new NotificationManager();

// ==================== INSTALLATION ====================
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('🎉 Extension installée');
    
    // Créer menu contextuel
    chrome.contextMenus.create({
      id: 'save-to-shopping-list',
      title: 'Ajouter à ma liste de courses',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'find-recipes',
      title: 'Trouver des recettes avec "%s"',
      contexts: ['selection']
    });
    
    // Configurer alarmes
    setupNotificationAlarms();
  }
});

// ==================== MENU CONTEXTUEL ====================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText;
  
  if (info.menuItemId === 'save-to-shopping-list') {
    await addToShoppingList(selectedText);
    notifications.show({
      title: '✓ Ajouté à la liste',
      message: `"${selectedText}" ajouté à votre liste de courses`
    });
  }
  
  if (info.menuItemId === 'find-recipes') {
    await searchRecipes(selectedText);
  }
});

// ==================== ALARMES ====================
function setupNotificationAlarms() {
  chrome.alarms.create('lunch-reminder', {
    when: getNextAlarmTime(12, 0),
    periodInMinutes: 1440
  });
  
  chrome.alarms.create('dinner-reminder', {
    when: getNextAlarmTime(19, 0),
    periodInMinutes: 1440
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const user = await storage.getCurrentUser();
  if (!user) return;
  
  if (alarm.name === 'lunch-reminder' || alarm.name === 'dinner-reminder') {
    await sendMealRecommendation(user.id, alarm.name.includes('lunch') ? 'dejeuner' : 'diner');
  }
});

async function sendMealRecommendation(userId, mealType) {
  try {
    const response = await api.get(`v1/recommendations/personalized/${userId}`);
    const recommendations = response.recommendations || [];
    
    if (recommendations.length > 0) {
      const recipe = recommendations[0];
      notifications.show({
        title: `🍽️ Suggestion pour votre ${mealType}`,
        message: recipe.titre || recipe.title || 'Nouvelle recette disponible'
      });
    }
  } catch (error) {
    console.error('Erreur recommandation:', error);
  }
}

function getNextAlarmTime(hour, minute) {
  const now = new Date();
  const alarm = new Date();
  alarm.setHours(hour, minute, 0, 0);
  
  if (alarm <= now) {
    alarm.setDate(alarm.getDate() + 1);
  }
  
  return alarm.getTime();
}

// ==================== MESSAGES ====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      console.log('📨 Message reçu:', request.action);
      
      switch (request.action) {
        case 'get-recommendations': {
          console.log('🔍 Récupération recommandations pour userId:', request.userId);
          const recommendations = await api.get(`v1/recommendations/personalized/${request.userId}`);
          console.log('✅ Recommandations reçues:', recommendations);
          sendResponse({ success: true, recommendations });
          break;
        }
          
        case 'search-semantic': {
          console.log('🔍 Recherche sémantique:', request.query);
          const results = await api.post('v1/nlp/search/semantic', {
            query: request.query
          });
          console.log('✅ Résultats recherche:', results);
          sendResponse({ success: true, results });
          break;
        }
          
        case 'get-shopping-list': {
          const shoppingList = await storage.getShoppingList(request.userId);
          sendResponse({ success: true, shoppingList });
          break;
        }
          
        case 'add-to-shopping-list': {
          await addToShoppingList(request.item, request.userId);
          sendResponse({ success: true });
          break;
        }

        case 'save-recipe': {
          await saveRecipe(request.recipe, request.userId);
          sendResponse({ success: true });
          break;
        }
          
        default:
          console.warn('⚠️ Action inconnue:', request.action);
          sendResponse({ success: false, error: 'Action inconnue' });
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Réponse asynchrone
});

// ==================== FONCTIONS UTILITAIRES ====================
async function addToShoppingList(item, userId) {
  const user = userId || (await storage.getCurrentUser())?.id;
  if (!user) {
    console.error('Aucun utilisateur connecté');
    return;
  }

  const currentList = await storage.getShoppingList(user) || [];
  
  currentList.push({
    id: Date.now(),
    text: item,
    checked: false,
    addedAt: new Date().toISOString()
  });
  
  await storage.setShoppingList(currentList, user);
  console.log('✅ Item ajouté à la liste de courses');
}

async function searchRecipes(query) {
  try {
    const results = await api.post('v1/nlp/search/semantic', { query });
    await storage.set('last_search', { query, results: results.results });
    chrome.action.openPopup();
  } catch (error) {
    console.error('Erreur recherche:', error);
  }
}

async function saveRecipe(recipe, userId) {
  try {
    await api.post('v1/recettes/import-externe', {
      ...recipe,
      userId
    });
    
    notifications.show({
      title: '✓ Recette sauvegardée',
      message: recipe.titre
    });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    throw error;
  }
}

console.log('✅ Service Worker prêt');
