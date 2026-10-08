# Couverture Billdr → MG Pro — 8 octobre 2026

## Mise à jour du lot suivant (base 32b4a33, contenant 2e72968 et a810e3a)

Base vérifiée avant modification : `codex/refonte-mgpro` à `32b4a33`, ascendance contenant `2e72968` et `a810e3a`. Les 43 tests de référence passaient avant tout changement. Statuts : **Livré** = code, persistance et validation serveur présents avec tests ; **Partiel** = une partie vérifiée, le reste nommé ; **Écart** = non construit.

| Domaine | Statut | Ce qui est réellement en place | Vérification | Reste |
|---|---|---|---|---|
| Demandes de prix | Livré | Plusieurs réponses comparables (avant taxes, total, écart au plus bas en $ et %, délai, validité), écarter/rétablir, attribution unique | Tests `vendor-finance` + navigateur (950 $ vs 1 200 $ → +250 $, 26,32 %) | Envoi réel (service courriel absent) |
| Bons de commande | Livré | Bon brouillon créé atomiquement à l’attribution, statuts Brouillon/Envoyé/Partiellement reçu/Reçu/Annulé, réception par ligne, code de coût et phase | Tests + navigateur (brouillon « Non engagé », envoyé 950 $) | PDF du bon |
| Factures fournisseur | Livré | Liées ou non au bon, numéro unique par fournisseur, échéance, justificatif, statut calculé selon paiements/crédits | Tests + navigateur (F-100 600 $ + 89,85 $) | Transfert par courriel |
| Crédits fournisseur | Livré | Brouillon/Appliqué/Annulé, plafonné au solde de la facture liée | Tests | — |
| Paiements fournisseur | Livré | Plafonnés au solde, facture émise obligatoire, consignation manuelle annoncée comme telle | Tests + navigateur (900 $ refusé, 689,85 $ accepté) | Aucun paiement réel (voulu) |
| Rapprochement | Livré | Pointage des paiements, factures sans justificatif/sans bon, dépassements, réceptions non facturées, échues | Tests + navigateur | Import de relevé bancaire |
| Budget | Livré | Par code de coût : original, changements approuvés (coût), révisé, engagé, engagé non facturé, factures, crédits, main-d’œuvre approuvée, saisi, réalisé, payé, à payer, prévision, reste ; « Non catégorisé » ; export CSV | Tests (aucun double compte bon + facture + paiement) | Dépenses globales par code |
| Marge / majoration | Livré | Mode explicite par ligne et global, moteur décimal unique (totaux, projection client, PDF, éditeurs), marge ≥ 100 % refusée côté serveur | Tests : 7 500 @ 15 % marge = 8 823,53 ; 450 @ 25 % majoration = 562,50 ; 20 % marge = 25 % majoration ; 450 $ → 517,39 $ TTC | — |
| Réglages | Partiel | Neuf sections + formulaire entreprise : marque documents/courriels, paramètres projets, IA, 13 courriels, portail employés, notifications, services, abonnement (aucun), support | Tests + navigateur (13 modèles, variable inconnue signalée, total 105 % bloqué) | Logo téléversé, signature riche, test d’envoi (service absent) |
| Notifications | Livré | Événements métier, libellés sans faux « envoyé par courriel », matrice 12 familles × rôles, in-app seul actif | Tests | Courriel/SMS/push |
| Portail client | Partiel | Neuf rubriques sur données filtrées serveur, échéancier publié explicitement sans responsables | Tests de filtrage (client et prestataire) | Recette avec deux clients et deux prestataires réels |
| Projets | Partiel | Carte géographique OSM, géolocalisation explicite, filtres de dates (8 préréglages, annuler/appliquer/réinitialiser), sélection, export, statut groupé confirmé, « 0 résultat », contexte restauré | Tests + navigateur 320/390/768/1440 | Tags, colonnes, routes URL |
| Répertoire | Partiel | Clients, professionnels, employés, administrateurs ; doublons ; import CSV prévisualisé ; export ; archivage | Tests + navigateur (doublon détecté) | Modale cinq types, documents des professionnels |
| Échéancier | Partiel | Semaine de travail et fériés des réglages, publication client explicite | Tests | Glisser/redimensionner, zoom, groupes imbriqués |
| Bob Chat / routines, fichiers système, dépenses globales à quatre familles, QuickBooks/Zapier, SMS | Écart | — | — | Non construits dans ce lot |

### Recette F01–F17 (sandbox de démonstration, 8 octobre)

| ID | Résultat | Détail |
|---|---|---|
| F01 | Partiel | Rubriques et onglets accessibles ; onglet projet mémorisé. MG Pro n’expose pas de route URL par onglet : écart assumé, à construire. |
| F02 | Réussi | Recherche « zz_audit_aucun_resultat » → « 0 résultat » et message vide ; effacement rétablit la liste ; aucune écriture. |
| F03 | Réussi | Préréglage choisi puis Annuler : 3 projets conservés, filtres appliqués inchangés. |
| F04 | Non recetté | Création de projet existante non modifiée dans ce lot. |
| F05 | Réussi | Liste et carte distinctes ; marqueur → référence, statut, adresse, client, Voir le projet (coordonnées de démonstration). |
| F06 | Partiel | 18 rubriques projet (15 Billdr + Phases, Plans, Changements) ; menu Créer non recetté dans ce lot. |
| F07 | Partiel | Soumission signée figée côté serveur (409) ; aperçu sans coûts internes couvert par tests ; menus désactivés non recettés. |
| F08 | Non recetté | Facture payée lecture seule non revérifiée. |
| F09 | Partiel | Cohérence finance fournisseur projet ↔ budget vérifiée ; vue globale fournisseur absente. |
| F10 | Écart | Dépenses globales à quatre familles et tiroirs colonnes non construits. |
| F11 | Écart | Dossiers système protégés non construits. |
| F12 | Partiel | Quatre listes de contacts ; ajout par onglet, sans modale à cinq types. |
| F13 | Partiel | Liste/Gantt/Calendrier présents ; pas de route `schedule_gant_tab`. |
| F14 | Partiel | Seules les heures approuvées entrent au budget ; vue par catégorie absente. |
| F15 | Réussi | Dix sections (entreprise + neuf), deux blocs de marque, treize messages, matrice avec état mixte. |
| F16 | Partiel | Neuf rubriques client ; brouillons, coûts, notes, journaux non partagés et échéancier non publié exclus (tests serveur) ; recette multicompte à faire. |
| F17 | Écart | Bob Chat et routines non construits. |

### Complément livré ensuite (même journée)

| Domaine | Statut | En place | Vérification |
|---|---|---|---|
| Dépenses / achats entreprise (Tout, Dépenses, Factures, Crédits, Paiements, BDC) | Livré | Vue Fournisseurs & coûts, filtres, colonnes (préférence locale), export, coûts sans double compte | Test + navigateur (450 $ / 67,39 $ / 517,39 $) |
| Fichiers et dossiers système | Livré | Racine → Mes projets → projet → 9 dossiers ; actions par fichier ; documents générés non déplaçables | Test + navigateur (10 dossiers dont « Autres fichiers ») |
| Ajouter un contact (5 types) | Livré | Modale, Confirmer désactivé sans choix, Annuler sans création | Navigateur |
| Tâches : sources et filtres | Livré | 6 sources, aperçu, sans doublon ; filtres sans mutation | Test + navigateur |
| Bob Chat / routines | Partiel | Assistant lecture seule (clé IA absente en production → message « non configuré ») ; routines calculées, exécution manuelle et historique | Test + navigateur (envoi vide désactivé, consultation sans exécution) |
| Gantt | Livré | Zoom, glisser, redimensionner, clavier, dépendances, jours ouvrés, groupes imbriqués, annulation | Test + navigateur |
| Feuille de temps | Livré | Pointage prestataire via API contrôlée, par catégorie (approuvé seulement), clôture | Tests |
| Routes | Livré | `#rubrique/identifiant`, retour navigateur | Navigateur |

Recette F01–F17 mise à jour : F01 réussi (adresses et retour), F10 réussi (familles et tiroirs colonnes), F11 réussi (dossiers système protégés), F12 réussi (quatre listes et cinq types), F13 réussi hors nom de route `schedule_gant_tab` (MG Pro utilise ses propres adresses), F14 réussi, F17 partiel (assistant non configuré en production faute de clé).

## État précédent (début du 8 octobre)

Cette liste analyse les deux documents joints et l’état du code. « Présent / partiel » ne signifie pas certifié complet. Chaque bouton, rôle, cas d’erreur et volume devra être recetté. Aucun domaine inconnu N de Billdr n’est présenté comme reproduit à l’identique.

| Domaine de référence | Mise en place MG Pro | À compléter ou à vérifier |
|---|---|---|
| Projets — liste/cartes/recherche | Liste, cartes, filtres client/statut/responsable, pagination | Carte géographique, filtres avancés, sélection multiple, restauration des filtres/navigation |
| Projet — sommaire | Contrat, facturé, payé, solde, raccourcis | Recette des crédits et avenants dans tous les agrégats |
| Communications | Messages client/équipe séparés, pièces jointes | Courriels synchronisés, historique externe, abonnements |
| Fichiers | Fichiers projet, photos journal, partage | Arborescence globale complète, opérations multiples, gros volumes |
| Soumissions | Catégories, tâches, matériaux/main-d’œuvre, profit, notes par rôle, catalogue, aperçu/PDF | Groupes hiérarchiques, sélection multiple, import CSV complet, historique de versions comparatif |
| Contrat | Création, portée, échéancier, signatures et contrôles de publication | Recette réelle multirôle client/prestataire ; absence de configuration courriel bloque les envois |
| Sélections | Alternatives produit, prix/liens, publication et décision client versionnée | Photos, délais, pièces jointes et conversion complète des choix en achats |
| Factures | Liste, paiements, crédits existants ; rubriques projet dédiées | Recette de chaque transition, remboursements et encaissements réels |
| Dépenses | Création et comptabilité, justificatifs, vue projet | Factures et crédits fournisseur complets, approbations et imports |
| Bons de commande | Liste/cartes, lignes, taxes, livraison/réception, source devis | Facture fournisseur liée, paiements/crédits et rapprochements sans double compte |
| Demandes de prix | Lignes, fournisseur/courriel, source devis, réponse, attribution en bon brouillon | Comparaison de plusieurs réponses, envoi réel et réponses externes |
| Budget | Coûts, achats engagés, heures | Budget original/révisé complet, ventilation par code et rapprochements fournisseur |
| Échéancier | Liste/Gantt/calendrier, groupes/activités/jalons, dates, dépendances, responsable, progression et gabarits | Hiérarchie de groupes, glisser/redimensionner, zoom, calendrier férié configurable, publication client |
| Tâches | Création/suivi projet et global | Sous-tâches, divisions, lots et toutes les automatisations |
| Feuille de temps | Global/projet, filtres, saisie et approbation, export CSV | Pointage mobile réel, divisions, clôture/paie et recette hebdomadaire complète |
| Journal | Global/projet, travaux/blocages, photos, partage explicite | Exports et abonnements quotidiens, rattachement de toutes les pièces |
| Rapports | Rapport projet, périmètre, progression, publication client | Photos, PDF dédié, notifications de publication et historique immuable |
| Notifications | Cloche et centre global unifiés, filtres et lectures serveur par utilisateur | Préférences détaillées, push/courriel/SMS |
| Clients | Fiches, projets, notes, suppression/restauration | Répertoire contacts unifié avec professionnels/employés/admins, import/doublons |
| Équipe | Comptes/rôles/affectations existants | Invitations réelles et matrice complète des permissions à recetter |
| Gabarits de soumission | Quatre structures MG Pro sans prix imposés | Bibliothèque Billdr exhaustive à importer après validation/licence |
| Mes soumissions | Création/duplication depuis devis, snapshots privés exclus | Catégories/groupes détaillés et import CSV |
| Catalogue de tâches | CRUD, recherche, prix, unité, catégorie et code | Taux horaires, filtres avancés, historique de prix |
| Catégories | CRUD bibliothèque, suggestions dans devis | Hiérarchie et insertion de groupes de tâches prédéfinis |
| Codes de coût | CRUD bibliothèque et choix dans devis | Hiérarchie complète, archivage et ventilation comptable |
| Échéanciers de départ | Neuf structures MG Pro réutilisables sans dates imposées | Reproduction des modèles détaillés décrits dans la source |
| Mes échéanciers | Édition, duplication, sauvegarde et reprise projet | Import/export spécialisés et groupes imbriqués |
| Gabarits / catalogue de tâches | Bibliothèque de prestations réutilisables | Deux sous-vues distinctes, checklist et affectations |
| Produits | Marque, SKU, finition, prix et insertion devis | Photos, fournisseurs multiples, disponibilités et pièces |
| Gabarits de sélections | Rubrique réutilisable du catalogue | Insertion directe en groupe de sélections projet |
| Courriels | Destinataire/copie avec suggestions, API existantes | Service d’envoi non configuré ; boîte synchronisée et événements réels |
| IA — chat/routines | Notes vocales et analyse existantes, repli déterministe annoncé | Clé IA, chat, routines, contrôle d’exécution, OCR et mise en plan automatique |
| Réglages entreprise | Coordonnées, fiscalité et paramètres existants | Comparer chaque champ du relevé |
| Image de marque documents/courriels | Identité et options d’aperçu devis | Deux sous-vues complètes, thèmes courriel et héritage des modèles |
| Informations personnelles | Compte et rôles existants | Préférences complètes et recette changements sensibles |
| Paramètres projets | Conditions, taxes, unités et paiements existants | Dix familles et héritage par projet à compléter |
| Préférences IA | Aucun écran complet certifié | Contrôles proposés H à construire et tester |
| Courriels par défaut | Modèles ponctuels existants | Treize modèles, variables et prévisualisation |
| Portail employés | Accès prestataire et projets autorisés | Paramètres mobile/pointage détaillés |
| Abonnement | Pas de facturation SaaS MG Pro configurée | Ne pas afficher de paiement ou d’abonnement fictivement actif |
| Préférences notifications | Centre interne | Matrice des douze familles/canaux et abonnements |
| Intégrations | Liens Calendly contrôlés, exports | Connexions OAuth/mappings QuickBooks et autres services réels |
| Support/commentaires | Canaux existants du site | Outils intégrés de support/retour et suivi |
| Portail client — neuf rubriques | Documents autorisés, choix et rapports publiés, journaux partagés | Navigation neuf pages, échéancier publié, recette exhaustive des rôles |
| Atouts MG Pro | Visites/relevés, notes vocales, carnet doigt/stylet PDF, plans 2D/3D conservés | OCR et plan 2D automatique non réalisés ; stockage audio hors ligne déjà testé |
| Comptabilité | Filtres année/client/projet, ZIP justificatifs, destinataire/copie | Envoi configuré, gros volumes, données réelles et rapprochements fournisseur |
| Migration | Aucune migration Billdr effectuée | Inventaire/export, mapping, simulation, totaux de contrôle, rapprochement et validation avant import réel |

## Inventaire des sections de la cartographie examinée

Les sections suivantes sont gardées comme checklist de recette, sans transformer leur niveau de preuve Billdr en certification MG Pro.

- Légende obligatoire
- Incidents de données — à conserver dans toute transmission
- Routes projet
- Routes gabarits
- Routes réglages
- Portail client
- Shell entrepreneur
- Style effectivement visible
- Composants transversaux
- Responsive
- 4.1 Liste
- 4.2 Création initiale, sans création effective
- 4.3 Carte
- 5.1 Sommaire
- 5.2 Communications
- 5.3 Fichiers
- 5.4 Soumissions
- 5.5 Contrat
- 5.6 Sélections
- 5.7 Factures
- 5.8 Dépenses
- 5.9 POs
- 5.10 Budget
- 5.11 Échéancier
- 5.12 Tâches
- 5.13 Feuille de temps
- 5.14 Journal
- 5.15 Rapports
- Votre vue
- Aperçu client
- Calculs observables et limites
- 7.1 Factures globales
- 7.2 Paiements globaux
- 7.3 Facture payée : vue client
- 7.4 Facture payée : votre vue
- 8.1 Dépenses globales
- 8.2 Demandes de prix
- 8.3 Bons de commande
- 9.1 Fichiers globaux
- 9.2 Mon équipe
- 9.3 Contacts
- 10.1 Gabarits Billdr de soumission
- 10.2 Mes soumissions
- 10.3 Mon catalogue
- 10.4 Mes catégories
- 10.5 Codes de coût
- 10.6 Échéanciers Billdr
- 10.7 Mes échéanciers : détail rempli
- 10.8 Tâches : Gabarits et Catalogue
- 10.9 Produits
- 10.10 Sélections
- 11.1 Feuille de temps globale
- 11.2 Journal global
- 11.3 Calendrier global
- 11.4 Courriels globaux
- 11.5 Notifications
- Chat
- Routines
- 13.1 Entreprise
- 13.2 Image de marque : Documents
- 13.3 Image de marque : Courriels
- 13.4 Informations personnelles
- 13.5 Paramètres de projets
- 13.6 Préférences IA
- 13.7 Courriels par défaut
- 13.8 Portail mobile employés
- 13.9 Abonnement
- 13.10 Notifications
- 13.11 Intégrations d’applications
- Parcours effectivement suivis
- Chaînes révélées mais non exécutées intégralement
