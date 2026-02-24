import { motion } from "framer-motion";
import { Calendar, Clock, Video, ChevronRight } from "lucide-react";

const appointments = [
  {
    doctor: "Dr. Sarah Chen",
    specialty: "Cardiology Checkup",
    date: "Mar 5, 2026",
    time: "10:00 AM",
    type: "In-person",
  },
  {
    doctor: "Dr. Ahmed Raza",
    specialty: "Follow-up Consultation",
    date: "Mar 8, 2026",
    time: "2:30 PM",
    type: "Video Call",
  },
  {
    doctor: "Dr. Emily Park",
    specialty: "Skin Assessment",
    date: "Mar 12, 2026",
    time: "11:00 AM",
    type: "In-person",
  },
];

const AppointmentsSection = () => {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Upcoming Appointments
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Your scheduled visits at a glance
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
          {appointments.map((appt, i) => (
            <motion.div
              key={appt.doctor + appt.date}
              className="flex items-center gap-4 rounded-2xl bg-card border border-border p-5 shadow-card hover:shadow-elevated transition-shadow duration-300 cursor-pointer group"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {appt.type === "Video Call" ? (
                  <Video className="w-5 h-5 text-primary" />
                ) : (
                  <Calendar className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground truncate">
                  {appt.doctor}
                </p>
                <p className="text-sm text-muted-foreground">{appt.specialty}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {appt.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {appt.time}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AppointmentsSection;
