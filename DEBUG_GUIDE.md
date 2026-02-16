# 🔧 GUIDE DE DÉBOGAGE - Extension Recipe AI

## ✅ Changements effectués

### 1. **Service Worker corrigé**
- ❌ **Avant** : Utilisation de modules ES6 (`import/export`) non supportés
- ✅ **Après** : Toutes les classes intégrées dans un seul fichier `service-worker-bundle.js`

### 2. **Manifest.json corrigé**
- Référence correcte au service worker
- Configuration des permissions optimisée

### 3. **Popup.js amélioré**
- Meilleure gestion d'erreurs avec logs détaillés
- Messages d'erreur explicites pour l'utilisateur

## 🚀 Installation

### Étape 1 : Charger l'extension

1. Ouvrir Chrome → `chrome://extensions/`
2. Activer "Mode développeur" (en haut à droite)
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `chrome-extension/`

### Étape 2 : Vérifier le Service Worker

1. Sur `chrome://extensions/`, trouver "Recipe AI Assistant"
2. Cliquer sur "Détails"
3. Cliquer sur "Inspecter les vues : service worker"
4. Dans la console, vous devriez voir :
   ```
   🚀 Service Worker démarré
   ✅ Service Worker prêt
   ```

### Étape 3 : Tester la page de diagnostic

1. Ouvrir le fichier `test-api.html` dans Chrome
2. La page testera automatiquement la connexion à votre API
3. Si erreur "Failed to fetch" :
   - ✅ Vérifier que votre API Spring Boot tourne sur `http://localhost:8080`
   - ✅ Vérifier CORS dans votre application Spring Boot

## 🐛 Problèmes courants

### ❌ Problème 1 : "Extension tourne dans le vide"

**Cause** : Le service worker ne démarre pas

**Solution** :
```bash
# 1. Ouvrir chrome://extensions/
# 2. Retirer l'extension
# 3. Recharger l'extension
# 4. Vérifier les logs du service worker
```

### ❌ Problème 2 : "Erreur de connexion à l'API"

**Cause** : API non accessible ou CORS

**Solution dans Spring Boot** :
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE")
                        .allowedHeaders("*");
            }
        };
    }
}
```

**Ou ajouter sur vos controllers** :
```java
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {
    // ...
}
```

### ❌ Problème 3 : "Aucune recommandation"

**Diagnostic** :

1. Ouvrir le popup de l'extension
2. Clic droit → "Inspecter"
3. Vérifier la console :

```javascript
// ✅ Bon signe :
📡 Envoi requête recommandations pour userId: 1
📨 Réponse reçue: {success: true, recommendations: {...}}
🍽️ Recettes trouvées: 5

// ❌ Problème :
❌ Erreur chargement recommandations: TypeError...
```

**Solutions** :

```bash
# A. Tester manuellement l'API :
curl http://localhost:8080/api/v1/recommendations/personalized/1

# B. Si l'endpoint n'existe pas, vérifier votre controller
# C. Si données vides, vérifier MongoDB
```

### ❌ Problème 4 : "Recherche ne retourne rien"

**Vérifications** :

1. **Base de données MySQL vide ?**
```sql
SELECT COUNT(*) FROM recettes;
```

Si 0 → Importer le CSV d'abord

2. **Service ML Python hors ligne ?**
```bash
# Vérifier si le service tourne
curl http://localhost:8000/search/semantic \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}'
```

Si erreur → Démarrer le service Python

## 📊 Vérifications système

### ✅ Checklist complète

- [ ] API Spring Boot démarre sur `http://localhost:8080`
- [ ] Endpoint `/api/v1/recommendations/personalized/1` accessible
- [ ] Endpoint `/api/v1/nlp/search/semantic` accessible
- [ ] CORS configuré dans Spring Boot
- [ ] MongoDB contient des données (collections : interactions, notes, etc.)
- [ ] MySQL contient des recettes (table `recettes`)
- [ ] Service ML Python démarre (optionnel pour NLP)
- [ ] Extension chargée dans Chrome
- [ ] Service Worker actif (voir logs dans chrome://extensions/)
- [ ] Aucune erreur dans la console du popup

## 🔍 Logs de débogage

### A. Service Worker
```bash
chrome://extensions/
→ Détails de "Recipe AI Assistant"
→ Inspecter les vues : service worker
```

**Logs attendus** :
```
🚀 Service Worker démarré
✅ Service Worker prêt
📨 Message reçu: get-recommendations
🔍 Récupération recommandations pour userId: 1
✅ Recommandations reçues: {...}
```

### B. Popup
```bash
# Clic droit sur l'icône extension → Inspecter la fenêtre contextuelle
```

**Logs attendus** :
```
🚀 Popup chargé
🔧 Initialisation du popup...
👤 Utilisateur chargé: {id: 1, nom: "Utilisateur"}
✅ Popup initialisé avec succès
📡 Envoi requête recommandations...
📨 Réponse reçue: {...}
🍽️ Recettes trouvées: 5
```

## 🆘 Support avancé

### Réinitialiser l'extension

```javascript
// Exécuter dans la console du popup :
chrome.storage.local.clear(() => {
  console.log('✅ Storage nettoyé');
  location.reload();
});
```

### Tester manuellement l'API

```javascript
// Exécuter dans la console du popup :
chrome.runtime.sendMessage({
  action: 'get-recommendations',
  userId: 1
}, (response) => {
  console.log('Réponse:', response);
});
```

### Forcer le rechargement du Service Worker

```bash
# 1. chrome://extensions/
# 2. Bouton "Recharger" sous Recipe AI Assistant
# 3. Vérifier les nouveaux logs
```

## 📝 Résumé des fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `manifest.json` | Référence corrigée au service worker |
| `background/service-worker-bundle.js` | **NOUVEAU** - Tout-en-un sans modules ES6 |
| `popup/popup.js` | Meilleure gestion d'erreurs + logs |
| `test-api.html` | **NOUVEAU** - Page de diagnostic |

## 🎯 Prochaines étapes si ça ne fonctionne toujours pas

1. **Partager les logs** :
   - Screenshot console Service Worker
   - Screenshot console Popup
   - Réponse de `curl http://localhost:8080/api/v1/recommendations/personalized/1`

2. **Vérifier structure API** :
   - Format exact de la réponse JSON
   - Présence des champs `recommendations`, `results`, etc.

3. **Test minimal** :
```javascript
// Dans la console du popup :
fetch('http://localhost:8080/api/v1/recommendations/personalized/1')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

**Besoin d'aide ?** Partage les logs et on débuggera ensemble ! 🚀
