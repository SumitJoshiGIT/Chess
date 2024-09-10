import { useState } from 'react'
import Nav from './components/Navbar/Navbar'
import Game from './components/Game/Game'
import './App.css'


function App() {

  return (
    <>
      <Nav/>
      <div> 
        <Game/>
      </div>
    </>
  )
}

export default App
