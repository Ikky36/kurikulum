import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MataKuliah from "./pages/MataKuliah";
import CourseDetail from "./pages/CourseDetail";
import StudentGrades from "./pages/StudentGrades";
import Dashboard from "./pages/Dashboard";
import DashboardMahasiswa from "./pages/dashboard/DashboardMahasiswa";
import DashboardDosen from "./pages/dashboard/DashboardDosen";
import DashboardAdmin from "./pages/dashboard/DashboardAdmin";
import Settings from "./pages/Settings";
import Kurikulum from "./pages/Kurikulum";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/kurikulum" element={<Kurikulum />} />
            <Route path="/mata-kuliah" element={<MataKuliah />} />
            <Route path="/mata-kuliah/:courseId" element={<CourseDetail />} />
            <Route path="/nilai-mahasiswa/:studentId" element={<StudentGrades />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/mahasiswa" element={<DashboardMahasiswa />} />
            <Route path="/dashboard/dosen" element={<DashboardDosen />} />
            <Route path="/dashboard/admin" element={<DashboardAdmin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
