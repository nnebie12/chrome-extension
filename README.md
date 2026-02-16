# 🚀 Extension Chrome Recipe AI - Version Corrigée

## ⚡ Installation Rapide

### 1. Charger l'extension dans Chrome

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **"Mode développeur"** (toggle en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `chrome-extension`

### 2. Générer les icônes (IMPORTANT)

Les icônes sont requises pour que l'extension fonctionne :

1. Ouvrez le fichier `create-placeholder-icons.html` dans Chrome
2. Les 3 icônes se téléchargeront automatiquement
3. Déplacez `icon-16.png`, `icon-48.png`, `icon-128.png` dans le dossier `assets/`
4. Rechargez l'extension dans `chrome://extensions/`

### 3. Vérifier que votre API fonctionne

Ouvrez `test-api.html` dans Chrome pour tester la connexion à votre API Spring Boot.

**Si le test échoue** :
- ✅ Vérifiez que votre API tourne sur `http://localhost:8080`
- ✅ Ajoutez CORS dans Spring Boot (voir section ci-dessous)

---

## 🔧 Configuration CORS (Spring Boot)

**IMPORTANT** : Sans CORS, l'extension ne peut pas communiquer avec votre API.

### Option 1 : Configuration globale (Recommandé)

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
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(false);
            }
        };
    }
}
```

### Option 2 : Sur chaque Controller

```java
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {
    // ...
}
```

---

## 🐛 Problèmes courants

### ❌ "Extension tourne dans le vide"

**Diagnostic** :
1. Clic droit sur l'icône de l'extension → **"Inspecter la fenêtre contextuelle"**
2. Regardez la console :

```javascript
// ✅ BON :
🚀 Popup chargé
🔧 Initialisation du popup...
✅ Popup initialisé avec succès

// ❌ ERREUR :
❌ Erreur chargement recommandations: Failed to fetch
```

**Solutions** :
- Vérifiez que l'API est démarrée
- Testez `curl http://localhost:8080/api/v1/recommendations/personalized/1`
- Vérifiez CORS (voir ci-dessus)

### ❌ "Aucune recommandation"

**Causes possibles** :

1. **MongoDB vide** → Ajoutez des interactions/notes
2. **Endpoint inexistant** → Vérifiez votre controller
3. **Format de réponse incorrect** → Voir section ci-dessous

### ❌ "Recherche ne retourne rien"

**Vérifications** :

```sql
-- MySQL : Vérifier qu'il y a des recettes
SELECT COUNT(*) FROM recettes;
```

Si 0 → Importez le fichier CSV

---

## 📊 Format de réponse attendu

### Pour `/api/v1/recommendations/personalized/{userId}` :

```json
{
  "recommendations": [
    {
      "id": 1,
      "titre": "Pâtes Carbonara",
      "description": "Plat italien classique",
      "tempsPreparation": 15,
      "tempsCuisson": 10,
      "difficulte": "FACILE",
      "imageUrl": "https://...",
      "typeRecette": "PLAT"
    }
  ]
}
```

### Pour `/api/v1/nlp/search/semantic` :

```json
{
  "query": "plat léger pour l'été",
  "total_results": 5,
  "results": [
    {
      "id": 1,
      "titre": "Salade grecque",
      "description": "..."
    }
  ]
}
```

---

## 🔍 Débogage avancé

### Voir les logs du Service Worker

1. `chrome://extensions/`
2. Trouvez "Recipe AI Assistant"
3. Cliquez **"Inspecter les vues : service worker"**
4. Logs attendus :

```
🚀 Service Worker démarré
✅ Service Worker prêt
📨 Message reçu: get-recommendations
🔍 Récupération recommandations pour userId: 1
✅ Recommandations reçues: {...}
```

### Tester manuellement depuis la console

```javascript
// Dans la console du popup :
chrome.runtime.sendMessage({
  action: 'get-recommendations',
  userId: 1
}, (response) => {
  console.log('Réponse:', response);
});
```

---

## 📁 Structure des fichiers

```
chrome-extension/
├── manifest.json                      # Configuration de l'extension
├── background/
│   └── service-worker-bundle.js      # ✅ CORRIGÉ - Pas de modules ES6
├── popup/
│   ├── popup.html                     # Interface utilisateur
│   ├── popup.css                      # Styles
│   └── popup.js                       # ✅ CORRIGÉ - Meilleure gestion d'erreurs
├── assets/
│   ├── icon-16.png                    # ⚠️ À générer
│   ├── icon-48.png                    # ⚠️ À générer
│   └── icon-128.png                   # ⚠️ À générer
├── test-api.html                      # 🧪 Page de test
├── create-placeholder-icons.html      # 🎨 Générateur d'icônes
└── DEBUG_GUIDE.md                     # 📖 Guide détaillé
```

---

## ✅ Checklist avant de demander de l'aide

- [ ] API Spring Boot démarre sur `http://localhost:8080`
- [ ] CORS configuré dans Spring Boot
- [ ] Test avec `curl http://localhost:8080/api/v1/recommendations/personalized/1`
- [ ] Icônes générées et placées dans `assets/`
- [ ] Extension chargée dans Chrome (mode développeur)
- [ ] Service Worker actif (logs dans chrome://extensions/)
- [ ] Console popup sans erreurs

---

## 🆘 Besoin d'aide ?

1. **Ouvrez `test-api.html`** pour diagnostiquer
2. **Partagez les logs** :
   - Console du Service Worker
   - Console du Popup
   - Réponse de `curl http://localhost:8080/api/...`

---

## 📝 Changements principaux

| Problème | Avant | Après |
|----------|-------|-------|
| Modules ES6 | `import/export` | ✅ Tout dans un fichier |
| Gestion erreurs | Basique | ✅ Logs détaillés |
| Messages API | Peu clairs | ✅ Indicateurs de chargement |
| CORS | Non documenté | ✅ Instructions claires |

---

**Version corrigée - Février 2026** 🚀
