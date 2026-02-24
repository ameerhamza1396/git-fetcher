import { motion } from "framer-motion";
import { Users, Award, Clock, HeartPulse } from "lucide-react";

const stats = [
  { icon: Users, label: "Active Patients", value: "10K+", color: "text-primary" },
  { icon: Award, label: "Certified Doctors", value: "200+", color: "text-accent" },
  { icon: Clock, label: "Appointments/Day", value: "500+", color: "text-primary" },
  { icon: HeartPulse, label: "Satisfaction Rate", value: "98%", color: "text-accent" },
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
              <p className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
