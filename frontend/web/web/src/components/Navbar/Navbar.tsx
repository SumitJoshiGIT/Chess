import AppBar from '@mui/material/AppBar'
import Menu from '@mui/material/Menu'
import { Toolbar } from '@mui/material'
import {IconButton} from '@mui/material'
import {MenuItem} from '@mui/material' 
import {useState} from 'react'
import AccountCircle from '@mui/icons-material/AccountCircle';

export default function (){
   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

   const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
     setAnchorEl(event.currentTarget);
   };
 
   const handleClose = () => {
     setAnchorEl(null);
   };

   return (
       <AppBar>
            <Toolbar>
                <IconButton onClick={handleMenu}>
                 <AccountCircle/>              
               </IconButton>
               <Menu 
               anchorEl={anchorEl} 
               open={Boolean(anchorEl)} 
               onClose={handleClose}>
                <MenuItem onClick={()=>{}}>Profile</MenuItem>
                <MenuItem onClick={()=>{}}>Friends</MenuItem>
                <MenuItem onClick={()=>{}}>Settings</MenuItem>
               </Menu>
         
            </Toolbar>
       

       </AppBar>
   )

}

