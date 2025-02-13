import { SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Sidebar } from "@/components/ui/sidebar"
 
export default function ({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon"/>
      <SidebarHeader>
        </SidebarHeader>
      <main>
        
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}