# Rénovations MG Pro

Site Next.js, espace dirigeant / équipe / client, Supabase Auth et stockage privé, génération PDF et connecteur courriel Resend.

## Exécution

`npm install`, puis `vercel env pull .env.local --yes` et `node scripts/migrate.mjs`. Démarrer avec `npm run dev`. Validation : `npm test` et `npm run build`.

Le site utilise les informations publiques et les photographies et les textes des pages de services et des galeries de renovationsmgpro.com, ainsi que le logo fourni par le propriétaire du projet. `/demo` contient exclusivement des exemples fictifs en mémoire. `/admin` exige une identité Supabase et un profil actif.

## Configuration

Variables : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Envoi : RESEND_API_KEY et MAIL_FROM, domaine expéditeur vérifié. NEXT_PUBLIC_SITE_URL doit correspondre au domaine déployé.

Les migrations créent des tables protégées sans accès direct depuis le navigateur. Les routes serveur vérifient l’identité, les rôles, les affectations et la visibilité des documents. Ne jamais exposer la clé de service.

Créer le dirigeant dans Supabase Auth puis un profil `admin` avec le même UUID. Les invitations suivantes sont disponibles dans Équipe & accès. Configurer les URLs de redirection Supabase pour `/auth/confirm` et le modèle d’invitation avec token_hash. Les clients voient uniquement leur dossier ; l’équipe uniquement les projets affectés. Les factures sont émises et payées par transactions SQL avec journal équilibré.

## Limites à connaître

Les envois externes nécessitent un fournisseur actif. Aucun envoi fictif n’est présenté comme réussi. La comptabilité couvre factures, paiements, dépenses, journal, balance et rapports ; paie, déclarations fiscales, rapprochement bancaire automatique et états financiers certifiés ne sont pas implémentés. Les dépenses et règlements fournisseurs se comptabilisent depuis leur dossier. Les visites peuvent recevoir des photos sans quitter le formulaire ; le brouillon est enregistré avant le téléversement. Les PDF intègrent JPEG/PNG, jusqu’à vingt photos. Aucun engagement de parité intégrale avec Buildr.

## Refonte éditoriale

Les contenus sources sont conservés dans `content/original.json`. Le site comprend huit expertises, les six étapes de l’approche sur l’accueil, trente et une photographies de réalisations réparties dans les quatre catégories d’origine, le lien Financeit original et les redirections des anciennes pages PHP. Le contrôle `node scripts/smoke.mjs` vérifie la connexion, une demande, un devis et son PDF, puis supprime uniquement ses données temporaires.

Envoi de courriels et création Resend mis en attente à la demande du propriétaire pendant la phase de maquette. Aucun abonnement supplémentaire créé.

## Public site release: bilingual pages and visit replies
- French and English public pages have separate URLs with an FR/EN switch, localized HTML language and sitemap alternates. Four original blog articles are available in both languages; English copy is an editorial adaptation.
- Requests accept up to 10 JPEG/PNG/WebP photos with client compression and private server storage. HEIC files are not supported; the form explains supported formats.
- Address suggestions use Natural Resources Canada with manual entry fallback.
- Request replies support saved drafts, proposed Montréal-local appointment times and an optional Calendly URL in Settings. No placeholder Calendly URL is used. A proposal never automatically confirms a visit.
- Direct email remains inactive until RESEND_API_KEY and MAIL_FROM are configured with an authorized sender. Opening a draft in the user's email client is available. No subscription or DNS change was made.
- Verification: npm test, npm run build, scripts/smoke-release.mjs, scripts/smoke-request-photos.mjs and scripts/smoke.mjs. Browser checks at 390px cover public form steps, multi-photo selection and blog/financing layout. Actual iOS keyboard/camera hardware remains a device check; mobile font sizes and VisualViewport handling address focus zoom/layout.

## Visites : notes vocales, analyse et aperçu 3D

Pendant une visite (espace dirigeant), l'équipe prépare le devis au fur et à mesure :

- **Notes vocales.** À l'étape « Mesures & notes », le bouton *Dicter* enregistre une note audio et la transcrit en direct (Web Speech, fr-CA). Si le micro ou la reconnaissance vocale ne sont pas disponibles, la note se saisit à la main : une transcription est toujours produite. Les photos (prises ou importées) restent disponibles au même endroit.
- **Analyse → lignes de devis.** *Analyser les notes* transforme les transcriptions (et les notes écrites) en lignes de soumission éditables. L'analyse utilise Claude lorsque `ANTHROPIC_API_KEY` est configurée ; sinon une analyse locale déterministe s'applique. Dans les deux cas, aucun prix n'est inventé : les lignes sont présentées comme des suggestions à réviser. Elles servent de base au devis généré depuis la visite.
- **Aperçu 3D & matériaux.** Sur un devis, *Aperçu 3D & matériaux* reconstruit la pièce à partir des mesures relevées (visuel indicatif, non photoréaliste) et permet de prévisualiser les matériaux du sol, des murs et du comptoir. Le prix de la ligne correspondante se met à jour selon le matériau choisi. Le client peut explorer cet aperçu en lecture seule.
- **Devis final.** Depuis l'aperçu ou le dossier : téléchargement du PDF (soumission professionnelle — coordonnées, résumé des coûts, tableau des prestations, échéancier de paiement, validité, termes et conditions) ou envoi par courriel au client (nécessite `RESEND_API_KEY` et `MAIL_FROM` avec un domaine expéditeur vérifié).

Les notes vocales audio sont stockées dans le bucket privé `documents` (migration `004_visit_studio.sql` ajoute les types audio) ; la transcription reste enregistrée sur la visite même si le téléversement audio échoue. La transcription vocale et le rendu 3D dépendent du navigateur (Chromium/Safari récents). `ANTHROPIC_API_KEY` est facultative et n'est utilisée que côté serveur pour l'analyse des notes.

Vérification supplémentaire : npm test (dont tests/studio.test.ts), npm run typecheck, npm run build.
