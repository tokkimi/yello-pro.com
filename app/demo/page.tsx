import Workspace from '@/components/workspace';
import {demoUser} from '@/lib/demo';
export const metadata={title:'Démonstration de l’espace de gestion',robots:{index:false,follow:false}};
export default function Page(){return <Workspace demo initialUser={demoUser}/>}
