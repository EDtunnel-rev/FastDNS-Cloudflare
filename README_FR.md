# OpenDNS-Cloudflare

## Vue d'ensemble

Ce projet est un serveur DNS entièrement fonctionnel implémenté à l'aide de Cloudflare Workers. Il prend en charge la résolution récursive DNS et gère divers types d'enregistrements DNS, y compris les enregistrements A, AAAA, CNAME, DNAME, MX et TXT. Le serveur fonctionne via DNS over HTTPS (DoH), garantissant que toutes les requêtes et réponses DNS sont chiffrées pour améliorer la sécurité et la confidentialité.

### Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Comment ça marche](#comment-ça-marche)
  - [Résolution DNS récursive](#résolution-dns-récursive)
  - [Types d'enregistrements DNS pris en charge](#types-denregistrements-dns-pris-en-charge)
  - [Construction des requêtes DNS](#construction-des-requêtes-dns)
  - [Analyse des réponses DNS](#analyse-des-réponses-dns)
- [Installation](#installation)
  - [Prérequis](#prérequis)
  - [Configuration](#configuration)
- [Utilisation](#utilisation)
  - [Utilisation de base](#utilisation-de-base)
  - [Requête pour différents types d'enregistrements](#requête-pour-différents-types-denregistrements)
- [Personnalisation](#personnalisation)
  - [Ajouter la prise en charge de nouveaux types d'enregistrements DNS](#ajouter-la-prise-en-charge-de-nouveaux-types-denregistrements-dns)
  - [Modifier la logique de résolution récursive](#modifier-la-logique-de-résolution-récursive)
- [Limites](#limites)
- [Contributions](#contributions)
- [Licence](#licence)

## Fonctionnalités

- **Résolution DNS complète** : Le serveur effectue une résolution DNS récursive, en commençant par les serveurs racine, puis en interrogeant les serveurs de noms à chaque niveau de la hiérarchie DNS pour résoudre le nom de domaine.
- **Prise en charge de plusieurs types d'enregistrements** : Le serveur gère divers types d'enregistrements DNS, notamment les enregistrements A, AAAA, CNAME, DNAME, MX et TXT.
- **Intégration DoH** : Toutes les requêtes DNS sont envoyées via HTTPS à l'aide de DNS over HTTPS (DoH) pour assurer une communication sécurisée et privée.
- **Personnalisable et extensible** : Le code est conçu pour être facilement extensible, permettant l'ajout de nouveaux types d'enregistrements DNS et l'adaptation aux besoins spécifiques.
- **Léger et rapide** : Déployé sur Cloudflare Workers, le serveur offre des performances élevées, une faible latence et une disponibilité mondiale.

## Comment ça marche

### Résolution DNS récursive

Le serveur DNS commence le processus de résolution en interrogeant un serveur DNS racine. Si le serveur racine ne peut pas résoudre directement le nom de domaine (ce qui est généralement le cas), il fournit l'adresse d'un serveur DNS plus spécifique, comme un serveur de noms de domaine de premier niveau (TLD).

Le serveur interroge ensuite le serveur TLD, qui peut soit résoudre la requête, soit pointer vers un serveur DNS faisant autorité. Ce processus se répète de manière récursive jusqu'à ce que le serveur DNS trouve l'enregistrement demandé ou détermine que le nom de domaine n'existe pas.

### Types d'enregistrements DNS pris en charge

Le serveur prend en charge les types d'enregistrements DNS suivants :

- **A** : Associe un nom de domaine à une adresse IPv4.
- **AAAA** : Associe un nom de domaine à une adresse IPv6.
- **CNAME** : Associe un nom de domaine à un autre nom de domaine (nom canonique).
- **DNAME** : Redirige une branche entière d'un espace de noms vers un autre nom de domaine.
- **MX** : Spécifie les serveurs de messagerie pour un nom de domaine.
- **TXT** : Contient des données textuelles arbitraires, souvent utilisées pour la vérification d'e-mails comme SPF, DKIM ou DMARC.

### Construction des requêtes DNS

Les requêtes DNS sont construites au format binaire. Le serveur crée un paquet de requêtes DNS contenant les informations d'en-tête nécessaires et une section de question qui inclut le nom de domaine et le type d'enregistrement demandé.

Le paquet de requête est ensuite encodé en format Base64URL et envoyé via HTTPS à un serveur DoH (dans ce cas, le serveur DoH de Cloudflare).

### Analyse des réponses DNS

Le serveur reçoit une réponse DNS au format binaire et l'analyse. La réponse contient plusieurs sections : la section de question, la section de réponse, la section autoritaire et la section additionnelle.

- **Section de réponse** : Contient les enregistrements qui répondent à la question.
- **Section autoritaire** : Contient les enregistrements qui pointent vers les serveurs DNS faisant autorité.
- **Section additionnelle** : Contient des enregistrements supplémentaires pertinents pour la requête.

Le serveur traite ces sections, extrait et interprète les données et effectue, si nécessaire, des requêtes supplémentaires en utilisant les informations des sections autoritaire et additionnelle.

## Installation

### Prérequis

Avant de déployer ce serveur DNS, assurez-vous de disposer des éléments suivants :

1. **Compte Cloudflare** : Vous avez besoin d'un compte Cloudflare pour déployer des Workers.
2. **Wrangler CLI** : L'outil en ligne de commande de Cloudflare pour gérer les Workers. Vous pouvez l'installer avec npm :
    ```sh
    npm install -g wrangler
    ```

### Configuration

1. **Cloner le dépôt** :
    ```sh
    git clone https://github.com/your-username/cloudflare-workers-dns-server.git
    cd cloudflare-workers-dns-server
    ```

2. **Configurer Wrangler** :
    Exécutez la commande suivante pour configurer Wrangler avec votre compte Cloudflare :
    ```sh
    wrangler login
    ```

3. **Déployer le Worker** :
    Utilisez la commande suivante pour déployer le serveur DNS :
    ```sh
    wrangler publish
    ```

    Après le déploiement, Wrangler fournira une URL à laquelle votre serveur DNS sera accessible.

## Utilisation

### Utilisation de base

Une fois déployé, vous pouvez utiliser le serveur DNS en envoyant une requête HTTP à l'URL fournie. Le serveur attend les paramètres de requête suivants :

- **hostname** : Le nom de domaine à résoudre.
- **type** : Le type d'enregistrement DNS à rechercher (par exemple A, AAAA, CNAME). Si omis, la valeur par défaut est `A`.

#### Exemple :

Pour rechercher l'enregistrement A de `example.com`, vous pouvez envoyer une requête comme suit :

```
https://your-worker.your-domain.com/?hostname=example.com&type=A
```

Le serveur renverra une réponse JSON contenant l'enregistrement DNS.

### Requête pour différents types d'enregistrements

Vous pouvez effectuer une requête pour différents types d'enregistrements en modifiant le paramètre `type` :

- **AAAA** : Obtenir l'adresse IPv6 de `example.com` :
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=AAAA
    ```

- **CNAME** : Obtenir le nom canonique de `www.example.com` :
    ```
    https://your-worker.your-domain.com/?hostname=www.example.com&type=CNAME
    ```

- **MX** : Obtenir les serveurs de messagerie de `example.com` :
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=MX
    ```

- **TXT** : Récupérer les enregistrements TXT de `example.com` :
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=TXT
    ```

## Personnalisation

Ce serveur DNS est conçu pour être facilement personnalisable et extensible.

### Ajouter la prise en charge de nouveaux types d'enregistrements DNS

Si vous devez ajouter la prise en charge de nouveaux types d'enregistrements DNS, vous pouvez le faire en étendant la fonction `dnsTypeToCode` et en mettant à jour la fonction `parseRecordData` pour gérer les nouveaux types d'enregistrements.

#### Exemple :

Pour ajouter la prise en charge des enregistrements `SRV` :

1. Ajoutez le code suivant dans `dnsTypeToCode` :
    ```javascript
    case 'SRV': return 33;
    ```

2. Mettez à jour `parseRecordData` pour traiter les enregistrements `SRV` :
    ```javascript
    case 33: // SRV
        const priority = view.getUint16(offset);
        const weight = view.getUint16(offset + 2);
        const port = view.getUint16(offset + 4);
        const target = parseName(view, offset + 6);
        return { priority, weight, port, target };
    ```

### Modifier la logique de résolution récursive

La logique de résolution récursive est centralisée dans la fonction `resolveDNS`. Si vous avez besoin de modifier la manière dont le serveur traite les requêtes récursives, par exemple en ajoutant un cache personnalisé, en équilibrant la charge entre les serve

urs racine, ou en utilisant un autre mécanisme de sécurité, c'est ici que vous devriez intervenir.

## Limites

- **Performances limitées par Cloudflare Workers** : Bien que les Workers soient rapides et réactifs, ils ont des limites en termes de mémoire et de temps d'exécution, ce qui peut affecter les performances pour les requêtes DNS particulièrement complexes ou volumineuses.
- **Pas de cache intégré** : Par défaut, ce serveur DNS n'implémente pas de mécanisme de mise en cache local, ce qui signifie que chaque requête DNS entraînera une série de requêtes vers les serveurs DNS supérieurs. Vous pouvez ajouter votre propre mécanisme de cache pour améliorer les performances.
- **Aucun support pour les zones inverses (PTR)** : Actuellement, le serveur ne prend pas en charge les enregistrements PTR pour la résolution inverse des adresses IP vers des noms de domaine.

## Contributions

Les contributions à ce projet sont les bienvenues. Si vous avez des suggestions, des corrections, ou souhaitez ajouter de nouvelles fonctionnalités, n'hésitez pas à ouvrir une pull request ou à signaler un problème dans le dépôt GitHub.

## Licence

Ce projet est sous licence MIT. Vous êtes libre d'utiliser, de modifier et de distribuer ce logiciel. Pour plus de détails, veuillez consulter le fichier [LICENSE](LICENSE).

---

Ce README fournit un guide complet pour comprendre, déployer et personnaliser le serveur DNS basé sur Cloudflare Workers. Que vous souhaitiez l'utiliser tel quel ou étendre ses fonctionnalités pour gérer des tâches DNS plus avancées, ce document doit servir de ressource complète.
