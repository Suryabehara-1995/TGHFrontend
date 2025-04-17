import React from "react";
import { createRoot } from "react-dom/client"; // ✅ Import createRoot
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

// Create a QueryClient instance
const queryClient = new QueryClient();

// Get the root DOM node
const container = document.getElementById("root");

// Create a root and render the app
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
