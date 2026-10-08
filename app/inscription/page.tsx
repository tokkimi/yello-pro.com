import Link from 'next/link';
export const metadata={title:'Créer votre entreprise'};
export default function Page(){return <main className="legal-page"><Link href="/">← Yello Pro</Link><h1>Votre espace Yello Pro</h1><p>La création de comptes commerciaux sera ouverte après activation et vérification de la base indépendante et des paiements. Aucun montant ne sera prélevé depuis cette démonstration.</p><Link className="btn primary" href="/demo">Explorer les outils</Link><Link className="btn secondary" href="/connexion">Se connecter</Link></main>}
