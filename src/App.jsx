import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProductionProvider } from "./context/ProductionContext";
import Dashboard from "./pages/Dashboard";
import ProductionEntryForm from "./pages/ProductionEntryForm";

export default function App() {
  return (
    <ProductionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entry" element={<ProductionEntryForm />} />
        </Routes>
      </BrowserRouter>
    </ProductionProvider>
  );
}