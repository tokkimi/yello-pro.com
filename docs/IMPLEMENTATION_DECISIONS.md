# Décisions d’implémentation MG Pro — 8 octobre 2026

## Références et limites de preuve

Les deux documents fournis sont des références fonctionnelles, pas une autorisation de modifier Billdr ou d’envoyer des communications. Leur distinction T (testé), O (observé), N (non vérifié) et H (proposition) est conservée. Un contrôle T chez Billdr ne prouve pas un parcours équivalent MG Pro. Les propositions de schéma, de routes et de design sont adaptées à l’architecture existante.

- `BILLDR_FUNCTIONAL_UX_MAP.md` — SHA-256 `8e0002db6171eff9a2f8a0bed5d039e1ec1ea55cf47aa931fb844362ca3ee9da`.
- `MASTER_DEVELOPMENT_PROMPT.md` — SHA-256 `811f745f9f26e4f4007458b6a249632739dbf920dac7a188fc73fad520db3525`.

## Décisions

- Conserver le blanc et le vert MG Pro, les visites, notes vocales, carnets manuscrits et plans 2D/3D existants. Ne pas remplacer l’application par une démo générique.
- Regrouper les rubriques secondaires dans « Plus » ; conserver les quinze domaines projet et les compléments MG Pro. Ne montrer que les panneaux de la rubrique choisie.
- Les dix rubriques du catalogue utilisent les réglages existants. Les documents reçoivent une copie indépendante du gabarit ; les notes privées ne sont pas propagées lors de la réutilisation.
- Les demandes de prix, achats et heures restent rattachés au projet. L’attribution crée atomiquement un bon brouillon dans le même enregistrement projet. Un bon brouillon n’engage pas le budget. Les statuts fournisseur sont un suivi manuel ; enregistrer ne signifie pas envoyer.
- Les échéanciers se sauvegardent explicitement. Le recalcul des dépendances modifie le brouillon. Bloquer les cycles ; ne pas inventer de dates ou de prix dans les structures de départ.
- Les prix client sont des prix de vente. Masquer les coûts, notes et totaux internes côté serveur, pas uniquement dans le CSS. Les projections client conservent les montants et taxes calculés avec le moteur central.
- Les sélections et rapports sont publiés explicitement. Le choix client est autorisé et versionné côté serveur ; ce choix ne modifie pas automatiquement un contrat signé.
- Les notifications proviennent des événements autorisés ; les lectures sont propres à l’utilisateur. Ne jamais retourner les contenus avant/après de l’audit aux clients.
- Garder les versions optimistes et les erreurs visibles. Ne pas créer de document lors d’un simple clic d’ouverture.
- Tester avec les données fictives du mode démonstration. Ne migrer ni effacer de données Billdr pendant cette livraison.
- Conserver dans toute passation les incidents décrits dans la cartographie : création involontaire du journal DL-0043 et d’une tâche vide lors de l’audit Billdr. Aucune suppression corrective n’a été effectuée dans Billdr.

## Validations de ce lot

43 tests automatisés réussis : calculs décimaux, projection des prix client, notes par rôle, signatures, partage, restauration client, exports comptables, PDF long, catalogue indépendant, engagements fournisseur, jours ouvrés, dépendances et cycles. Compilation Next réussie.

Contrôles navigateur sur données fictives : création d’un produit à 150 $ de matériaux + 300 $ de main-d’œuvre, reprise en devis à 450 $ avant taxes / 517,39 $ TTC ; demande de prix avec réponse de 500 $ puis attribution en bon brouillon ; gabarit d’échéancier, recalcul, enregistrement et Gantt ; catalogue et devis à 390/320 px. Ces contrôles ne prouvent pas une recette exhaustive des comptes réels ni des 17 parcours du prompt.

## Limites à ne pas masquer

La parité exhaustive n’est pas terminée. Voir BILLDR_COVERAGE_2026-10-08.md pour chaque domaine. Les crédits et paiements fournisseur, la carte géographique des projets, le répertoire professionnel unifié, les dix écrans de réglages et leurs sous-options, les routines IA, les integrations et les volumes réels restent à compléter ou à recetter.

L’envoi réel et l’IA nécessitent leur configuration serveur (service de courriel, expéditeur et clé IA). Le carnet manuscrit permet dessin et PDF, mais ne réalise pas une reconnaissance manuscrite ni une conversion automatique en plan 2D. Les données de démonstration sont temporaires. Aucun courriel réel n’a été envoyé pendant cette recette.

## Décisions du lot suivant (H, base 32b4a33)

- **Base** : travail repris exactement sur `32b4a33` (descendant de `2e72968` et `a810e3a`), en avance rapide, sauvegarde locale `backup/base-32b4a33`. Aucun reset, rebase ni force-push.
- **Fournisseurs** : les réponses sont stockées dans la demande de prix ; une seule attribution active ; l’attribution crée un bon *brouillon* (jamais engagé). Les montants de bons sont comparés avant taxes. Engagé = bons Envoyé/Partiellement reçu/Reçu. Réalisé = factures reconnues − crédits appliqués + heures approuvées + réel saisi. Prévision = réalisé + part non facturée des bons actifs. Un paiement ne crée jamais de coût. Ces règles sont des choix H, pas des règles Billdr observées.
- **Validation serveur** : chaque enregistrement de projet recontrôle le grand livre fournisseur (doublons de facture, paiements/crédits au-delà du total, paiement sur brouillon).
- **Prix** : `margin` historique reste la majoration en pourcentage (aucun prix existant ne change). Le mode marge enregistre `price_basis='margin'` et `profit_margin`, avec la majoration équivalente pour compatibilité. Arrondi au cent par ligne puis sur le total, comme auparavant.
- **Notifications** : douze familles MG Pro (regroupement H) ; seul le canal in-app est actif. Les libellés de statut manuel disent « marqué manuellement ».
- **Courriels** : variables entre crochets ; un jeton inconnu bloque l’enregistrement du modèle et reste visible au rendu ; aucune substitution silencieuse.
- **Carte** : tuiles OpenStreetMap avec attribution ; coordonnées obtenues par le service fédéral de géolocalisation à la demande d’un administrateur, mémorisées dans le projet et effacées si l’adresse change. Aucune clé requise.
- **Répertoire** : les professionnels sans accès logiciel sont stockés dans les réglages (`directory`) pour éviter une migration de schéma ; aucune fusion automatique des doublons ; la présence en ligne n’est jamais simulée.
- **Échéancier client** : publication explicite (`schedule_published`) ; la copie client ne contient ni responsables ni données internes.
- **Abonnement** : aucun abonnement SaaS ni moyen de paiement n’est affiché comme actif.

## Reprise des outils Follow My Future (H)

- Source analysée : dépôt `tokkimi/VIEWMYWORK`, branche `claude/funny-albattani-fyu3nc` (ee5b8d8, production « viewmywork »). Le code est adapté aux enregistrements MG Pro, pas copié : pas de Prisma, pas d’abonnement SaaS.
- Santé : score 100 moins pénalités (retard ≥ 25 pts → −25, date dépassée → −35, tâches en retard −4/tâche max −20, budget dépassé −25, prévision > 150 % −25, > 105 % −15, attente client ≥ 7 j −15 sinon −6, factures échues −8). Seuils 75/50 comme la source.
- Facturation : le statut est dérivé des dates et des paiements ; une facture émise reste figée, seuls lien client, lien de paiement et historique des rappels sont modifiables via `/api/billing`. Lien public = jeton aléatoire révocable ; la page n’expose que la projection client.
- Paiement en ligne : pas de Stripe Connect dans MG Pro ; un lien de paiement externe est affiché, sans jamais marquer la facture payée automatiquement.
- Rappels : manuel ≤ 1 / 20 h / document ; automatique une fois par (facture, décalage) avec fenêtre de 2 jours ; un échec n’est pas compté comme envoyé ; sans Resend rien n’est noté.
- Barre mobile : 5 actions (Accueil, Projets, Visite, Devis, Plus) sous 900 px ; variantes prestataire et client.
