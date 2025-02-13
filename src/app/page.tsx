import PlayCard from "@/components/custom/PlayCard";
import Chart from "@/components/custom/Chart";
export default async function Page() {
          return <div className="main-container flex  w-full h-full  justify-center">
                  <div className="flex rounded-md flex-col w-full h-full m-2"> 
                     <div className="  rounded-md shadow-md h-full  p-4 m-2">
                      <Chart ></Chart>
                     </div>
                     <div className="rounded-md  shadow-lg w-full h-full p-4 m-2">
                     <Chart ></Chart>
                     
                     </div>
                  </div>  
                  <div className=" shadow-md rounded-md w-full h-64  m-2">
                    <PlayCard></PlayCard>    
                  </div>
                    
            </div>
          
}