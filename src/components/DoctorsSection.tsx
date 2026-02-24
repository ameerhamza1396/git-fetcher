import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import doctor1 from "@/assets/doctor-1.jpg";
import doctor2 from "@/assets/doctor-2.jpg";

const doctors = [
  {
    name: "Dr. Sarah Chen",
    specialty: "Cardiologist",
    rating: 4.9,
    reviews: 128,
    location: "New York, NY",
    image: doctor1,
    available: true,
  },
  {
    name: "Dr. Ahmed Raza",
    specialty: "Neurologist",
    rating: 4.8,
    reviews: 96,
    location: "Los Angeles, CA",
    image: doctor2,
    available: true,
  },
  {
    name: "Dr. Emily Park",
    specialty: "Dermatologist",
    rating: 4.9,
    reviews: 210,
    location: "Chicago, IL",
    image: doctor1,
    available: false,
  },
];

const DoctorsSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Top Rated Doctors
          </h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-md mx-auto">
            Book with the best specialists near you
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {doctors.map((doc, i) => (
            <motion.div
              key={doc.name}
              className="group relative rounded-2xl bg-card border border-border overflow-hidden shadow-card hover:shadow-elevated transition-shadow duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {doc.name}
                  </h3>
                  {doc.available ? (
                    <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                      Available
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
                      Busy
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    {doc.rating} ({doc.reviews})
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {doc.location}
                  </span>
                </div>
                <Button
                  className="w-full mt-4 rounded-xl font-semibold"
                  disabled={!doc.available}
                >
                  {doc.available ? "Book Now" : "Not Available"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;
