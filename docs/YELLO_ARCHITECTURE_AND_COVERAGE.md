# Yello Pro : architecture et couverture

## Séparation
Dépôt yello-pro.com, projet Vercel propre, base Supabase et clés Stripe propres. Aucune donnée ni configuration MG Pro ne doit être copiée. La migration 007 impose le workspace sur chaque objet. Les factures SaaS sont distinctes des factures clients.

## Organisation cible
- Aujourd’hui : accueil, boîte de réception, notifications et recherche.
- Travail : projets, tâches, calendrier, santé des projets, décisions et journal.
- Commercial : clients, contacts, visites, devis, contrats et portail client.
- Finance : factures, paiements, dépenses, achats et comptabilité.
- Ressources : fichiers, notes, catalogue, équipe et feuilles de temps.
- Entreprise : réglages et abonnement.
Chaque projet donne des vues contextuelles : ne pas répéter les mêmes panneaux dans tous ses onglets. Sur téléphone : barre de cinq raccourcis, menu complet dans la même fenêtre, cartes sans débordement.

## Comparaison documentée, sans promesse de parité non vérifiée
Sources : https://support.atlassian.com/trello/docs/using-trello/ ; https://support.atlassian.com/trello/docs/automation-overview/ ; https://www.notion.com/help/views-filters-and-sorts ; https://www.notion.com/help/tasks-and-dependencies

| Capacité | État de cette reprise | Validation restante |
|---|---|---|
| Projets, tâches, calendriers et filtres | Source MG conservée | Recette Yello multi-entreprises |
| Visites, photos, notes vocales, devis et contrats | Source MG conservée | Recette de chaque parcours |
| Portail client et permissions | Source MG conservée + isolation entreprise | Deux entreprises et quatre comptes distincts |
| Abonnement progressif | Catalogue + interface + endpoint Stripe | Configuration Stripe, webhook et paiement sandbox |
| Vues Trello et Notion | Tableau, liste et échéances de tâches ajoutés ; filtre responsable, tri et recherche | Chronologie, galerie et vues enregistrées |
| Listes de contrôle, étiquettes et dépendances | Ajoutés ; validation anti-boucle et même projet | Sous-tâches hiérarchiques, champs personnalisés et modèles |
| Automatisation par déclencheurs et actions | Routines MG conservées | Éditeur de règles complet et historique |
| Notes en blocs, recherche et liens entre documents | À approfondir | Éditeur et permissions |
| Migration/import/export | Données MG non copiées | Import explicite et contrôles |

## Conditions de lancement commercial
Configurer une nouvelle base avec migrations 001 à 007, puis YELLO_DATABASE_READY=true. Configurer Stripe avec quatre offres mensuelles/annuelles et un webhook signé. Ne pas activer la vente sans ces contrôles, une recette d’isolation et une validation mobile. Ne jamais annoncer tous les outils Trello/Notion comme disponibles avant la recette.

## 8 octobre : espace vierge et continuité
Aucun dossier de démonstration prérempli. La navigation globale passe par une bille jaune ouvrant la fenêtre de tous les outils. L’historique affiche les versions avant/après aux administrateurs autorisés. Les rafraîchissements sont sérialisés, sans cache, au retour de visibilité/connexion et toutes les cinq secondes ; une réponse ancienne ne remplace pas une version plus récente. Ce mécanisme nécessite la base réelle : le mode aperçu reste temporaire et ne simule pas de sauvegarde cloud.

La console propriétaire liste entreprises, comptes et offres. YELLO_PLATFORM_ADMIN_IDS contient uniquement les UUID Auth du propriétaire vérifié ; ce rôle permet de tester tous les outils sans les limites de création par abonnement. Il ne désactive ni les contrôles de sécurité, ni les limites techniques de stockage. Ne jamais exposer ce privilège à un administrateur client.
