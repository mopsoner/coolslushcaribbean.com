import Navbar from "@/components/navbar";
import BookingForm from "@/components/booking-form";

export default function Booking() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <BookingForm />
        </div>
      </section>
    </div>
  );
}
