import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Booking from "@/pages/booking";
import BookingConfirmation from "@/pages/booking-confirmation";
import SwiklyRedirect from "@/pages/swikly-redirect";
import Checkout from "@/pages/checkout";
import Success from "@/pages/success";
import AdminBookings from "@/pages/admin/bookings";
import Terms from "@/pages/legal/terms";
import Privacy from "@/pages/legal/privacy";
import Mentions from "@/pages/legal/mentions";
import TestEmail from "@/pages/test-email";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/booking" component={Booking} />
      <Route path="/booking-confirmation" component={BookingConfirmation} />
      <Route path="/swikly-redirect" component={SwiklyRedirect} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/success" component={Success} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/legal/terms" component={Terms} />
      <Route path="/legal/privacy" component={Privacy} />
      <Route path="/legal/mentions" component={Mentions} />
      <Route path="/test-email" component={TestEmail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
