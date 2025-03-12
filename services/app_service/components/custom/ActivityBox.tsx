import  { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ActivityLink from './ActivityLink';
interface ActivityProps{
    title:string,
    description:string,
    image:string,
    link:string
}
export default function({activities ,id}:{activities:ActivityProps[],id:number}){
    return (
        <div className='p-2 flex border mt-6 justify-start shadow-md m-2 w-full  rounded-md'>
            <Tabs defaultValue="account" className="">
  <div className='w-full flex justify-start mt-2'>
  <TabsList className='shadow-md'>
    <TabsTrigger value="lesson"><h1 className='font-semibold font-lg'>Lesson</h1></TabsTrigger>
    <TabsTrigger value="puzzle"><h1 className='font-semibold font-lg'>Puzzle</h1></TabsTrigger>
    <TabsTrigger value="review"><h1 className='font-semibold font-lg'>Review</h1></TabsTrigger>
  </TabsList>
    </div>
  <TabsContent className='w-full flex flex-wrap ' value="lesson">
    <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
    <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
    <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  
  </TabsContent>
  <TabsContent className='w-full flex flex-wrap ' value="puzzle">
  <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  

  </TabsContent>
  
  <TabsContent className='w-full flex flex-wrap ' value="review"> <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  <ActivityLink title="Sample Title" description="Sample Description" image="sample-image-url" />
  </TabsContent>
 
</Tabs>

        </div>                                     
    )
}