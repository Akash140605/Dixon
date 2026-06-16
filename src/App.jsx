import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProductionProvider } from "./context/ProductionContext";

import Dashboard from "./pages/Dashboard";
import ProductionEntryForm from "./pages/ProductionEntryForm";
import HallMachinesView from "./components/layout/dashboard/HallMachinesView";
import MachineDetailsView from "./components/layout/dashboard/MachineDetailsView";

export default function App() {
  return (
    <ProductionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entry" element={<ProductionEntryForm />} />
          <Route path="/hall/:hallId" element={<HallMachinesView />} />
          <Route
            path="/hall/:hallId/machine/:machineId"
            element={<MachineDetailsView />}
          />
        </Routes>
      </BrowserRouter>
    </ProductionProvider>
  );
}