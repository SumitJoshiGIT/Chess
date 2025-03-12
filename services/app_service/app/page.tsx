import PlayCard from "@/components/custom/PlayCard";
import Chart from "@/components/custom/Chart";
import ActivityBox from "@/components/custom/ActivityBox";
import RatingBox from "@/components/custom/RatingBox";
import SuggestionBoard from "@/components/custom/SuggestionBoard";
import GamesTable from "@/components/custom/GamesTable";

export default async function Page() {
     
    return (
       
        <div className="main-container flex-col flex  justify-center overflow-x-clip max-w-5xl h-full w-screen ">
          <div className="flex flex-wrap  m-3">
             <div className="flex rounded-md h-full w-fit m-2 mb-0">
               <PlayCard elo={1500} league="Gold" icon="chess-icon" />
            </div>
            <div className="flex flex-col ">
              <div className="rounded-md shadow-md h-full p-4 m-2">
                <Chart />
              </div>
              <RatingBox blitz={1200} rapid={1300} bullet={1400} />
            </div>
      
            <div className=" flex m-2 justify-center">
             <SuggestionBoard items={[{ title: 'Nimzo', content: "Indian", color: "Opening", id: 2 }]} />
            </div>
         
          </div>
      
          <div className="w-full flex justify-center">
            <ActivityBox id={1} activities={[{ description: "Played a game", date: "2023-10-01" }]} />
          </div>
          <div>
          <GamesTable></GamesTable>  
        
          </div>
        </div>
      );
      
          
}