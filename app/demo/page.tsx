import {redirect} from 'next/navigation';
export const metadata={title:'Accès privé',robots:{index:false,follow:false}};
export default function Page(){redirect('/connexion')}
