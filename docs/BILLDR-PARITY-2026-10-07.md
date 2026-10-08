# Parité Billdr → MG Pro

État du 7 octobre 2026. Référence : interface authentifiée du compte Billdr, observation en lecture seule. L'import des données est différé jusqu'à validation fonctionnelle. Les écrans observés ne prouvent pas le fonctionnement des actions finales ; aucune commande, invitation, signature ni suppression réelle n'a été effectuée dans Billdr.

## Critère de livraison

Une fonction est complète seulement si son formulaire, sa validation, sa persistance serveur, ses permissions, ses transitions, son retour d'erreur et son affichage mobile ont été vérifiés. La présence d'un menu ou d'une liste déroulante ne constitue pas une livraison. Les actions Envoyer doivent envoyer réellement et les états ne doivent pas simuler des événements externes.

## Navigation globale observée et écarts

| Module Billdr | Fonctions observées | État MG Pro et travail requis |
|---|---|---|
| Mes projets | Liste/carte ; onglets tous, à soumissionner, soumission envoyée/signée, en construction, complété, archivé ; recherche projet/client/adresse ; tags ; assignés ; filtres supplémentaires ; références ; montant ; dates de cycle ; pagination ; actions par ligne | Cartes, dossiers et statuts existent. Ajouter liste, recherche adresse, filtres client/assigné, tri. Tags, colonnes configurables, pagination et dates de cycle à compléter. |
| Notifications | Historique chronologique, arrivées/départs, ouverture de soumission, lien contexte | Popover MG Pro présent. Centre historique, événements serveur d'ouverture/pointage et préférences à compléter. |
| Factures | Onglets factures/paiements ; nouvelle facture ; export ; recherche ; période/statut/projet ; facturé/payé/débiteur ; dates envoi/ouverture ; solde ; actions par ligne | Facturation, paiements et comptabilité existent. Comparaison des actions par facture, suivi ouverture, filtres et exports dédiés à compléter. |
| Dépenses | Tout/dépenses/factures fournisseur/crédits fournisseur ; nouveau ; transfert courriel ; recherche fournisseur/référence/projet ; date/statut ; filtres avancés ; sous-total/taxes/total | Dépenses et justificatifs existent. Factures/crédits fournisseur et collecte par courriel manquants comme parcours complets. |
| Demandes de prix | Création depuis projet + soumission ; catégorie ; fournisseur ; échéance ; montant ; envoi/ouverture ; statuts ; sélection multiple ; colonnes configurables ; pagination | Formulaire projet simplifié et demandes prestataires existants. Relier la source soumission/catégories, destinataires, pièces jointes, envoi, réponses et attribution réelle. |
| Bons de commande | Création ; facture fournisseur ; recherche ; projet/fournisseur/période ; valeur/facturé/payé/compte fournisseur ; onglets commandes/factures/paiements/crédits ; statut ; export | Commandes projet simplifiées. Manquent lignes, références, réception détaillée, liens factures/crédits/paiements et document envoyé. |
| Fichiers | Dossiers ; ajout ; fil d'Ariane ; multi-sélection ; tri date/auteur/type ; menu par élément ; classement par projet | Upload privé et dossiers virtuels MG Pro présents. Dossiers réels, déplacement, renommage, actions multiples et versions à compléter. |
| Gabarits & coûts | Dix onglets : Gabarits Billdr, Mes soumissions, Mon catalogue, Mes catégories, Codes de coût, Échéanciers Billdr, Mes échéanciers, Tâches, Produits, Sélections | Gabarits devis partiels et codes de coût projet existants. Construire bibliothèque centrale persistante et liens avec devis/achats/temps. |
| Mon catalogue | Recherche, filtre catégorie, import/export, ajout tâche ; quantité/unité ; matériaux/main-d'œuvre/majoration ; description ; code de coût ; édition en ligne | Devis détaillés existants. Catalogue central réutilisable et imports contrôlés à compléter. |
| Mon équipe | Recherche ; ajout ; import QuickBooks ; rôle ; emploi ; téléphone ; quart en cours/terminé ; SMS ; assignation automatique ; horaires ; pagination | Invitations, rôles admin/worker/client et affectations présents. Profils métier, horaires, coûts, pointage, préférences et intégration comptable à compléter. |
| Contacts | Clients/professionnels/employés/administrateurs ; ajout ; import fichier/QuickBooks ; export ; recherche nom/mail/entreprise ; sélection multiple | Clients et sous-traitants séparés existants. Répertoire unifié, import/export, filtres et actions multiples à compléter. |
| Feuille de temps | Par employé/par catégorie ; période ; employé ; actifs seulement ; ouvrir tout ; export ; approbation globale/individuelle ; heures/coût/facturable | Feuille projet simplifiée. Corriger agrégation semaine et portée approbation ; ajouter centre global, catégories, coûts facturables, pauses et pointage. |
| Journal | Rapport journalier ; filtres projet/employé/date ; déplier ; photos ; commentaires ; partage client ; météo ; travaux ; équipe ; matériaux ; problèmes ; retard | Journal chantier texte projet existe. Distinguer journal chantier du journal comptable. Enrichir rapport, médias, partage et vue globale. |
| Calendrier | Projet/membre/type ; aujourd'hui ; mois précédent/suivant ; événements | MG Pro possède mois/semaine/planning et visites. Vérifier sources tâches/phases, dépendances, affectation, jours ouvrés et mobilité. |
| Courriels | Conversations par projet ; recherche ; filtre statut projet | Messagerie interne/client et envoi documents présents. Comparer historique réel des mails, réponses entrantes, pièces jointes, destinataires/copies et états de livraison. |
| Réglages | Entreprise ; marque/PDF ; informations personnelles/langue ; paramètres projets ; courriels par défaut ; portail employés ; abonnement ; intégrations | Paramètres entreprise/fiscalité/visites/devis présents. Consolider onglets et préférences, marque/PDF, modèles courriels, portail et intégrations. |
| Entreprise | Adresse/site/licence/taxes ; assurance/expiration ; compte bancaire ; moyens paiement ; transfert dépenses/factures ; jours ouvrés/congés | Détails bancaires et traitements paiement exigent intégrations réelles ; aucun statut connecté simulé. Assurance, calendrier entreprise et collecte à construire. |
| Support | Messagerie assistance, tutoriels, tickets, historique des mises à jour, feuille de route | Prévoir aide contextuelle et signalement rattaché au module ; raccordement au support MG Pro à définir. |
| Commentaires | Widget de demande d'amélioration | Prévoir retour utilisateur dans MG Pro avec enregistrement et suivi, sans envoyer aux équipes Billdr. |
| Profil | Entreprise, informations personnelles, paramètres projets, abonnement, démo, feuille de route, tutoriels, déconnexion | Déconnexion et réglages présents. Menu profil et préférences à enrichir. Abonnement/démo Billdr sont des services propres au fournisseur, à adapter au modèle MG Pro. |

## Projet : couverture requise

Sommaire, Communications, Fichiers, Soumissions, Contrat, Sélections, Factures, Dépenses, POs, Budget, Échéancier, Tâches, Feuille de temps, Journal, Rapports. Chaque onglet doit présenter uniquement ses données et ses outils. Header : référence, client, adresse, tags, statut, équipe et menu Créer contextuel.

Soumissions : bibliothèque/mes gabarits/soumissions existantes/vierge/import CSV ; groupes/catégories/tâches ; unités ; matériaux ; main-d'œuvre ; majoration ligne/globale ; taxes/rabais ; notes internes ; catalogue ; demandes de prix ; personnalisation visibilité ; paiement ; calendrier ; conditions ; documents joints ; aperçu/PDF ; retour édition ; envoi ; signature ; historique/version.

## Interactions transversales à vérifier explicitement

- Poignées de déplacement des catégories, tâches et blocs : ordre sauvegardé, fonctionnement souris/tactile, alternative clavier.
- Menus à trois points : actions contextualisées, confirmation pour suppression, droits, retour focus, fermeture extérieure/Escape.
- Listes déroulantes : recherche, choix vide, création si permise, fermeture stable, isolation client/projet/prestataire.
- Vues liste/carte et onglets : filtres conservés, nombre de résultats cohérent, indicateur actif, aucune section étrangère.
- Tri, colonnes, filtres, multi-sélection, actions groupées, pagination et exports du même périmètre.
- Chaque bouton : état disponible/chargement/erreur/succès ; aucune action décorative ; absence de double envoi.
- Mise en page : 320/375/390/430 px, tablette, bureau ; listes lisibles et formulaires sans chevauchement.

## Atouts MG Pro à préserver

Visites et relevés, notes vocales/dictée, médias hors ligne, préparation du devis pendant la visite, plans 2D/3D, partage limité des plans, fiche client centrale, export comptable avec justificatifs et destinataires/copies.

## Limite de cet inventaire

Tous les modules globaux ci-dessus ont été ouverts ou observés dans la session. Les détails des formulaires et sous-onglets n'ont pas tous été inspectés ; la parité exhaustive n'est pas acquise. Continuer l'audit en profondeur et cocher chaque parcours seulement après implémentation et test. Ne pas confondre ce document avec une certification de parité.
