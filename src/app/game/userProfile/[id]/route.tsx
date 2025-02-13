import getORM from '@/lib/orm';
import Id from '../../Game/[id]/route';

interface queryParams{
      id:String;
}
export default async function GET(params:queryParams){
      const prisma=getORM();
      const user=prisma.user.findOne({
            id:params.id
      });
     
      return (
            

      )

      
}