import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider
          router={createHashRouter([
            // Parent route must accept nested routes — use a trailing /*
            { path: '/*', element: <App /> },
          ])}
          // Opt into v7 behavior to avoid future warnings
          future={{ v7_startTransition: true }}
        />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
