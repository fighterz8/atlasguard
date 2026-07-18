import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import WizardPage from "@/pages/wizard";
import ResultsPage from "@/pages/results";
import { researchPreviewEnabled } from "@/features/research-results/preview-gate";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={WizardPage} />
      {researchPreviewEnabled ? (
        <Route path="/research/la-to-seattle" component={ResultsPage} />
      ) : null}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
