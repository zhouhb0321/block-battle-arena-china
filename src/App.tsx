
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GameRecordingProvider } from "@/contexts/GameRecordingContext";
import { ReplayDiagnosticsProvider } from "@/contexts/ReplayDiagnosticsContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { FloatingMusicControl } from "@/components/FloatingMusicControl";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ReplayPage from "./pages/ReplayPage";
import AuthErrorBoundary from "@/components/AuthErrorBoundary";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import "@/utils/securityHeaders";

const queryClient = new QueryClient();

// Component to handle session timeout inside AuthProvider
const SessionManager = () => {
  useSessionTimeout();
  return null;
};

function App() {
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <MusicProvider>
                <ReplayDiagnosticsProvider>
                  <GameRecordingProvider>
                    <SessionManager />
                    <LanguageProvider>
                      <GameProvider>
                        <Toaster />
                        <FloatingMusicControl />
                        <BrowserRouter>
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/replay/:id" element={<ReplayPage />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </BrowserRouter>
                      </GameProvider>
                    </LanguageProvider>
                  </GameRecordingProvider>
                </ReplayDiagnosticsProvider>
              </MusicProvider>
            </AuthProvider>
          </AuthErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
