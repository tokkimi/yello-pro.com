# MG Pro — suivi des améliorations

Inventaire consolidé à partir des conversations moh, moh (2), du relevé Billdr du 7 octobre et de l’audit du code. Les modules Billdr ont été observés, mais tous les sous-parcours et chaque bouton ne sont pas encore vérifiés. Les anciens déploiements ne prouvent pas leur validation complète actuelle.

P0 : fiabilité et erreurs bloquantes. P1 : compléments métier. P2 : intégrations et migration.

## Livré dans cette mise à jour

- Projets : vues liste/cartes, recherche, filtres client et responsable, tri, étapes et pagination par 24.
- Feuille de temps : totaux et approbation limités à la semaine choisie, sept jours inclus, présentation mobile. Les journées à plusieurs saisies restent protégées contre l’écrasement de leurs taux.
- Devis et contrats : prix matériaux + main-d’œuvre avant taxes, marge de profit par ligne, notes publiques masquables, notes équipe en jaune et notes administration retirées côté serveur pour les autres rôles.
- Carnet : dessin au doigt, stylet ou souris dans les visites et documents, annulation du dernier trait, sauvegarde avec le document et export du croquis en PDF.
- Journal : rapport partageable, prise de photo ou ajout depuis la galerie, choix d’accès des nouvelles photos et conservation via la file de transfert existante.

## Limites encore ouvertes

- Configuration de production absente : RESEND_API_KEY, MAIL_FROM et ANTHROPIC_API_KEY. Les courriels réels et le service IA nécessitent leur activation.
- La transcription automatique de l’écriture manuscrite et la reconstruction automatique d’un plan 2D coté ne sont pas encore implémentées.
- La parité de chaque sous-menu et bouton Billdr n’est pas certifiée. Les points ci-dessous restent à compléter ou à vérifier dans un compte authentifié.
- Les essais du navigateur utilisent la démonstration. Les envois réels de courriels, signatures, caméra et transferts média doivent encore être validés avec les services et appareils concernés.

## 1. Navigation, présentation et mobile — P0 — À revalider

- [ ] Garder un fond blanc, des accents verts, une typographie compacte et une hiérarchie lisible ; confronter les graphiques et profils aux composants fournis.
- [ ] Contrôler chaque onglet projet : uniquement ses outils, sans répétition des phases, tâches et documents dans les autres onglets.
- [ ] Vérifier marges, champs destinataire/copie, cartes client/projet, montants PDF, boutons Créer, modales et menu latéral défilable.
- [ ] Contrôler à 320, 375, 390, 430, 768 et 1440 px : clavier, fermeture, listes longues, libellés longs, absence de chevauchement et de coupure.
- [ ] Prévoir pagination, états vides, chargement, erreurs, recherche et accès clavier pour les listes volumineuses.

## 2. Clients et contacts — P1 — À compléter

- [ ] Conserver les fiches client, projets associés, notes, courriels et suppression/restauration déjà implémentés ; revalider leurs permissions.
- [ ] Unifier le répertoire clients, prestataires, employés et administrateurs : filtres, recherche, import/export, doublons et archivage.
- [ ] Afficher les photos disponibles et une présence réelle ; garder un état inconnu quand aucune information de présence ne remonte.
- [ ] Appliquer la recherche par nom/courriel aux destinataires et copies de tous les documents, avec pastilles et dédoublonnage.

## 3. Projets — P1 — Lot en validation

- [ ] Livrer vues liste/cartes, recherche titre/client/adresse/référence, filtres client/responsable/étape, tri et menus Ouvrir/Modifier.
- [ ] Livrer pagination de 24 projets, création visible et fermeture des menus au clic extérieur ou à Échap.
- [ ] Compléter tags, colonnes configurables, affectations par membres, dates du cycle, montants, sélection multiple et export du périmètre filtré.
- [ ] Conserver les filtres et la position au retour du dossier ; tester changement de client/projet sans perte du contexte.

## 4. Soumissions et gabarits — P1 — À compléter

- [ ] Verifier tout le parcours : vierge, gabarit, duplication existante, CSV, brouillon incomplet, reprise, modification et version.
- [ ] Compléter groupes, catégories, tâches, descriptions, unités, quantité, matériaux, main-d’œuvre, codes de coût et catalogue réutilisable.
- [ ] Verifier majoration ligne/globale, rabais, taxes, arrondis et prévention du cumul involontaire ; distinguer clairement majoration et marge.
- [ ] Implémenter déplacement des blocs avec sauvegarde et alternative clavier/tactile, duplication et actions multiples.
- [ ] Verifier personnalisation du document : prix par ligne/catégorie, quantités, coûts, marge, prix unitaire, couverture et notes internes exclues.
- [ ] Verifier échéancier de paiement, calendrier chantier, validité, conditions, pièces jointes, aperçu PDF, retour édition, envoi et historique.

## 5. Contrats et signatures — P0 — À revalider

- [ ] Retester création/enregistrement du contrat projet et phase, client ou prestataire, brouillon incomplet, reprise et erreurs compréhensibles.
- [ ] Verifier références, parties, périmètre, lignes, dates, conditions, paiement, annexes, aperçu et conversion depuis la soumission.
- [ ] Contrôler signature de chaque partie autorisée, consentement, horodatage, verrouillage du document signé et version après modification.
- [ ] Distinguer la signature dessinée disponible d’une intégration de signature avec certificat et preuves immuables ; vérifier cette dernière avant toute promesse.

## 6. Ordres de changement — P0 — À revalider

- [ ] Vérifier création depuis contrat ou phase, lignes détaillées, impact montant/délai, brouillon, approbation/refus, signature et PDF.
- [ ] Verifier passage en facture et prevention des doubles facturations ; différencier signé, facturé et payé.
- [ ] Unifier les extras simplifiés du cockpit et les documents de changement pour éviter deux sources de vérité.

## 7. Factures et paiements clients — P1 — À compléter

- [ ] Verifier création depuis soumission, contrat, changement ou dépense, sélection des tâches et montants déjà facturés.
- [ ] Compléter listes factures/paiements, filtres date/client/projet/statut, exports, soldes et dates envoi/ouverture.
- [ ] Conserver paiements transactionnels et idempotents ; tester paiements partiels, annulation/correction auditée, reçus et relances.

## 8. Dépenses et fournisseurs — P1 — À construire

- [ ] Séparer dépenses, factures fournisseur et crédits fournisseur, avec numéros, dates, fournisseur, projet, catégories et justificatifs.
- [ ] Ajouter imputation des crédits et paiements, soldes fournisseurs, rapprochement et références aux commandes.
- [ ] Construire collecte des justificatifs par courriel avec contrôle des pièces jointes et dédoublonnage ; vérifier intégration comptable.

## 9. Demandes de prix — P1 — À compléter

- [ ] Relier projet, soumission et catégories ; choisir prestataires concernés, pièces jointes, date limite et message.
- [ ] Construire envoi réel, suivi livraison/ouverture, réponses, comparaison et attribution ; un statut choisi manuellement ne prouve pas un envoi.
- [ ] Ajouter recherche, filtres, colonnes, actions multiples et conversion en commande.

## 10. Bons de commande — P1 — À compléter

- [ ] Compléter lignes, quantités, taxes, fournisseur, adresse de livraison, dates, numéro, conditions et PDF.
- [ ] Relier demande de prix, approbation, envoi, réception partielle/complète, facture fournisseur, crédit et paiement.
- [ ] Distinguer montant demandé, brouillon, engagé, facturé et payé dans les totaux et le budget.

## 11. Budget et comptabilité — P0 — À revalider

- [ ] Confronter budget, coûts réels, commandes, changements, temps et factures sans compter deux fois la même dépense.
- [ ] Verifier vues entreprise/année/client/projet et périodes personnalisées ; cohérence graphique, totals et export.
- [ ] Verifier ZIP comptable avec justificatifs, dossiers incomplets, téléchargement et envoi réel à plusieurs destinataires/copies.
- [ ] Valider les mêmes droits et le même périmètre sur PDF, ZIP, courriel et écran.

## 12. Catalogues, coûts et sélections — P1 — À construire

- [ ] Créer bibliothèque centrale persistante : gabarits, mes soumissions, catalogue, catégories, codes de coût, échéanciers, tâches, produits et sélections.
- [ ] Ajouter import/export contrôlé, recherche, unités, coûts matériaux/main-d’œuvre, majoration et édition en ligne.
- [ ] Permettre sauvegarde/réutilisation des gabarits et échéanciers ; ne pas modifier rétrospectivement les documents déjà émis.
- [ ] Compléter choix client, options, allocations, approbation, impact budget et historique.

## 13. Fichiers — P1 — À compléter

- [ ] Passer des dossiers virtuels aux dossiers persistants : arborescence, fil d’Ariane, renommage, déplacement, tri et sélection multiple.
- [ ] Ajouter versions, miniatures, aperçu PDF multipage, téléchargement groupé, suppression réversible et limites de volume explicites.
- [ ] Verifier partage au client concerné et prestataires autorisés ; aucune fuite aux autres clients.

## 14. Communications et courriels — P1 — À compléter

- [ ] Distinguer conversations client, prestataires, équipe interne, demandes de devis, notes et historique des courriels par projet.
- [ ] Contrôler participants, pièces jointes, lecture, reprise des brouillons et rafraîchissement entre appareils.
- [ ] Vérifier les réponses entrantes, envois Resend, DNS, échecs, relances et états de livraison ; aucune réussite simulée.

## 15. Notifications — P1 — À compléter

- [ ] Conserver la cloche et le panneau translucide ; ajouter historique, lu/non lu, lien vers l’objet et préférences.
- [ ] Déclencher les notifications depuis les événements réels : message, affectation, validation, signature, paiement et échéance.
- [ ] Verifier synchronisation entre appareils et dédoublonnage.

## 16. Équipe et droits — P0 — À revalider

- [ ] Verifier invitation, retrait/restauration, rôle et affectation ; permissions serveur sur projet, phase, document et médias.
- [ ] Limiter le sélecteur de partage au client du projet et aux prestataires autorisés ; tester accès direct aux liens et téléchargements.
- [ ] Compléter métier, horaires, coût horaire, préférences, pointage et import comptable sans statut connecté fictif.

## 17. Feuilles de temps — P0 — Lot en validation

- [ ] Corriger totaux et approbation limités aux sept jours affichés, y compris week-end ; repasser en brouillon après modification.
- [ ] Adapter la feuille aux petits écrans en cartes lisibles par personne, sans tableau débordant.
- [ ] Compléter vue globale employé/catégorie, filtre période/personne, heures facturables, pauses, pointage et export.
- [ ] Protéger les taux différents et les entrées multiples d’une journée ; conserver l’historique des approbations.

## 18. Journal et rapports — P1 — À compléter

- [ ] Distinguer journal chantier du journal comptable et de la feuille de temps.
- [ ] Compléter rapport daté : travaux, équipe, météo, photos, matériaux, blocages, retards, commentaires et partage.
- [ ] Ajouter filtres projet/employé/date, vues développées/réduites et PDF/export.

## 19. Calendrier, tâches et phases — P1 — À compléter

- [ ] Verifier vues jour/semaine/mois/liste/planning, navigation, aujourd’hui, filtres projet/membre/type et jours ouvrés.
- [ ] Compléter dépendances, progression, déplacement/redimensionnement, assignation et contraintes de dates.
- [ ] Verifier collisions, disponibilités, buffers, propositions de rendez-vous, réponses et rappels réellement envoyés.
- [ ] Verifier mobile, changement de mois, événements longs, fuseaux horaires et cohérence entre agenda global et projet.

## 20. Réglages et assistance — P2 — À compléter

- [ ] Organiser entreprise, marque/PDF, profil, langue, defaults projet, modèles courriels, portail équipe et intégrations.
- [ ] Compléter coordonnées, licence, taxes, assurance/expiration, jours ouvrés/congés et préférences.
- [ ] Adapter support, aide contextuelle, retours utilisateurs et historique des mises à jour au fonctionnement MG Pro.

## 21. Atouts MG Pro et fiabilité — P0 — À préserver et revalider

- [ ] Préserver visite guidée, relevés, photos, notes vocales/dictée, médias hors ligne, devis pendant visite et plans 2D/3D.
- [ ] Verifier brouillons serveur et récupération hors ligne, sessions, autosauvegarde, conflits de versions et synchronisation sans perte de saisie.
- [ ] Tester grands volumes, deux sessions simultanées, isolation des rôles, opérations répétées et erreurs réseau.

## 22. Migration Billdr — P2 — Différée

- [ ] Inventorier toutes les entités, fichiers, versions, liens, statuts et soldes avant transfert.
- [ ] Créer correspondances d’identifiants, import relançable, rapport erreurs/doublons et rapprochement des totaux/documents.
- [ ] Effectuer sauvegarde et import de test ; obtenir concordance et validation fonctionnelle avant bascule des données réelles.
