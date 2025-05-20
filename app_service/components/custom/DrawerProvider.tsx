"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DrawerDialogDemoProps {
  children: React.ReactNode;
  tag?: string;
  className?:string
}

export default function DrawerProvider({ children=null,tag,className }: DrawerDialogDemoProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  // Use a ref to persist the content across open/close transitions
  const contentRef = React.useRef<React.ReactNode>(children);
  
  // Only update the content ref when children changes and not during transitions
  React.useEffect(() => {
    contentRef.current = children;
  }, [children]);

  // Function to carefully open the drawer/dialog
  const handleOpen = React.useCallback(() => {
    setOpen(true);
  }, []);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={className} onClick={handleOpen}>{tag}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]"> 
         <DialogTitle></DialogTitle>
         {/* Use the ref instead of children directly */}
         {open ? contentRef.current : null}
         </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" onClick={handleOpen}>{tag}</Button>
      </DrawerTrigger>
      <DrawerContent className="p-6">
        {/* Use the ref instead of children directly */}
        {open ? contentRef.current : null}
      </DrawerContent>
    </Drawer>
  )
}

