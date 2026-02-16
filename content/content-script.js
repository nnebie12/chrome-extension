/**
 * CONTENT SCRIPT - Recipe AI Assistant
 * Injecté sur les sites de recettes pour extraire et sauvegarder les recettes
 */

console.log('🔍 Recipe AI Assistant - Content Script actif');

// Configuration des sélecteurs par site
const SITE_CONFIGS = {
  'marmiton.org': {
    titre: 'h1.main-title, h1[class*="title"]',
    description: '.recipe-description, [class*="description"]',
    ingredients: '.ingredient-item, .ingredient, [data-ingredient]',
    etapes: '.recipe-step-list li, .recipe-step, .instruction',
    image: '.recipe-media-viewer-main-picture img, .recipe-image img, [class*="recipe"] img',
    temps: '.recipe-infos__timmings, [class*="time"]',
    difficulte: '.recipe-infos__level, [class*="difficulty"]',
    personnes: '.recipe-infos__quantity, [class*="servings"]'
  },
  '750g.com': {
    titre: 'h1.c-recipe-title, h1',
    description: '.c-recipe-description, [class*="description"]',
    ingredients: '.c-recipe-ingredients li, .ingredient',
    etapes: '.c-recipe-steps li, .step',
    image: '.c-recipe-image img, img[class*="recipe"]'
  },
  'cuisineaz.com': {
    titre: 'h1[itemprop="name"], h1',
    description: '[itemprop="description"]',
    ingredients: '.ingredient, [itemprop="recipeIngredient"]',
    etapes: '.instruction, [itemprop="recipeInstructions"]',
    image: '[itemprop="image"], img[class*="recipe"]'
  }
};

// Détecter si on est sur une page de recette
function isRecipePage() {
  const hostname = window.location.hostname;
  const configKey = Object.keys(SITE_CONFIGS).find(site => hostname.includes(site));
  
  if (!configKey) return false;
  
  const siteConfig = SITE_CONFIGS[configKey];
  return document.querySelector(siteConfig.titre) !== null;
}

// Extraire les données de la recette
function extractRecipeData() {
  const hostname = window.location.hostname;
  const configKey = Object.keys(SITE_CONFIGS).find(site => hostname.includes(site));
  
  if (!configKey) {
    console.warn('⚠️ Site non configuré:', hostname);
    return null;
  }
  
  const config = SITE_CONFIGS[configKey];
  
  try {
    // Titre
    const titreEl = document.querySelector(config.titre);
    const titre = titreEl?.innerText?.trim() || '';
    
    if (!titre) {
      console.warn('⚠️ Titre non trouvé');
      return null;
    }
    
    // Description
    const descEl = document.querySelector(config.description);
    const description = descEl?.innerText?.trim() || '';
    
    // Ingrédients
    const ingredientsEls = document.querySelectorAll(config.ingredients);
    const ingredients = Array.from(ingredientsEls)
      .map(el => ({
        nom: el.innerText.trim(),
        quantite: extractQuantity(el.innerText)
      }))
      .filter(ing => ing.nom);
    
    // Étapes
    const etapesEls = document.querySelectorAll(config.etapes);
    const etapes = Array.from(etapesEls)
      .map((el, idx) => ({
        numero: idx + 1,
        instruction: el.innerText.trim()
      }))
      .filter(step => step.instruction);
    
    // Image
    const imageEl = document.querySelector(config.image);
    const image = imageEl?.src || imageEl?.getAttribute('data-src') || '';
    
    // Métadonnées
    const temps = extractTemps(config.temps);
    const difficulte = extractDifficulte(config.difficulte);
    const personnes = extractPersonnes(config.personnes);
    
    console.log('✅ Recette extraite:', titre);
    
    return {
      titre,
      description,
      ingredients,
      etapes,
      imageUrl: image,
      url: window.location.href,
      source: hostname,
      tempsPreparation: temps.preparation,
      tempsCuisson: temps.cuisson,
      difficulte,
      nombrePersonnes: personnes,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur extraction recette:', error);
    return null;
  }
}

// Extraire quantité d'un texte d'ingrédient
function extractQuantity(text) {
  const match = text.match(/^([\d.,\/\s]+(?:g|kg|ml|cl|l|cuillère|c\.|càc|càs)?)/i);
  return match ? match[1].trim() : '';
}

// Extraire temps
function extractTemps(selector) {
  if (!selector) return { preparation: 0, cuisson: 0 };
  
  const tempsEl = document.querySelector(selector);
  if (!tempsEl) return { preparation: 0, cuisson: 0 };
  
  const text = tempsEl.innerText;
  
  const prepMatch = text.match(/préparation[:\s]*(\d+)/i);
  const cuissonMatch = text.match(/cuisson[:\s]*(\d+)/i);
  
  return {
    preparation: prepMatch ? parseInt(prepMatch[1]) : 0,
    cuisson: cuissonMatch ? parseInt(cuissonMatch[1]) : 0
  };
}

// Extraire difficulté
function extractDifficulte(selector) {
  if (!selector) return 'MOYEN';
  
  const diffEl = document.querySelector(selector);
  if (!diffEl) return 'MOYEN';
  
  const text = diffEl.innerText.toLowerCase();
  
  if (text.includes('facile') || text.includes('très facile')) return 'FACILE';
  if (text.includes('difficile')) return 'DIFFICILE';
  return 'MOYEN';
}

// Extraire nombre de personnes
function extractPersonnes(selector) {
  if (!selector) return 4;
  
  const persEl = document.querySelector(selector);
  if (!persEl) return 4;
  
  const match = persEl.innerText.match(/(\d+)/);
  return match ? parseInt(match[1]) : 4;
}

// Injecter bouton "Sauvegarder" sur la page
function injectSaveButton() {
  // Ne pas injecter si déjà présent
  if (document.getElementById('recipe-ai-save-btn')) return;
  
  const button = document.createElement('button');
  button.id = 'recipe-ai-save-btn';
  button.className = 'recipe-ai-button';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    <span>Sauvegarder dans Recipe AI</span>
  `;
  
  button.addEventListener('click', handleSaveClick);
  
  document.body.appendChild(button);
  console.log('✅ Bouton de sauvegarde ajouté');
}

// Gérer le clic sur "Sauvegarder"
async function handleSaveClick() {
  const button = document.getElementById('recipe-ai-save-btn');
  if (!button) return;
  
  button.disabled = true;
  button.innerHTML = '<span>⏳ Sauvegarde en cours...</span>';
  
  const recipe = extractRecipeData();
  
  if (!recipe) {
    button.innerHTML = '<span>❌ Erreur d\'extraction</span>';
    button.style.background = '#f44336';
    
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Sauvegarder dans Recipe AI</span>';
      button.style.background = '';
    }, 2000);
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'save-recipe',
      recipe: recipe,
      userId: await getUserId()
    });
    
    if (response && response.success) {
      button.innerHTML = '<span>✅ Sauvegardée !</span>';
      button.style.background = '#4CAF50';
      showToast('Recette sauvegardée avec succès !', 'success');
    } else {
      throw new Error(response?.error || 'Erreur inconnue');
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    button.innerHTML = '<span>❌ Erreur</span>';
    button.style.background = '#f44336';
    showToast('Erreur lors de la sauvegarde', 'error');
  }
  
  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Sauvegarder dans Recipe AI</span>';
    button.style.background = '';
  }, 3000);
}

// Récupérer l'ID utilisateur
async function getUserId() {
  try {
    const result = await chrome.storage.local.get(['currentUser']);
    return result.currentUser?.id || 1;
  } catch (error) {
    console.warn('⚠️ Utilisateur non trouvé, utilisation ID par défaut');
    return 1;
  }
}

// Afficher toast notification
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.recipe-ai-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `recipe-ai-toast recipe-ai-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Comparer avec nos recettes (optionnel)
async function compareWithOurRecipes() {
  const currentRecipe = extractRecipeData();
  if (!currentRecipe) return;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'search-semantic',
      query: currentRecipe.titre
    });
    
    if (response && response.success && response.results && response.results.results && response.results.results.length > 0) {
      console.log('💡 Recettes similaires trouvées:', response.results.results.length);
      // On pourrait afficher un bandeau de comparaison ici
    }
  } catch (error) {
    console.debug('Pas de recettes similaires trouvées');
  }
}

// Initialisation
function init() {
  if (isRecipePage()) {
    console.log('📄 Page de recette détectée');
    
    // Injecter bouton de sauvegarde après un délai pour laisser la page se charger
    setTimeout(injectSaveButton, 1000);
    
    // Optionnel : Comparer avec nos recettes
    setTimeout(compareWithOurRecipes, 2000);
  } else {
    console.log('📄 Pas une page de recette');
  }
}

// Observer les changements de page (pour les sites SPA)
const observer = new MutationObserver((mutations) => {
  if (isRecipePage() && !document.getElementById('recipe-ai-save-btn')) {
    init();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Lancer au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Écouter messages du background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract-recipe') {
    const recipe = extractRecipeData();
    sendResponse({ recipe });
  }
  return true;
});

console.log('✅ Content Script initialisé');
