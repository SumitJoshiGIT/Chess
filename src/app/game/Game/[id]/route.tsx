import prisma from '@prisma/client';

import Game from '@/components/custom/Game';

interface queryParams{
    id:String;
}

export  function generateMetadata({id}:queryParams){
    
    return {
        title: `${id}`,
        description: "Game",
        image: "/images/logo.png",
        url: "https://example.com",
        type: "website"
    }
}
export default   async function(){
    <div>
      <Game/>
    </div>
}