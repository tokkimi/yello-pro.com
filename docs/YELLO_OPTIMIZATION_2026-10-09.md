# Optimisation Yello Pro — 9 octobre 2026

## Comparaison ciblée
Sources officielles consultées :
- Trello : https://trello.com/views — vues tableau, chronologie, calendrier et tableau de bord.
- Notion : https://www.notion.com/en-GB/product/projects — projets, dépendances et formulaires liés.
- Billdr : https://www.billdr.ai/features — coûts, planification, équipe et suivi chantier.

La présence de composants ne prouve pas la parité fonctionnelle. Yello possède déjà les visites, croquis, notes vocales, devis, contrats, finances, tâches et portail client. La recette métier multi-entreprises et les intégrations externes restent à vérifier avant toute promesse commerciale de parité complète.

## Changements de cette livraison
- Recherche dans le menu existant : outils et dossiers chargés avec leurs relations client/projet, numéro de document, recherche sans accents, résultats limités à douze. Pas d'index local persistant ni d'indexation des notes privées.
- Ctrl/Cmd+K ouvre la recherche lorsqu'aucune autre modale n'est ouverte.
- Chargement à la demande du plan de projet, de l'éditeur de plan, du studio de devis, du carnet manuscrit et de la console propriétaire. Les fonctionnalités restent disponibles.
- Perspective progressive du visuel tablette au défilement sur les navigateurs compatibles ; repli statique sur les autres, aucune modification du défilement natif.
- Reflets sur les boutons jaunes, menu blanc translucide et animations courtes. Respect de prefers-reduced-motion. Aucun cadre ajouté au visuel tablette.

## Références visuelles, implémentation originale
- https://21st.dev/@manuarora700/components/container-scroll-animation
- https://21st.dev/@jahed/components/apple-tahoe-liquid-glass-button
Prévisualisations consultées. Aucun prompt copié, aucun code tiers repris, aucune dépendance ajoutée. Deux crédits de copie disponibles au moment de la consultation.

## Priorités suivantes
1. Recette isolée de deux entreprises : fichiers, devis, portail et historique, sans données fictives en production.
2. Mesurer les temps de réponse et volumes réels avant pagination et synchronisation incrémentale : le chargement global de dossiers restera coûteux pour les grandes entreprises.
3. Vues enregistrées par utilisateur, modèles de projets et automatisations avec historique d'exécution.
4. Activer et tester les prestataires externes (courriel, paiements, IA) selon leur configuration réelle. Ne pas annoncer ces intégrations comme opérationnelles sans tests de bout en bout.

Le transfert Supabase vers l'organisation Pro n'est pas effectué : coût supplémentaire annoncé de 10 USD/mois, non engagé. MG Pro n'est pas modifié.
