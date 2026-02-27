import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider
        router={createHashRouter([
          { path: '/', element: <App /> },
          { path: '*', element: <App /> },
        ])}
        // Opt into v7 behavior to avoid future warnings
        future={{ v7_startTransition: true }}
      />
    </HelmetProvider>
  </React.StrictMode>,
)
