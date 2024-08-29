

# FastDNS-Cloudflare, Service Avancé de Résolution DNS

## Vue d'ensemble

Ce dépôt contient un service avancé de résolution DNS conçu pour fonctionner sur Cloudflare Workers. Ce service est capable de requêter des enregistrements DNS auprès de plusieurs fournisseurs DNS (Cloudflare, Google DNS, OpenDNS), de sélectionner le résultat le plus fiable grâce à un mécanisme de consensus, et de mettre en cache les résultats à l'aide d'une stratégie de cache LRU. De plus, il inclut des limitations de taux de requêtes, une journalisation détaillée, et la collecte de statistiques, le tout sans nécessiter de stockage persistant comme KV ou Durable Objects.

## Fonctionnalités

### 1. Résolution DNS Multi-Fournisseur
Le service interroge trois grands fournisseurs DNS :
- **Cloudflare DNS** (1.1.1.1)
- **Google DNS** (8.8.8.8)
- **OpenDNS** (208.67.222.222)

Le service retourne immédiatement le résultat le plus rapide pour garantir une faible latence. Ensuite, il attend les deux autres réponses pendant 1 seconde, vérifie la cohérence des résultats, et réévalue en cas de divergences. Le résultat final, le plus fiable, est ensuite mis en cache et retourné au client.

### 2. Cache LRU (Least Recently Used)
Un cache LRU personnalisé en mémoire est implémenté pour stocker les résultats des requêtes DNS. Le cache peut contenir jusqu'à 1000 entrées par défaut, assurant que les données les plus fréquemment consultées sont disponibles sans nécessiter de nouvelles requêtes aux fournisseurs DNS. Le mécanisme LRU supprime automatiquement les entrées les moins consultées pour faire de la place aux nouvelles.

### 3. Limitation du Taux de Requêtes
Pour prévenir les abus, le service inclut un limiteur de taux de requêtes qui restreint chaque adresse IP à un maximum de 60 requêtes par minute. Les requêtes dépassant cette limite reçoivent un code HTTP 429 ("Trop de requêtes").

### 4. Filtrage d'IP
Le service peut restreindre l'accès en fonction de l'adresse IP du client. Par défaut, il n'autorise que certaines plages d'IP spécifiques à interagir avec le service. Cette configuration peut être facilement adaptée pour répondre à différents besoins de sécurité.

### 5. Journalisation et Statistiques Détaillées
Chaque requête est enregistrée avec des détails tels que l'adresse IP du client, le nom DNS interrogé, le type d'enregistrement et le résultat retourné. De plus, des statistiques pour chaque fournisseur DNS, comme le nombre de requêtes, le taux de succès, le taux d'échec et le temps de réponse moyen, sont collectées et peuvent être consultées via un point de terminaison API dédié.

### 6. TTL Configurable
Le temps de vie (TTL) des entrées du cache est configurable, permettant aux utilisateurs de contrôler la durée pendant laquelle les résultats DNS sont conservés en cache avant leur expiration. Le TTL par défaut est fixé à 3600 secondes (1 heure).

### 7. Gestion des Erreurs
Le service est robuste avec une gestion détaillée des erreurs. Si un fournisseur DNS échoue à répondre ou retourne une erreur, le service gère cette erreur avec élégance en réessayant la requête jusqu'à trois fois. En cas de divergences persistantes entre les différents fournisseurs, le service choisit par défaut de faire confiance au résultat de Cloudflare.

## Architecture

Le service de résolution DNS est conçu pour la performance, la fiabilité et l'évolutivité. Voici une répartition des composants clés :

### Cache LRU
Le cache LRU est implémenté comme une liste doublement chaînée combinée à une table de hachage. Cette conception permet une complexité temporelle de O(1) pour les insertions et les recherches. Lorsque le cache atteint sa taille maximale, l'entrée la moins consultée récemment est supprimée pour faire de la place aux nouvelles entrées.

### Limiteur de Taux
Le limiteur de taux suit les requêtes par adresse IP dans une fenêtre temporelle glissante (60 secondes par défaut). Il s'assure que les clients respectent les limites de taux définies et empêche les abus en limitant le nombre de requêtes autorisées par minute.

### Résolution DNS et Mécanisme de Consensus
Le service envoie des requêtes DNS concurrentes aux trois fournisseurs DNS. Le premier résultat est immédiatement retourné à l'utilisateur pour la rapidité. Ensuite, dans un délai de 1 seconde, le service évalue les autres réponses pour vérifier leur cohérence. Si les réponses diffèrent, le service réinterroge les fournisseurs DNS et cherche un consensus (c'est-à-dire au moins deux fournisseurs sur trois sont d'accord). En cas de divergences persistantes, le service se base sur le résultat de Cloudflare.

### Journalisation et Statistiques
Les journaux et les statistiques sont stockés en mémoire et peuvent être consultés via un point de terminaison dédié. Cela permet une surveillance en temps réel des performances et des modèles d'utilisation du service.

## Démarrage Rapide

### Prérequis

Avant de configurer le service de résolution DNS, vous avez besoin de :
- Un compte Cloudflare Workers
- Une connaissance de base en JavaScript et des requêtes HTTP

### Configuration

1. **Cloner le Dépôt**

   Clonez le dépôt sur votre machine locale en utilisant Git :
   ```bash
   git clone https://github.com/yourusername/dns-resolver-worker.git
   cd dns-resolver-worker
   ```

2. **Déployer sur Cloudflare Workers**

   Vous devez déployer le service sur Cloudflare Workers. Cela nécessite la configuration d'un compte Cloudflare et la configuration de l'environnement Workers.

   ```bash
   wrangler login
   wrangler init
   wrangler publish
   ```

3. **Configurer les Variables d'Environnement**

   Le service de résolution DNS ne nécessite pas de stockage persistant comme KV, mais vous pouvez le configurer via des variables d'environnement si nécessaire. Modifiez le fichier `wrangler.toml` pour définir ces variables :

   ```toml
   name = "dns-resolver-worker"
   type = "javascript"

   account_id = "votre-id-compte"
   workers_dev = true
   compatibility_date = "2023-08-01"
   ```

   Vous pouvez ajouter des configurations supplémentaires ici, comme la personnalisation du TTL, l'ajustement de la taille du cache ou la définition des limites de taux.

4. **Personnaliser le Filtrage d'IP et les Limites de Taux**

   Pour personnaliser le filtrage d'IP ou les limites de taux, vous pouvez directement éditer les classes `isAllowedIP` et `RateLimiter` dans le fichier `index.js`. Ajustez les plages d'IP ou les limites de requêtes pour répondre à vos besoins de sécurité.

### Utilisation

#### Interroger des Enregistrements DNS

Vous pouvez interroger des enregistrements DNS en faisant une requête HTTP GET à votre Cloudflare Worker avec les paramètres suivants :

- `name` : Le nom de domaine à interroger.
- `type` : Le type d'enregistrement DNS (A, AAAA, CNAME, MX, etc.).
- `format` : Le format de la réponse (json ou text). Le format par défaut est `json`.
- `ttl` : (Optionnel) Temps de vie pour l'entrée du cache en secondes.

**Exemple de Requête :**
```bash
curl "https://votre-url-worker.workers.dev?name=example.com&type=A&format=json"
```

**Exemple de Réponse :**
```json
{
  "Status": 0,
  "TC": false,
  "RD": true,
  "RA": true,
  "AD": false,
  "CD": false,
  "Question": [
    {
      "name": "example.com.",
      "type": 1
    }
  ],
  "Answer": [
    {
      "name": "example.com.",
      "type": 1,
      "TTL": 3599,
      "data": "93.184.216.34"
    }
  ]
}
```

#### Accéder aux Statistiques

Pour consulter les statistiques des requêtes DNS en temps réel, accédez au point de terminaison suivant :

```bash
curl "https://votre-url-worker.workers.dev/stats"
```

Cela retournera un objet JSON avec les statistiques pour chaque fournisseur DNS, incluant le nombre de requêtes, le taux de succès, les échecs et le temps de réponse moyen.

### Modifier le Service

Le service est conçu pour être facilement extensible. Voici quelques exemples de modifications courantes :

#### 1. Ajuster la Taille du Cache

Si vous avez besoin d'ajuster la taille du cache au-delà des 1000 entrées par défaut, modifiez l'initialisation de `LRUCache` dans `index.js` :

```javascript
const dnsCache = new LRUCache(2000); // Augmenter la taille du cache à 2000 entrées
```

#### 2. Personnaliser les Limites de Taux

Pour changer les paramètres de limitation de taux, modifiez l'initialisation de la classe `RateLimiter` :

```javascript
const rateLimiter = new RateLimiter(100, 60000);

 // Autoriser 100 requêtes par minute par IP
```

#### 3. Ajouter la Prise en Charge de Plus de Fournisseurs DNS

Vous pouvez ajouter la prise en charge de fournisseurs DNS supplémentaires en étendant la fonction `fetchDNSFromService`. Il suffit d'ajouter l'URL de requête du fournisseur DNS et de mettre à jour l'appel `Promise.allSettled` pour inclure le nouveau fournisseur.

#### 4. Stockage Persistant avec KV

Si vous avez besoin de stockage persistant pour le cache ou les journaux, vous pouvez modifier le service pour utiliser Cloudflare KV. Cela nécessiterait de changer les mécanismes de cache et de journalisation pour stocker et récupérer les données depuis KV, plutôt que de se fier uniquement au stockage en mémoire.

### Considérations de Performance

#### Latence

Le service de résolution DNS est optimisé pour une faible latence en retournant immédiatement le premier résultat disponible. D'autres optimisations incluent l'utilisation d'un cache LRU pour éviter les requêtes redondantes et réduire la charge sur les fournisseurs DNS.

#### Débit

Étant donné les limites de taux et les mécanismes de cache, le service est capable de gérer un grand volume de requêtes tout en prévenant les abus et en assurant une performance fiable. Le stockage en mémoire garantit un accès rapide, bien qu'il soit soumis aux limites de l'environnement d'exécution des Workers.

#### Tolérance aux Pannes

Le service est conçu pour être tolérant aux pannes. Si un fournisseur DNS ne répond pas, le service gère l'erreur avec élégance, réessaye la requête, et retourne finalement le résultat le plus fiable. En utilisant plusieurs fournisseurs DNS et un mécanisme de consensus, le service assure une précision et une fiabilité maximales.

### Sécurité

#### Filtrage d'IP

Le service inclut un filtrage d'IP pour restreindre l'accès en fonction de plages d'IP prédéfinies. Cela peut être modifié pour inclure ou exclure des IP spécifiques selon les besoins. Le filtrage d'IP est crucial pour empêcher l'accès non autorisé et garantir que seuls les clients de confiance puissent utiliser le service de résolution DNS.

#### Limitation de Taux

La limitation de taux est une autre fonction de sécurité clé qui empêche les abus en limitant le nombre de requêtes qu'une seule adresse IP peut envoyer dans un laps de temps donné. Cela aide à protéger le service contre les attaques DDoS et garantit une utilisation équitable pour tous les clients.

#### Enforcement HTTPS

Comme le service est déployé sur Cloudflare Workers, toutes les requêtes sont gérées par HTTPS par défaut, garantissant que les requêtes et les réponses DNS sont cryptées pendant leur transit. Cela est essentiel pour maintenir l'intégrité et la confidentialité des requêtes DNS.

### Dépannage

Si vous rencontrez des problèmes avec le service de résolution DNS, voici quelques étapes à suivre :

#### Vérifiez les Journaux

Les journaux peuvent fournir des informations précieuses sur le fonctionnement du service, y compris les erreurs potentielles. Ces journaux sont imprimés dans la console et peuvent être consultés via le tableau de bord Cloudflare Workers.

#### Revoir les Limites de Taux

Si des requêtes sont bloquées, assurez-vous que les limites de taux sont correctement définies et que votre adresse IP ne dépasse pas le nombre de requêtes autorisées par minute.

#### Déboguer les Problèmes de Cache

Si le service retourne des résultats périmés ou inattendus, envisagez de vider le cache ou d'ajuster les paramètres TTL. Le cache peut être vidé en redéployant le service ou en modifiant la taille du cache pour invalider temporairement les anciennes entrées.

#### Surveiller l'État des Fournisseurs DNS

Si un fournisseur DNS échoue de manière répétée, cela peut être dû à des problèmes avec le fournisseur lui-même. Envisagez de désactiver temporairement le fournisseur problématique ou d'ajuster le mécanisme de consensus pour favoriser les fournisseurs plus fiables.

### Améliorations Futures

Bien que le service soit pleinement fonctionnel, plusieurs améliorations peuvent être envisagées à l'avenir :

#### 1. Prise en Charge de Plus de Types d'Enregistrements DNS
Élargir le service pour prendre en charge une gamme plus large de types d'enregistrements DNS, tels que SRV, TXT, et les enregistrements liés à DNSSEC, augmenterait sa polyvalence.

#### 2. Intégration avec d'Autres Services Cloudflare
L'intégration avec d'autres services Cloudflare, tels que Durable Objects ou Web Analytics, pourrait fournir des capacités supplémentaires, comme des journaux de requêtes détaillés ou un stockage persistant.

#### 3. Répartition de Charge Globale
La mise en œuvre d'une répartition de charge globale à travers plusieurs centres de données Cloudflare pourrait encore améliorer la performance et la fiabilité en routant les requêtes DNS vers le centre de données le plus proche ou le plus rapide.

### Contribution

Les contributions au service de résolution DNS sont les bienvenues ! Que vous souhaitiez signaler des bugs, proposer de nouvelles fonctionnalités, ou soumettre des pull requests, votre participation est précieuse. Veuillez suivre les directives ci-dessous pour contribuer :

1. **Forker le Dépôt**

   Forkez le dépôt sur GitHub et clonez-le sur votre machine locale.

   ```bash
   git clone https://github.com/yourusername/dns-resolver-worker.git
   ```

2. **Créer une Branche de Fonctionnalité**

   Créez une nouvelle branche pour votre fonctionnalité ou correction de bug.

   ```bash
   git checkout -b feature/nouvelle-fonctionnalité
   ```

3. **Committer les Changements**

   Apportez vos modifications, puis validez-les avec un message clair et concis.

   ```bash
   git commit -m "Ajout de la prise en charge des enregistrements SRV"
   ```

4. **Soumettre une Pull Request**

   Poussez vos changements sur GitHub et soumettez une pull request. Incluez une description des modifications que vous avez apportées et pourquoi elles sont nécessaires.

### Licence

Ce projet est sous licence MIT. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

### Remerciements

Merci à l'équipe de Cloudflare Workers pour avoir fourni une plateforme puissante qui permet de créer des applications sans serveur avec facilité.

---

Ce fichier README fournit une vue d'ensemble complète et des instructions détaillées sur la configuration, l'utilisation et la contribution au service de résolution DNS. Le document couvre tous les aspects clés du service et devrait guider les utilisateurs tout au long du processus, depuis la configuration initiale jusqu'à la personnalisation avancée et au dépannage.

